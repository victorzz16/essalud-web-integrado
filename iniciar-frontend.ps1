$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot/frontend"
if (-not (Test-Path node_modules)) { npm ci; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
npm start
