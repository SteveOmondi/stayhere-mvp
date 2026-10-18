<#
.SYNOPSIS
    Pre-build every StayHere Function App sequentially (using each project's normal/default
    output layout), then start each one in its own PowerShell window on default ports 7100-7107,
    waiting for each to be fully up before starting the next.

.NOTES
    Requires Azure Functions Core Tools (func) on PATH.

    All function apps reference the same shared Domain/Application/Infrastructure/Shared class
    libraries. Launching func start for all of them at once (or running `func start` manually in
    several separate terminals at once - the most common way this regresses) makes several
    independent MSBuild processes race to write those shared projects' obj/ output at the same
    time, causing CS2012 "file may be locked" build failures.

    func start --no-build turned out to expect its OWN internal build's output layout (it also
    generates worker.config.json and other metadata as part of that build, not just the app DLLs),
    so skipping the build entirely broke startup. So this script instead makes the WHOLE
    build+start pipeline fully sequential, end to end, in three layers:

      1. Kill any leftover func/dotnet processes first (Stop-StayHereFunctionProcesses) so a
         previous crashed/partial run can never collide with this one.
      2. Pre-build each app one at a time with a plain `dotnet build` (default output paths),
         retrying transient failures (Invoke-WithRetry) - antivirus/endpoint-protection products
         (Windows Defender, HP Sure Click, etc.) routinely lock a just-written DLL for a moment to
         scan it, which is what CS2012 almost always actually is, not a real conflict.
      3. Launch each host one at a time and WAIT for it to actually be listening on its port
         (Wait-ForPortListening) before launching the next - not a fixed sleep. func still does
         its own (now fast, incremental, near-no-op) build after our pre-build, and that build can
         still collide with the NEXT app's build if launched too soon under system load; waiting
         for a real "listening" signal instead of a guessed delay removes that race entirely.

    If builds are still slow or flaky even with the retries above, the actual fix is a Windows
    Defender / endpoint-protection exclusion for this repo folder - see the README note this
    script prints at the end.
#>
$ErrorActionPreference = "Stop"
. "$PSScriptRoot\stayhere-function-ports.ps1"

if (-not (Test-FuncCli)) { exit 1 }

Stop-StayHereFunctionProcesses

$repo = Get-StayHereRepoRoot

$allApps = @($StayHereFunctionApps) + @($StayHereOtherServices)

foreach ($app in $allApps) {
    $appDir = Join-Path $repo $app.RelativePath
    Write-Host "Pre-building $($app.Name)..."
    $ok = Invoke-WithRetry -Description "Build of $($app.Name)" -Action { dotnet build $appDir -c Debug }
    if (-not $ok) {
        Write-Error "Build failed for $($app.Name) after retries - fix the build error above before starting the function apps."
        exit 1
    }
}

$failedToStart = @()
foreach ($app in $StayHereFunctionApps) {
    & "$PSScriptRoot\Start-StayHereFunctionApp.ps1" -Name $app.Name
    Write-Host "  Waiting for $($app.Name) to come up on port $($app.Port)..."
    if (-not (Wait-ForPortListening -Port $app.Port -TimeoutSeconds 90)) {
        Write-Warning "$($app.Name) did not start listening on port $($app.Port) within 90s - check its window for errors. Continuing with the rest."
        $failedToStart += $app.Name
    }
}

# Not a Function App (see Start-StayHereMcpServer.ps1) - started the same way, just via
# `dotnet run` instead of `func start`, after the function apps are all up.
foreach ($service in $StayHereOtherServices) {
    & "$PSScriptRoot\Start-StayHereMcpServer.ps1"
    Write-Host "  Waiting for $($service.Name) to come up on port $($service.Port)..."
    if (-not (Wait-ForPortListening -Port $service.Port -TimeoutSeconds 90)) {
        Write-Warning "$($service.Name) did not start listening on port $($service.Port) within 90s - check its window for errors. Continuing with the rest."
        $failedToStart += $service.Name
    }
}

Write-Host ""
Write-Host "Launched $($allApps.Count) hosts. Default ports:"
$StayHereFunctionApps | ForEach-Object { Write-Host "  $($_.Name.PadRight(22)) http://localhost:$($_.Port)/api" }
$StayHereOtherServices | ForEach-Object { Write-Host "  $($_.Name.PadRight(22)) http://localhost:$($_.Port)/mcp" }

if ($failedToStart.Count -gt 0) {
    Write-Host ""
    Write-Warning "These did not confirm listening in time - check their windows: $($failedToStart -join ', ')"
}

Write-Host ""
Write-Host "TIP: if builds are still slow/flaky, add a Windows Defender exclusion for this repo folder:"
Write-Host "  Add-MpPreference -ExclusionPath '$repo'   (run as Administrator)"
Write-Host "This removes most antivirus-caused file-lock errors at the source instead of just retrying past them."
