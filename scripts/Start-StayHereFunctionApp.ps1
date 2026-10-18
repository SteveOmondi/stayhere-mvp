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
    [ValidateSet("AuthService", "PropertyService", "CustomerService", "PropertyOwnerService", "StaticDataService", "AiAgentService", "PaymentsService", "LoggingService")]
    [string] $Name,

    [switch] $NoNewWindow,

    # func's own build step races other function apps over shared project obj/ output when several
    # are launched at once (CS2012 file-lock errors). Build the solution once beforehand and pass
    # this switch so `func start` just runs the already-built output.
    [switch] $NoBuild
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\stayhere-function-ports.ps1"

if (-not (Test-FuncCli)) { exit 1 }

$def = $StayHereFunctionApps | Where-Object { $_.Name -eq $Name } | Select-Object -First 1
if (-not $def) { throw "Unknown app: $Name" }

$repo = Get-StayHereRepoRoot
$appDir = Join-Path $repo $def.RelativePath
if (-not (Test-Path $appDir)) { throw "Directory not found: $appDir" }

$funcArgs = "func start --port $($def.Port)"
if ($NoBuild) { $funcArgs += " --no-build" }
$cmd = "Set-Location '$appDir'; $funcArgs"

if ($NoNewWindow) {
    Push-Location $appDir
    try {
        if ($NoBuild) { func start --port $def.Port --no-build }
        else { func start --port $def.Port }
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
