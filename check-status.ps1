# SolarFlow OS - System Status Check

Write-Host "`n🔍 SolarFlow OS - System Status Check`n" -ForegroundColor Cyan

# Check MongoDB
Write-Host "MongoDB Status:" -ForegroundColor Yellow
$mongoProcess = Get-Process -Name "mongod" -ErrorAction SilentlyContinue
if ($mongoProcess) {
    Write-Host "  ✅ Running (PID: $($mongoProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "  ❌ Not Running" -ForegroundColor Red
}

# Check Backend Server (Port 4000)
Write-Host "`nBackend Server (Port 4000):" -ForegroundColor Yellow
$backendPort = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue
if ($backendPort) {
    Write-Host "  ✅ Running" -ForegroundColor Green
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:4000/api/health" -ErrorAction Stop -TimeoutSec 2
        if ($health.ok) {
            Write-Host "  ✅ Health check passed" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ⚠️  Server running but health check failed" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ Not Running" -ForegroundColor Red
}

# Check Frontend Server (Port 3000)
Write-Host "`nFrontend Server (Port 3000):" -ForegroundColor Yellow
$frontendPort = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($frontendPort) {
    Write-Host "  ✅ Running" -ForegroundColor Green
} else {
    Write-Host "  ❌ Not Running" -ForegroundColor Red
}

# Check Node modules
Write-Host "`nDependencies:" -ForegroundColor Yellow
$backendModules = Test-Path "backend/node_modules"
$frontendModules = Test-Path "frontend/node_modules"

if ($backendModules) {
    Write-Host "  ✅ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ❌ Backend dependencies missing" -ForegroundColor Red
    Write-Host "     Run: cd backend; npm install" -ForegroundColor Gray
}

if ($frontendModules) {
    Write-Host "  ✅ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ❌ Frontend dependencies missing" -ForegroundColor Red
    Write-Host "     Run: cd frontend; npm install" -ForegroundColor Gray
}

# Summary
Write-Host "`n" -NoNewline
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "`n📋 Summary:" -ForegroundColor Cyan

$allGood = $mongoProcess -and $backendPort -and $frontendPort
if ($allGood) {
    Write-Host "  ✅ All systems operational!" -ForegroundColor Green
    Write-Host "`n  🌐 Open: " -NoNewline -ForegroundColor Cyan
    Write-Host "http://localhost:3000/login" -ForegroundColor White
    Write-Host "  📧 Email: " -NoNewline -ForegroundColor Cyan
    Write-Host "admin@example.com" -ForegroundColor White
    Write-Host "  🔑 Password: " -NoNewline -ForegroundColor Cyan
    Write-Host "ChangeMe-123" -ForegroundColor White
} else {
    Write-Host "  ⚠️  Some services are not running`n" -ForegroundColor Yellow
    
    if (-not $mongoProcess) {
        Write-Host "  🔧 Start MongoDB:" -ForegroundColor Cyan
        Write-Host "     Start-Service MongoDB" -ForegroundColor Gray
    }
    
    if (-not $backendPort) {
        Write-Host "  🔧 Start Backend:" -ForegroundColor Cyan
        Write-Host "     cd backend; npm run dev" -ForegroundColor Gray
    }
    
    if (-not $frontendPort) {
        Write-Host "  🔧 Start Frontend:" -ForegroundColor Cyan
        Write-Host "     cd frontend; npm run dev" -ForegroundColor Gray
    }
    
    Write-Host "`n  Or run: " -NoNewline -ForegroundColor Cyan
    Write-Host ".\start-dev.ps1" -ForegroundColor White -NoNewline
    Write-Host " to start all services" -ForegroundColor Cyan
}

Write-Host ""
