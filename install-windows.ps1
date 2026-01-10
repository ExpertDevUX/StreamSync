# ConnectNow Installation Script for Windows
# Copyright © 2026 Hoang Thong Pham
# Run as Administrator: powershell -ExecutionPolicy Bypass -File install-windows.ps1

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           ConnectNow Installation for Windows              ║" -ForegroundColor Cyan
Write-Host "║        Copyright © 2026 Hoang Thong Pham                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "Error: This script must be run as Administrator" -ForegroundColor Red
  exit 1
}

# Step 1: Check and install Node.js
Write-Host "Step 1: Checking Node.js installation..." -ForegroundColor Cyan
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Installing Node.js..." -ForegroundColor Yellow
  
  # Download Node.js LTS
  $nodeUrl = "https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi"
  $nodeInstaller = "$env:TEMP\node-installer.msi"
  
  Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller
  Start-Process msiexec.exe -ArgumentList "/i $nodeInstaller /quiet" -Wait
  
  Remove-Item $nodeInstaller
}
Write-Host "✓ Node.js $(node --version)" -ForegroundColor Green

# Step 2: Check and install PostgreSQL
Write-Host "Step 2: Checking PostgreSQL installation..." -ForegroundColor Cyan
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  Write-Host "Installing PostgreSQL..." -ForegroundColor Yellow
  
  $pgUrl = "https://get.enterprisedb.com/postgresql/postgresql-15-windows-x64.exe"
  $pgInstaller = "$env:TEMP\postgresql-installer.exe"
  
  Invoke-WebRequest -Uri $pgUrl -OutFile $pgInstaller
  Start-Process $pgInstaller -Wait
  
  Remove-Item $pgInstaller
}
Write-Host "✓ PostgreSQL installed" -ForegroundColor Green

# Step 3: Clone repository
Write-Host "Step 3: Cloning ConnectNow repository..." -ForegroundColor Cyan
if (-not (Test-Path "connect-now")) {
  git clone https://github.com/thongphamit/connect-now.git
}
Set-Location connect-now

# Step 4: Install dependencies
Write-Host "Step 4: Installing Node.js dependencies..." -ForegroundColor Cyan
npm install

# Step 5: Create environment configuration
Write-Host "Step 5: Creating environment configuration..." -ForegroundColor Cyan
$envContent = @"
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/connectnow
NEXT_PUBLIC_SIGNALING_SERVER=http://localhost:3001
NEXT_PUBLIC_APP_DOMAIN=thongphamit.site
NEXT_PUBLIC_APP_NAME=ConnectNow
MAX_FILE_SIZE=5242880
"@

Set-Content -Path ".env.local" -Value $envContent
Write-Host "✓ Created .env.local" -ForegroundColor Green

# Step 6: Setup database
Write-Host "Step 6: Setting up PostgreSQL database..." -ForegroundColor Cyan
$pgBin = "C:\Program Files\PostgreSQL\15\bin"
if (Test-Path $pgBin) {
  & "$pgBin\psql.exe" -U postgres -c "CREATE DATABASE connectnow;" 2>$null
  & "$pgBin\psql.exe" -U postgres -d connectnow -f scripts/001_create_tables.sql 2>$null
  & "$pgBin\psql.exe" -U postgres -d connectnow -f scripts/002_create_signaling_tables.sql 2>$null
}
Write-Host "✓ Database setup complete" -ForegroundColor Green

# Step 7: Build application
Write-Host "Step 7: Building ConnectNow..." -ForegroundColor Cyan
npm run build

# Summary
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         Installation Complete! 🎉                          ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Start the application:"
Write-Host "   npm run dev  (Development)" -ForegroundColor Yellow
Write-Host "   npm start    (Production)" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Start the signaling server:"
Write-Host "   .\scripts\setup-signaling-server.sh" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Access ConnectNow at:"
Write-Host "   http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "For more information, visit: https://thongphamit.site"
