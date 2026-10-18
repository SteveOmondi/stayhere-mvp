<#
.SYNOPSIS
    Start the StayHere MCP server (src\McpServer) on its default port - see
    stayhere-function-ports.ps1. This is a plain ASP.NET Core host, not a Function App, so it runs
    via `dotnet run`, not `func start`.

.EXAMPLE
    .\Start-StayHereMcpServer.ps1

.EXAMPLE
    .\Start-StayHereMcpServer.ps1 -NoNewWindow -NoBuild
#>
[CmdletBinding()]
param(
    [switch] $NoNewWindow,
    [switch] $NoBuild
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\stayhere-function-ports.ps1"

$def = $StayHereOtherServices | Where-Object { $_.Name -eq "McpServer" } | Select-Object -First 1
$repo = Get-StayHereRepoRoot
$appDir = Join-Path $repo $def.RelativePath
if (-not (Test-Path $appDir)) { throw "Directory not found: $appDir" }

$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:ASPNETCORE_URLS = "http://localhost:$($def.Port)"

$runArgs = "dotnet run"
if ($NoBuild) { $runArgs += " --no-build" }
$cmd = "Set-Location '$appDir'; `$env:ASPNETCORE_ENVIRONMENT='Development'; `$env:ASPNETCORE_URLS='http://localhost:$($def.Port)'; $runArgs"

if ($NoNewWindow) {
    Push-Location $appDir
    try {
        if ($NoBuild) { dotnet run --no-build }
        else { dotnet run }
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

Write-Host "Started $($def.Name) in a new window on port $($def.Port) (http://localhost:$($def.Port)/mcp)."
