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
Copy-Item .env.example .env # set a unique JWT_SECRET, ADMIN_EMAIL and ADMIN_PASSWORD
npm install
npm run seed:demo           # creates the admin plus sample data (use `npm run seed` for the admin only)
npm run dev

# 2. frontend (http://localhost:3000), in a second terminal
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```
Set `NODE_ENV=development` for local work. Sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set before running `npm run seed:demo`. Customers are created by an admin in **Customers & Requests** and get an approved customer account; existing customer-name-only projects remain unchanged until an admin links an account. Other accounts created through registration still require approval and role assignment. The frontend now uses the Express API; it no longer supplies mock data or a hardcoded admin. Existing browser `localStorage` data is left untouched and is not automatically imported into MongoDB. Run backend tests with `npm test` inside `backend`.

The browser talks to Next.js; `/api/*` is proxied to Express by `frontend/next.config.mjs`, so the login cookie is same-origin. For local development, `BACKEND_URL` defaults to `http://localhost:4000`. Docker builds use `http://backend:4000`; when building an image for another backend URL, set the frontend Docker build argument `BACKEND_URL` to that URL.

## What is built (MVP core)
- **Auth:** register, login, logout; bcrypt passwords; JWT in an httpOnly cookie; admin approval for new accounts; roles `admin`, `project_manager`, `engineer`, `contractor`, `finance`. The user is re-checked in the database on every request.
- **Projects:** create, list, search, filter, detail with workflow and activity log, status change, archive.
- **Permits:** checklist items per project, status changes, a reason is required for Rejected or Blocked, overdue flags, completion %.
- **Net metering:** applications with status history, a "why is it stuck" view (who it is waiting on, days waiting, next action), authority scorecard from your own history.
- **Contractor milestones:** the flow is evidence and invoice, then verification, then approval, then recording payment. A milestone cannot be submitted without a photo that carries a location for every required kind plus an invoice. The person who verified cannot also approve. Payment needs a transaction reference. No money is moved.
- **Dashboard:** counts scoped to what the signed-in user may see.
- **Operations tasks:** persistent assigned work with project links, priority, due date, status history, filters, summary counts, and overdue indicators. Admins and project managers create and edit; assignees can update their own task status.
- **Daily reports:** date-based status snapshots derived from saved task history, scoped to the signed-in user; staff can add operational notes and download CSV or print.
- **In-app notifications:** task assignment and status-change events plus deduplicated approaching-deadline and overdue reminders. The hourly reminder scheduler runs in the long-lived Express server process and sends no email or SMS.
- **Customer dashboard:** linked customers see only their own project progress, estimated completion, permit/net-metering status, milestones, customer actions, required documents, and support requests. Sensitive contract values, internal project notes, payment references, and private permit reasons are not returned to customer APIs.
- **Customer and admin operations:** admins create/edit customer accounts and link them to projects and project teams. Customers can submit support requests; admins and assigned project teams can update the status and customer-visible response.
- **Near-real-time refresh:** authenticated pages poll the backend every 10 seconds while visible and refresh when a browser tab becomes visible again. Project, permit, net-metering, milestone, and support-request changes are stored in MongoDB and surfaced as scoped in-app notifications. This avoids new infrastructure and works with the existing serverless-compatible API, but updates are polling-based rather than push/WebSocket delivery.

## Authorization (enforced by the API, not just hidden in the UI)
| Area | admin | project_manager | engineer | contractor | finance | customer |
|---|---|---|---|---|---|---|
| Projects | all | assigned | assigned | only those with their milestones | all (read) | linked projects |
| Permits, net metering | yes | assigned | assigned | no | no | no |
| Milestones | all | assigned projects | no | own company only | read; approve, record payment | no |
| Users and roles | yes | no | no | no | no | no |
| Operations tasks | all | create/edit; assigned projects | assigned projects; own status | own assigned tasks; status only | own assigned tasks; read | no |
| Daily reports | all | assigned projects | assigned projects | own assigned tasks | own assigned tasks | no |
| Notifications | own | own | own | own | own | own |
| Customer dashboard and requests | no | no | no | no | no | linked projects only |
| Customer account management and assignment | yes | no | no | no | no | no |

"Assigned" means the user is the project's manager or engineer. Out-of-scope records return 404.

## API (all under /api)
`POST /auth/register|login|logout`, `GET /auth/me` · `GET|PATCH /users` (admin) · `GET|POST /projects`, `GET|PATCH /projects/:id` · `GET|POST /permits`, `PATCH|DELETE /permits/:id` · `GET|POST /net-metering`, `PATCH /net-metering/:id/status` · `GET|POST /contractors` · `GET|POST /milestones`, `POST /milestones/:id/evidence` (multipart, field `photo`), `GET /milestones/:id/evidence/:eid/file`, `PUT /milestones/:id/invoice`, `POST /milestones/:id/transition`, `POST /milestones/:id/pay` · `GET /dashboard`

Operations additions: `GET|POST /tasks`, `GET /tasks/assignees`, `PATCH /tasks/:id` · `GET /reports/daily?date=YYYY-MM-DD`, `GET /reports/daily.csv?date=YYYY-MM-DD`, `POST /reports/daily/notes` · `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`.

Customer additions: `GET /customer/overview`, `POST /customer/requests` · admin customer accounts: `GET|POST /users/customers`, `PATCH /users/:id` · customer support inbox: `GET /support-requests`, `PATCH /support-requests/:id` · project assignment options: `GET /projects/assignments`.

## Security notes
Inputs are validated with zod; errors go through one handler; helmet, rate limiting on login and register, JSON body limit, uploads checked by size, type and file signature and stored outside any public folder, served only through an authenticated route. API requests now require a valid approved-user session; there is no anonymous administrator fallback. Customer project linkage is an optional additive `Project.customerAccount` reference; old project records remain readable and are not automatically assigned. Before production: set a strong `JWT_SECRET`, use HTTPS (cookies become `secure` when `NODE_ENV=production`), add CSRF protection if you ever serve the API from a different site than the frontend (`COOKIE_SAMESITE=none`), and move uploads to object storage. The deadline scheduler requires a continuously running `backend/src/server.js` process and MongoDB; exporting `backend/index.js` alone in a serverless host does not run it. Polling requires no new service or environment variable.

## Not ported from the earlier Vite/Supabase prototype
Documents and CAD files, Google sign-in, password reset, the Python AI helper, WhatsApp, weather, forecast, equipment registry, languages, offline mode. The data model leaves room for them; say which to bring over next.

## Git
```bash
git init && git add . && git commit -m "Initial SolarFlow OS (Next.js, Express, MongoDB)"
git branch -M main && git remote add origin <your GitHub repo URL> && git push -u origin main
```
`.env` files and uploads are git-ignored; commit only the `.env.example` files.
