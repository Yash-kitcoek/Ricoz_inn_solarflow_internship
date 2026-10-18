# SolarFlow OS (Next.js + Express + MongoDB)

Standard team stack: **Next.js** frontend, **Node.js + Express.js** backend, **MongoDB** database.

```
solarflow-mern/
  backend/    Express API, Mongoose models, JWT auth, tests
  frontend/   Next.js (App Router) UI
  docker-compose.yml   optional local MongoDB
```

## Run it
Needs Node.js 18+ and a MongoDB (local, Docker below, or a free Atlas cluster).

```bash
# 0. optional local MongoDB
docker compose up -d

# 1. backend  (http://localhost:4000)
cd backend
cp .env.example .env        # then set JWT_SECRET to a long random string, and ADMIN_EMAIL / ADMIN_PASSWORD
npm install
npm run seed:demo           # creates the admin plus sample data (use `npm run seed` for the admin only)
npm run dev

# 2. frontend (http://localhost:3000), in a second terminal
cd frontend
cp .env.example .env.local
npm install
npm run dev
```
Sign in with the ADMIN_EMAIL / ADMIN_PASSWORD you set. New sign-ups see nothing until an admin approves them under **Users & Roles** and gives them a role. Run the backend tests with `npm test` (inside `backend`).

The browser only talks to Next.js; `/api/*` is proxied to Express (see `frontend/next.config.mjs`), so the login cookie is same-origin and no CORS setup is needed. In production set `BACKEND_URL` on the frontend host.

## What is built (MVP core)
- **Auth:** register, login, logout; bcrypt passwords; JWT in an httpOnly cookie; admin approval for new accounts; roles `admin`, `project_manager`, `engineer`, `contractor`, `finance`. The user is re-checked in the database on every request.
- **Projects:** create, list, search, filter, detail with workflow and activity log, status change, archive.
- **Permits:** checklist items per project, status changes, a reason is required for Rejected or Blocked, overdue flags, completion %.
- **Net metering:** applications with status history, a "why is it stuck" view (who it is waiting on, days waiting, next action), authority scorecard from your own history.
- **Contractor milestones:** the flow is evidence and invoice, then verification, then approval, then recording payment. A milestone cannot be submitted without a photo that carries a location for every required kind plus an invoice. The person who verified cannot also approve. Payment needs a transaction reference. No money is moved.
- **Dashboard:** counts scoped to what the signed-in user may see.

## Authorization (enforced by the API, not just hidden in the UI)
| Area | admin | project_manager | engineer | contractor | finance |
|---|---|---|---|---|---|
| Projects | all | assigned | assigned | only those with their milestones | all (read) |
| Permits, net metering | yes | assigned | assigned | no | no |
| Milestones | all | assigned projects | no | own company only | read; approve, record payment |
| Users and roles | yes | no | no | no | no |

"Assigned" means the user is the project's manager or engineer. Out-of-scope records return 404.

## API (all under /api)
`POST /auth/register|login|logout`, `GET /auth/me` · `GET|PATCH /users` (admin) · `GET|POST /projects`, `GET|PATCH /projects/:id` · `GET|POST /permits`, `PATCH|DELETE /permits/:id` · `GET|POST /net-metering`, `PATCH /net-metering/:id/status` · `GET|POST /contractors` · `GET|POST /milestones`, `POST /milestones/:id/evidence` (multipart, field `photo`), `GET /milestones/:id/evidence/:eid/file`, `PUT /milestones/:id/invoice`, `POST /milestones/:id/transition`, `POST /milestones/:id/pay` · `GET /dashboard`

## Security notes
Inputs are validated with zod; errors go through one handler; helmet, rate limiting on login and register, JSON body limit, uploads checked by size, type and file signature and stored outside any public folder, served only through an authenticated route. Before production: set a strong `JWT_SECRET`, use HTTPS (cookies become `secure` when `NODE_ENV=production`), add CSRF protection if you ever serve the API from a different site than the frontend (`COOKIE_SAMESITE=none`), and move uploads to object storage.

## Not ported from the earlier Vite/Supabase prototype
Tasks, documents and CAD files, reports and CSV, notifications and reminders, Google sign-in, password reset, the Python AI helper, WhatsApp, weather, forecast, equipment registry, languages, offline mode. The data model leaves room for them; say which to bring over next.

## Git
```bash
git init && git add . && git commit -m "Initial SolarFlow OS (Next.js, Express, MongoDB)"
git branch -M main && git remote add origin <your GitHub repo URL> && git push -u origin main
```
`.env` files and uploads are git-ignored; commit only the `.env.example` files.
