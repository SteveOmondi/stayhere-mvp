# Shared port map for StayHere Function Apps (single source of truth for start scripts).
# Base URL in Postman = http://localhost:<Port>/api

$script:StayHereFunctionApps = @(
    @{ Name = "AuthService";         Port = 7100; RelativePath = "src\FunctionApps\AuthService" }
    @{ Name = "PropertyService";    Port = 7101; RelativePath = "src\FunctionApps\PropertyService" }
    @{ Name = "CustomerService";    Port = 7102; RelativePath = "src\FunctionApps\CustomerService" }
    @{ Name = "PropertyOwnerService"; Port = 7103; RelativePath = "src\FunctionApps\PropertyOwnerService" }
    @{ Name = "StaticDataService";  Port = 7104; RelativePath = "src\FunctionApps\StaticDataService" }
    @{ Name = "AiAgentService";     Port = 7105; RelativePath = "src\FunctionApps\AiAgentService" }
    @{ Name = "PaymentsService";     Port = 7106; RelativePath = "src\FunctionApps\PaymentsService" }
    @{ Name = "LoggingService";      Port = 7107; RelativePath = "src\FunctionApps\LoggingService" }
)

# Plain ASP.NET Core hosts that live alongside the Function Apps but are NOT Function Apps
# themselves (no `func start`, no Functions Worker runtime) - started with `dotnet run` instead.
# StayHere.McpServer is deliberately not a Function App: Azure Functions' isolated-worker hosting
# model doesn't expose a normal IEndpointRouteBuilder for the MCP SDK's MapMcp() to attach to, so
# it's a standalone Minimal API project that reuses the same Application/Infrastructure layers.
$script:StayHereOtherServices = @(
    @{ Name = "McpServer"; Port = 5299; RelativePath = "src\McpServer" }
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

# Kills any leftover func/dotnet processes from a previous run so every invocation starts from a
# clean slate. Safe to call unconditionally - these are always dev processes this tooling itself
# manages, never something else on the machine.
function Stop-StayHereFunctionProcesses {
    $procs = Get-Process func, dotnet -ErrorAction SilentlyContinue
    if ($procs) {
        Write-Host "Stopping $($procs.Count) leftover func/dotnet process(es) from a previous run..."
        $procs | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

# Runs a scriptblock (expected to set $LASTEXITCODE via a native command) up to $MaxAttempts times,
# retrying on failure. Absorbs transient antivirus/endpoint-protection file locks (CS2012 etc.) that
# clear up on their own within a couple of seconds, instead of failing the whole run over a blip.
function Invoke-WithRetry {
    param(
        [Parameter(Mandatory)] [scriptblock] $Action,
        [string] $Description = "command",
        [int] $MaxAttempts = 3,
        [int] $DelaySeconds = 4
    )
    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        & $Action
        if ($LASTEXITCODE -eq 0) { return $true }
        if ($attempt -lt $MaxAttempts) {
            Write-Warning "$Description failed (attempt $attempt/$MaxAttempts, likely a transient file lock - e.g. antivirus/endpoint-protection scanning a freshly-written DLL). Retrying in ${DelaySeconds}s..."
            Start-Sleep -Seconds $DelaySeconds
        }
    }
    return $false
}

# Polls until the given port is accepting connections (the func host is actually listening), or
# times out. Used to fully serialize build+startup across apps: app N+1 isn't launched until app
# N is confirmed listening, so func's own post-launch incremental build never overlaps between apps.
function Wait-ForPortListening {
    param([Parameter(Mandatory)] [int] $Port, [int] $TimeoutSeconds = 90)
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($listening) { return $true }
        Start-Sleep -Seconds 2
    }
    return $false
}
