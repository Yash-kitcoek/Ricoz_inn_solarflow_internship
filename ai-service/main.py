"""Assistive checks for SolarFlow OS. Results are hints for a human verifier, never approvals."""
import asyncio, base64, json, os
from uuid import UUID
import anthropic, httpx
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

SB_URL = os.environ["SUPABASE_URL"].rstrip("/")
SB_ANON = os.environ["SUPABASE_ANON_KEY"]          # anon key only; never the service-role key
MODEL = os.getenv("AI_MODEL", "claude-sonnet-5-5")
REQUIRED = [c.strip() for c in os.getenv("REQUIRED_CATEGORIES", "Electrical Drawings,CAD Layouts,Utility Documents").split(",") if c.strip()]
KINDS = {"panels": "installed solar panels on a roof or structure", "inverter": "a solar inverter mounted on a wall", "earthing": "earthing or grounding connections or pits",
         "meter": "an electricity meter", "other": "solar installation work"}
app = FastAPI(title="SolarFlow AI helper")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(","), allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"])
client = anthropic.Anthropic()                      # reads ANTHROPIC_API_KEY

async def user_token(authorization: str = Header(default="")) -> str:
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing token")
    tok = authorization[7:]
    async with httpx.AsyncClient(timeout=10) as h:
        r = await h.get(f"{SB_URL}/auth/v1/user", headers={"apikey": SB_ANON, "Authorization": f"Bearer {tok}"})
    if r.status_code != 200:
        raise HTTPException(401, "Invalid or expired session")
    return tok

@app.get("/health")
def health(): return {"ok": True}

@app.post("/precheck/photo")
async def photo(kind: str = Form(...), file: UploadFile = File(...), _: str = Depends(user_token)):
    if kind not in KINDS: raise HTTPException(400, "Unknown evidence kind")
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"): raise HTTPException(400, "Use a JPEG, PNG or WebP image")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024: raise HTTPException(413, "Image is larger than 5 MB")
    prompt = (f"You assist a solar project verifier. Does this photo clearly show {KINDS[kind]}? Answer ONLY with JSON: "
              '{"present": true|false, "confidence": 0 to 1, "notes": "one short sentence"}')
    msg = await asyncio.to_thread(client.messages.create, model=MODEL, max_tokens=200, messages=[{"role": "user", "content": [
        {"type": "image", "source": {"type": "base64", "media_type": file.content_type, "data": base64.b64encode(data).decode()}}, {"type": "text", "text": prompt}]}])
    text = "".join(b.text for b in msg.content if b.type == "text")
    try:
        out = json.loads(text[text.index("{"): text.rindex("}") + 1])
        return {"present": bool(out["present"]), "confidence": max(0.0, min(1.0, float(out["confidence"]))), "notes": str(out.get("notes", ""))[:300], "assistive": True}
    except (ValueError, KeyError, TypeError):
        raise HTTPException(502, "The model gave an unreadable answer; check the photo manually")

class Packet(BaseModel):
    project_id: UUID

@app.post("/precheck/packet")
async def packet(body: Packet, tok: str = Depends(user_token)):
    async with httpx.AsyncClient(timeout=10) as h:    # runs as the signed-in user, so row level security still applies
        r = await h.get(f"{SB_URL}/rest/v1/documents", params={"project_id": f"eq.{body.project_id}", "select": "category,status,title,equipment_model"}, headers={"apikey": SB_ANON, "Authorization": f"Bearer {tok}"})
    if r.status_code != 200: raise HTTPException(502, "Could not read documents")
    docs, findings = r.json(), []
    async with httpx.AsyncClient(timeout=10) as h2:
        er = await h2.get(f"{SB_URL}/rest/v1/equipment", params={"project_id": f"eq.{body.project_id}", "select": "model"}, headers={"apikey": SB_ANON, "Authorization": f"Bearer {tok}"})
    models = {e["model"].strip().lower() for e in (er.json() if er.status_code == 200 else [])}
    if models:
        findings += [{"severity": "warning", "message": f"'{d['title']}' names model '{d['equipment_model']}', which is not in the equipment registry."} for d in docs if d.get("equipment_model") and d["equipment_model"].strip().lower() not in models]
    else:
        findings.append({"severity": "warning", "message": "No equipment registered, so model mismatches cannot be checked."})
    have = {d["category"] for d in docs}
    findings += [{"severity": "blocker", "message": f"No document in category '{c}'."} for c in REQUIRED if c not in have]
    findings += [{"severity": "warning", "message": f"'{d['title']}' is {d['status']}, not Approved."} for d in docs if d["status"] != "Approved"]
    if not docs: findings.append({"severity": "blocker", "message": "No documents uploaded for this project."})
    return {"findings": findings or [{"severity": "info", "message": "No gaps found against the checklist. A person should still review the packet."}], "assistive": True}

# Optional WhatsApp photo updates (needs the WHATSAPP_* and SUPABASE_SERVICE_KEY variables)
if os.getenv("WHATSAPP_VERIFY_TOKEN"):
    from whatsapp import router as whatsapp_router
    app.include_router(whatsapp_router)

@app.post("/extract/nameplate")
async def nameplate(file: UploadFile = File(...), _: str = Depends(user_token)):
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"): raise HTTPException(400, "Use a JPEG, PNG or WebP image")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024: raise HTTPException(413, "Image is larger than 5 MB")
    prompt = 'Read this equipment nameplate. Answer ONLY with JSON: {"make": string or null, "model": string or null, "serial": string or null}. Use null for anything not clearly legible. Never guess.'
    msg = await asyncio.to_thread(client.messages.create, model=MODEL, max_tokens=200, messages=[{"role": "user", "content": [
        {"type": "image", "source": {"type": "base64", "media_type": file.content_type, "data": base64.b64encode(data).decode()}}, {"type": "text", "text": prompt}]}])
    text = "".join(b.text for b in msg.content if b.type == "text")
    try:
        out = json.loads(text[text.index("{"): text.rindex("}") + 1])
        return {k: (str(out[k]).strip()[:80] if out.get(k) else None) for k in ("make", "model", "serial")}
    except (ValueError, TypeError):
        raise HTTPException(502, "Could not read the nameplate; enter the details by hand")
