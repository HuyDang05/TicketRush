$ErrorActionPreference = "Stop"

Push-Location "$PSScriptRoot\..\backend"
npm test
Pop-Location

Push-Location "$PSScriptRoot\..\frontend"
npm test
npm run build
Pop-Location
