# Shared port map for StayHere Function Apps (single source of truth for start scripts).
# Base URL in Postman = http://localhost:<Port>/api

$script:StayHereFunctionApps = @(
    @{ Name = "AuthService";         Port = 7100; RelativePath = "src\FunctionApps\AuthService" }
    @{ Name = "PropertyService";    Port = 7101; RelativePath = "src\FunctionApps\PropertyService" }
    @{ Name = "CustomerService";    Port = 7102; RelativePath = "src\FunctionApps\CustomerService" }
    @{ Name = "PropertyOwnerService"; Port = 7103; RelativePath = "src\FunctionApps\PropertyOwnerService" }
    @{ Name = "StaticDataService";  Port = 7104; RelativePath = "src\FunctionApps\StaticDataService" }
    @{ Name = "AiAgentService";     Port = 7105; RelativePath = "src\FunctionApps\AiAgentService" }
)

function Get-StayHereRepoRoot {
    $here = $PSScriptRoot
    if (-not $here) { $here = Split-Path -Parent $MyInvocation.MyCommand.Path }
    return (Resolve-Path (Join-Path $here "..")).Path
}

function Test-FuncCli {
    if (-not (Get-Command func -ErrorAction SilentlyContinue)) {
        Write-Error "Azure Functions Core Tools ('func') not found on PATH. Install: https://learn.microsoft.com/azure/azure-functions/functions-run-local"
        return $false
    }
    return $true
}
