$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot/backend"
if (-not $env:DB_PASSWORD) { $env:DB_PASSWORD = [System.Net.NetworkCredential]::new('', (Read-Host 'Contraseña PostgreSQL de essalud_app' -AsSecureString)).Password }
if (-not $env:JWT_SECRET) { $bytes=New-Object byte[] 48; $rng=[System.Security.Cryptography.RandomNumberGenerator]::Create(); $rng.GetBytes($bytes); $env:JWT_SECRET=[Convert]::ToBase64String($bytes); $rng.Dispose() }
$env:APP_DEMO = 'true'
if (-not $env:DEMO_PASSWORD) { $env:DEMO_PASSWORD = [System.Net.NetworkCredential]::new('', (Read-Host 'Contraseña para cuentas demo (mínimo 8 caracteres; solo primer arranque)' -AsSecureString)).Password }
if (Test-Path 'citas.jar') { java -jar citas.jar } else { mvn spring-boot:run }
