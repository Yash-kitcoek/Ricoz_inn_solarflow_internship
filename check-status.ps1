# SolarFlow OS - System Status Check

Write-Host "`nSolarFlow OS - System Status Check`n" -ForegroundColor Cyan

# Check MongoDB
Write-Host "MongoDB Status:" -ForegroundColor Yellow
$mongoProcess = Get-Process -Name "mongod" -ErrorAction SilentlyContinue
if ($mongoProcess) {
    Write-Host "  [OK] Running (PID: $($mongoProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "  [!] Not Running locally (checking Atlas / cloud)" -ForegroundColor Yellow
}

# Check Backend Server (Port 4000)
Write-Host "`nBackend Server (Port 4000):" -ForegroundColor Yellow
$backendPort = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue
if ($backendPort) {
    Write-Host "  [OK] Running" -ForegroundColor Green
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:4000/api/health" -ErrorAction Stop -TimeoutSec 2
        if ($health.ok) {
            Write-Host "  [OK] Health check passed" -ForegroundColor Green
        }
    } catch {
        Write-Host "  [!] Server running but health check failed" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [X] Not Running" -ForegroundColor Red
}

# Check Frontend Server (Port 3000)
Write-Host "`nFrontend Server (Port 3000):" -ForegroundColor Yellow
$frontendPort = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($frontendPort) {
    Write-Host "  [OK] Running" -ForegroundColor Green
} else {
    Write-Host "  [X] Not Running" -ForegroundColor Red
}

# Check Node modules
Write-Host "`nDependencies:" -ForegroundColor Yellow
$backendModules = Test-Path "backend/node_modules"
$frontendModules = Test-Path "frontend/node_modules"

if ($backendModules) {
    Write-Host "  [OK] Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  [X] Backend dependencies missing" -ForegroundColor Red
    Write-Host "     Run: cd backend; npm install" -ForegroundColor Gray
}

if ($frontendModules) {
    Write-Host "  [OK] Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  [X] Frontend dependencies missing" -ForegroundColor Red
    Write-Host "     Run: cd frontend; npm install" -ForegroundColor Gray
}

# Summary
Write-Host "`n----------------------------------------" -ForegroundColor DarkGray
Write-Host "`nSummary:" -ForegroundColor Cyan

$allGood = $backendPort -and $frontendPort
if ($allGood) {
    Write-Host "  All systems operational!" -ForegroundColor Green
    Write-Host "`n  Open: http://localhost:3000/login" -ForegroundColor White
    Write-Host "  Email: admin@example.com" -ForegroundColor White
    Write-Host "  Password: ChangeMe-123" -ForegroundColor White
} else {
    Write-Host "  Some services are not running`n" -ForegroundColor Yellow
    
    if (-not $backendPort) {
        Write-Host "  Start Backend:" -ForegroundColor Cyan
        Write-Host "     cd backend; npm run dev" -ForegroundColor Gray
    }
    
    if (-not $frontendPort) {
        Write-Host "  Start Frontend:" -ForegroundColor Cyan
        Write-Host "     cd frontend; npm run dev" -ForegroundColor Gray
    }
}

Write-Host ""
