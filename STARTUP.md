# 🌞 SolarFlow OS - Quick Start Guide

## Prerequisites
- ✅ Node.js (v18+)
- ✅ MongoDB (running locally)
- ✅ npm or yarn

## Quick Start (Automated)

Run this PowerShell script from the project root:
```powershell
.\start-dev.ps1
```

This will automatically:
1. Check MongoDB is running
2. Install dependencies
3. Seed the database
4. Start backend and frontend servers

## Manual Start

### 1. Start MongoDB
```powershell
# Check if running
Get-Process -Name "mongod"

# If not running, start it:
Start-Service MongoDB
# OR
mongod --dbpath C:\data\db
```

### 2. Install Dependencies
```powershell
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### 3. Seed Database
```powershell
cd backend
npm run seed:demo
```

Expected output:
```
Admin ready: admin@example.com
Demo data created
```

### 4. Start Backend
```powershell
cd backend
npm run dev
```

Expected output:
```
API listening on http://localhost:4000
```

### 5. Start Frontend (in new terminal)
```powershell
cd frontend
npm run dev
```

Expected output:
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
```

## Login Credentials

After seeding, use these credentials:

**Email:** `admin@example.com`  
**Password:** `ChangeMe-123`

## URLs

- 🎨 **Frontend:** http://localhost:3000
- 🔧 **Backend API:** http://localhost:4000
- 🏥 **Health Check:** http://localhost:4000/api/health

## Troubleshooting

### Issue: "Request failed (500)"
**Cause:** Backend server is not running  
**Fix:** Start backend with `npm run dev` in the backend folder

### Issue: "ECONNREFUSED 127.0.0.1:27017"
**Cause:** MongoDB is not running  
**Fix:** Start MongoDB service or mongod process

### Issue: "Wrong email or password"
**Cause:** Database not seeded  
**Fix:** Run `npm run seed:demo` in backend folder

### Issue: "Your account is waiting for admin approval"
**Cause:** User exists but not approved  
**Fix:** The seed script should auto-approve admin. If not, run:
```powershell
cd backend
npm run seed
```

### Check Backend Health
```powershell
Invoke-WebRequest -Uri "http://localhost:4000/api/health" | Select-Object -ExpandProperty Content
```

Should return: `{"ok":true}`

### View Backend Logs
Backend logs show all requests and errors. Look for:
- Database connection status
- API request logs
- Error messages

## Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/solarflow
JWT_SECRET=ksdjcehbvebfovdjvnkdjfvnkdnfvdew
SESSION_HOURS=8
CLIENT_ORIGIN=http://localhost:3000
COOKIE_SAMESITE=lax
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ChangeMe-123
```

### Frontend (.env)
```env
BACKEND_URL=http://localhost:4000
```

## Next Steps

After logging in as admin, you can:
1. View the dashboard with overview metrics
2. Create new projects
3. Manage permits and net-metering applications
4. View and manage contractors
5. Track project milestones
6. Create additional users

## Demo Data Included

The `seed:demo` command creates:
- 1 Admin user (admin@example.com)
- 1 Contractor (BrightArc Contractors)
- 2 Sample projects
- 2 Permit items
- 1 Net-metering application
- 1 Milestone

This gives you a fully populated system to explore all features.
