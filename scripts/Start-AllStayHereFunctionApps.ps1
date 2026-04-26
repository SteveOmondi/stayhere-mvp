<#
.SYNOPSIS
    Start every StayHere Function App in its own PowerShell window on default ports 7100–7105.

.NOTES
    Requires Azure Functions Core Tools (`func`) on PATH.
#>
$ErrorActionPreference = "Stop"
. "$PSScriptRoot\stayhere-function-ports.ps1"

if (-not (Test-FuncCli)) { exit 1 }

foreach ($app in $StayHereFunctionApps) {
    & "$PSScriptRoot\Start-StayHereFunctionApp.ps1" -Name $app.Name
    Start-Sleep -Milliseconds 400
}

Write-Host ""
Write-Host "Launched $($StayHereFunctionApps.Count) hosts. Default ports:"
$StayHereFunctionApps | ForEach-Object { Write-Host "  $($_.Name.PadRight(22)) http://localhost:$($_.Port)/api" }
