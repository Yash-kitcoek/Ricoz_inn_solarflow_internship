# SolarFlow OS - Development Startup Script

Write-Host "`n🌞 SolarFlow OS - Starting Development Environment`n" -ForegroundColor Cyan

# Check MongoDB
Write-Host "1️⃣  Checking MongoDB..." -ForegroundColor Yellow
$mongoProcess = Get-Process -Name "mongod" -ErrorAction SilentlyContinue
if (-not $mongoProcess) {
    Write-Host "   ❌ MongoDB is NOT running!" -ForegroundColor Red
    Write-Host "   Please start MongoDB first:" -ForegroundColor Yellow
    Write-Host "   - Run: Start-Service MongoDB (if installed as service)" -ForegroundColor Gray
    Write-Host "   - Or: mongod --dbpath C:\data\db`n" -ForegroundColor Gray
    exit 1
}
Write-Host "   ✅ MongoDB is running`n" -ForegroundColor Green

# Check if backend packages are installed
if (-not (Test-Path "backend/node_modules")) {
    Write-Host "2️⃣  Installing backend dependencies..." -ForegroundColor Yellow
    Push-Location backend
    npm install
    Pop-Location
    Write-Host "   ✅ Backend dependencies installed`n" -ForegroundColor Green
}

# Check if frontend packages are installed
if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "3️⃣  Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location frontend
    npm install
    Pop-Location
    Write-Host "   ✅ Frontend dependencies installed`n" -ForegroundColor Green
}

# Check if database is seeded
Write-Host "4️⃣  Checking database..." -ForegroundColor Yellow
Push-Location backend
$checkDb = node -e "import('./src/config/db.js').then(m => m.connectDb()).then(() => import('./src/models/User.js')).then(m => m.default.countDocuments()).then(c => console.log(c)).catch(() => console.log('0'))" 2>$null
Pop-Location

if ($checkDb -eq "0" -or -not $checkDb) {
    Write-Host "   ⚠️  Database is empty. Seeding with demo data..." -ForegroundColor Yellow
    Push-Location backend
    npm run seed:demo
    Pop-Location
    Write-Host "   ✅ Database seeded`n" -ForegroundColor Green
} else {
    Write-Host "   ✅ Database already has $checkDb users`n" -ForegroundColor Green
}

# Start backend server
Write-Host "5️⃣  Starting backend server..." -ForegroundColor Yellow
Write-Host "   Opening new terminal for backend (http://localhost:4000)`n" -ForegroundColor Gray
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd backend; Write-Host '🔧 Backend Server' -ForegroundColor Cyan; npm run dev"

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend server
Write-Host "6️⃣  Starting frontend server..." -ForegroundColor Yellow
Write-Host "   Opening new terminal for frontend (http://localhost:3000)`n" -ForegroundColor Gray
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd frontend; Write-Host '🎨 Frontend Server' -ForegroundColor Cyan; npm run dev"

Write-Host "`n✨ All Done!" -ForegroundColor Green
Write-Host "`n📋 Login Credentials:" -ForegroundColor Cyan
Write-Host "   Email:    admin@example.com" -ForegroundColor White
Write-Host "   Password: ChangeMe-123" -ForegroundColor White
Write-Host "`n🌐 Open: http://localhost:3000/login`n" -ForegroundColor Cyan
