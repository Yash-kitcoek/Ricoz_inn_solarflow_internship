# SolarFlow OS (foundation)
React + TypeScript + Vite + Tailwind + Supabase. **Foundation release, not production-ready yet.** Not compiled or run here (no network): run `npm install && npm run build` first and fix any type errors.

## Run
1. `npm install`
2. Demo mode: `npm run dev` with no env file. Data is in memory only.
3. Real mode: create a Supabase project, copy `.env.example` to `.env.local`, fill URL and anon key (never the service-role key).
4. Apply `supabase/migrations/0001..0005` in order (SQL editor or `supabase db push`). Enable `pg_cron`, then run the commented `cron.schedule` line in 0003.
5. Sign up a user, then promote the first admin in the SQL editor: `update profiles set role='admin' where email='you@example.com';`
New users get role `contractor` with no contractor link, so they see nothing until an admin assigns access.

## Authentication and authorization
- Sign in, create account, forgot/reset password (Supabase Auth). In Supabase set Authentication > URL Configuration: Site URL and Redirect URLs to your app address (e.g. http://localhost:5173).
- New sign-ups are **unapproved** (migration 0005) and see nothing until an admin approves them and assigns a role in Settings. Bootstrap the first admin in SQL: `update profiles set role='admin', approved=true where email='you@example.com';`
- Route and button access by role is in `src/lib/permissions.ts` (UI only). The real enforcement is row level security in the database, including contractors being blocked from permit and utility records.
- Demo mode has a role switcher in the header to preview each role's menu; it is not security.

## Google sign-in
1. Google Cloud Console > APIs & Services > Credentials > Create OAuth client ID (Web application). Add this Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`. Configure the OAuth consent screen if asked.
2. Supabase > Authentication > Providers > Google: enable it and paste the Client ID and Client Secret. The secret lives only in Supabase, never in this app or its .env files.
3. Supabase > Authentication > URL Configuration: add your app address (e.g. http://localhost:5173 and your deployed URL) to Redirect URLs.
4. Apply migration 0006. Google users go through the same admin approval as everyone else.

## Differentiators, round 2 (migration 0007 + ai-service)
- Customer status link (public page `/status/<token>`; hosting needs a rewrite of all paths to index.html), Project Passport download with tamper-evident audit chain, cash-flow forecaster with delay simulator, After Installation (warranty, service reminders, generation readings with a below-80% flag), contractor reliability column.
- `ai-service/` (Python FastAPI): photo check and document-packet check; set `VITE_AI_SERVICE_URL` in .env.local to switch the buttons on. Run: `pip install -r requirements.txt`, copy `.env.example` to `.env`, `uvicorn main:app --port 8000`. Photos are sent to the Anthropic API.
## Round 3 (migration 0008)
- Weather Planner: needs site coordinates per project; uses Open-Meteo forecasts and flags risky task days, the next clear day and possible payout slip.
- Subsidy Readiness: SAMPLE checklist in src/lib/subsidy.ts, partly auto-filled from your records. Replace with your scheme's official list.
- Offline mode: installable PWA (build with `npm run build`; the service worker only runs in production builds). Evidence photos and task status changes made offline are queued on the device and sync when online; viewing data offline is not supported. Task changes are last-write-wins.
- WhatsApp photo updates: ai-service/whatsapp.py (webhook). Needs a Meta WhatsApp Business app, the WHATSAPP_* variables and the service-role key on the server, and each contractor's number saved in Settings. Not tested against the real WhatsApp API.

## Round 4 (migration 0009)
- Equipment registry (make, model, serial, quantity per project) with serial/model search for warranty lookups, mismatch flags against the model named on documents, and an optional nameplate photo reader (AI service).
- Rejection log with common-reason insights per authority, shown on the Rejections and Net Metering pages.
- Hindi and Marathi: menu, dashboard, status badges and the whole customer status page. Draft translations; have native speakers review them. Other pages stay in English.
- Not built: inspector QR page (needs a server to mint short-lived file links; metadata-only would be of little use).

## Phase status
1 shell, nav, dashboard (6 live cards): done. 2 projects (create, search, filter, detail with workflow, status change, archive): done; full edit form not built.
3 permits and net metering: done. 4 documents (private upload, signed download, versions, status, category filter): done; no in-browser CAD viewer.
5 tasks (board) and contractors: done; no calendar view or task dependencies/comments UI. 6 milestone payouts with evidence gate: done; no contract-value totals per contractor.
7 auth, roles, RLS, user roles UI: done; linking contractor users to companies is done in SQL. 8 notifications, reports, CSV: done; no date/contractor filters; reminders need pg_cron.
Differentiators (migration 0004): why-is-it-stuck engine, authority scorecard, evidence-gated payouts. Not included: AI photo checks, live DISCOM data, cross-company benchmarks.

## Before real data
Test every RLS policy with each role, have the policies reviewed, set up backups and staging, check data-protection obligations (e.g. DPDP Act).
