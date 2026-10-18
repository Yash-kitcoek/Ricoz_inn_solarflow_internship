"""WhatsApp Business Cloud API webhook: contractors send a location, then a photo captioned like 'SF-1001 panels'.
Uses the Supabase SERVICE-ROLE key, which bypasses row level security, so every check below is done here. Keep this key on the server only."""
import hashlib, hmac, os, re, time
import httpx
from fastapi import APIRouter, HTTPException, Request, Response

router = APIRouter()
SB = os.environ["SUPABASE_URL"].rstrip("/"); SVC = os.environ["SUPABASE_SERVICE_KEY"]
VERIFY = os.environ["WHATSAPP_VERIFY_TOKEN"]; SECRET = os.environ["WHATSAPP_APP_SECRET"].encode()
TOKEN = os.environ["WHATSAPP_ACCESS_TOKEN"]; PHONE_ID = os.environ["WHATSAPP_PHONE_ID"]
KINDS = {"panels", "inverter", "earthing", "meter", "other"}; EXT = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
H = {"apikey": SVC, "Authorization": f"Bearer {SVC}"}
LOC: dict[str, tuple[float, float, float]] = {}   # phone -> (lat, lng, time). In memory: single instance only.

async def say(to: str, text: str):
    async with httpx.AsyncClient(timeout=10) as h:
        await h.post(f"https://graph.facebook.com/v20.0/{PHONE_ID}/messages", headers={"Authorization": f"Bearer {TOKEN}"}, json={"messaging_product": "whatsapp", "to": to, "type": "text", "text": {"body": text}})

async def rest(h: httpx.AsyncClient, path: str):
    r = await h.get(f"{SB}/rest/v1/{path}", headers=H); r.raise_for_status(); return r.json()

@router.get("/whatsapp/webhook")
def verify(request: Request):
    q = request.query_params
    if q.get("hub.mode") == "subscribe" and hmac.compare_digest(q.get("hub.verify_token", ""), VERIFY):
        return Response(q.get("hub.challenge", ""), media_type="text/plain")
    raise HTTPException(403)

@router.post("/whatsapp/webhook")
async def incoming(request: Request):
    raw = await request.body()
    if not hmac.compare_digest(request.headers.get("X-Hub-Signature-256", ""), "sha256=" + hmac.new(SECRET, raw, hashlib.sha256).hexdigest()):
        raise HTTPException(403, "Bad signature")
    for e in (await request.json()).get("entry", []):
        for c in e.get("changes", []):
            for m in c.get("value", {}).get("messages", []):
                try: await handle(m)
                except Exception: pass            # always answer 200 so Meta does not retry endlessly
    return {"ok": True}

async def handle(m: dict):
    phone = m["from"]
    async with httpx.AsyncClient(timeout=30) as h:
        who = await rest(h, f"profiles?phone=eq.{phone}&approved=eq.true&role=eq.contractor&select=id,contractor_id")
        if not who or not who[0]["contractor_id"]:
            return await say(phone, "This number is not registered as a contractor in SolarFlow OS.")
        uid, cid = who[0]["id"], who[0]["contractor_id"]
        if m["type"] == "location":
            LOC[phone] = (m["location"]["latitude"], m["location"]["longitude"], time.time())
            return await say(phone, "Location saved for 30 minutes. Now send the photo with a caption like: SF-1001 panels")
        if m["type"] != "image":
            return await say(phone, "Send a location, then a photo captioned like: SF-1001 panels")
        mt = re.search(r"(SF-\d+)\s+(\w+)", m["image"].get("caption", ""), re.I)
        if not mt or mt.group(2).lower() not in KINDS:
            return await say(phone, "Caption needs a project code and a kind, for example: SF-1001 panels (kinds: " + ", ".join(sorted(KINDS)) + ")")
        code, kind = mt.group(1).upper(), mt.group(2).lower()
        proj = await rest(h, f"projects?code=eq.{code}&select=id")
        ms = await rest(h, f"payment_milestones?project_id=eq.{proj[0]['id']}&contractor_id=eq.{cid}&status=eq.awaiting_evidence&select=id,required_evidence") if proj else []
        ms = [x for x in ms if kind in x["required_evidence"] or kind == "other"]
        if not ms: return await say(phone, f"No open milestone for you on {code} that needs '{kind}'.")
        meta = (await h.get(f"https://graph.facebook.com/v20.0/{m['image']['id']}", headers={"Authorization": f"Bearer {TOKEN}"})).json()
        if meta.get("mime_type") not in EXT: return await say(phone, "Please send a JPEG, PNG or WebP photo.")
        img = await h.get(meta["url"], headers={"Authorization": f"Bearer {TOKEN}"})
        if len(img.content) > 8 * 1024 * 1024: return await say(phone, "Photo is larger than 8 MB.")
        mid, pid = ms[0]["id"], proj[0]["id"]; path = f"{pid}/{mid}/{kind}-{int(time.time())}.{EXT[meta['mime_type']]}"
        up = await h.post(f"{SB}/storage/v1/object/project-files/{path}", headers={**H, "Content-Type": meta["mime_type"]}, content=img.content)
        loc = LOC.get(phone); geo = loc if loc and time.time() - loc[2] < 1800 else None
        ins = await h.post(f"{SB}/rest/v1/milestone_evidence", headers={**H, "Content-Type": "application/json"}, json={"milestone_id": mid, "kind": kind, "storage_path": path, "uploaded_by": uid, "lat": geo[0] if geo else None, "lng": geo[1] if geo else None})
        if up.status_code >= 300 or ins.status_code >= 300: return await say(phone, "Could not save the photo. Please try again or upload it in the app.")
        await say(phone, "Photo saved." + ("" if geo else " It has no location, so it will not count. Send a location message, then the photo again."))
