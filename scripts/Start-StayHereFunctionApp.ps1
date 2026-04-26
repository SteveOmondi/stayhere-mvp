<#
.SYNOPSIS
    Start one StayHere Function App on its default port (see stayhere-function-ports.ps1).

.EXAMPLE
    .\Start-StayHereFunctionApp.ps1 -Name PropertyService

.EXAMPLE
    .\Start-StayHereFunctionApp.ps1 -Name AiAgentService -NoNewWindow
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("AuthService", "PropertyService", "CustomerService", "PropertyOwnerService", "StaticDataService", "AiAgentService")]
    [string] $Name,

    [switch] $NoNewWindow
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\stayhere-function-ports.ps1"

if (-not (Test-FuncCli)) { exit 1 }

$def = $StayHereFunctionApps | Where-Object { $_.Name -eq $Name } | Select-Object -First 1
if (-not $def) { throw "Unknown app: $Name" }

$repo = Get-StayHereRepoRoot
$appDir = Join-Path $repo $def.RelativePath
if (-not (Test-Path $appDir)) { throw "Directory not found: $appDir" }

$cmd = "Set-Location '$appDir'; func start --port $($def.Port)"

if ($NoNewWindow) {
    Push-Location $appDir
    try {
        func start --port $def.Port
    }
    finally {
        Pop-Location
    }
    return
}

Start-Process powershell -WorkingDirectory $appDir -ArgumentList @(
    "-NoExit",
    "-NoLogo",
    "-Command",
    $cmd
) | Out-Null

Write-Host "Started $($def.Name) in a new window on port $($def.Port) (http://localhost:$($def.Port)/api)."
