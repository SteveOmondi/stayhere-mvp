param(
    [Parameter(Mandatory=$true)]
    [string]$BaseUrl,
    
    [string]$SubscriptionKey = "",

    [switch]$TestBackends = $false
)

$ErrorActionPreference = "Stop"

function Test-Endpoint {
    param($Name, $Method, $Url, $Body = $null)
    
    $headers = @{ "Content-Type" = "application/json" }
    if ($Url -like "*azure-api.net*" -and $SubscriptionKey) { $headers["Ocp-Apim-Subscription-Key"] = $SubscriptionKey }
    
    Write-Host "Testing [$Name] ($Method $Url)... " -NoNewline
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $headers
            TimeoutSec = 10
        }
        if ($Body) { $params.Body = ($Body | ConvertTo-Json) }
        
        $startTime = Get-Date
        $response = Invoke-RestMethod @params
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        Write-Host "SUCCESS ($($duration)ms)" -ForegroundColor Green
        return $response
    }
    catch {
        Write-Host "FAILED ($($_.Exception.Message))" -ForegroundColor Red
        return $null
    }
}

Write-Host "`n--- StayHere MVP API Verification ---" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl`n"

$suffix = $BaseUrl.Split('-')[-1].Split('.')[0]
$dummyId = "00000000-0000-0000-0000-000000000001"

# --- Endpoints Mapping ---
# --- Auth Stage Tests ---
$Tests = @(
    @{ Name = "Auth: Signup (New User)";    Method = "POST"; Path = "/auth/signup";    BackendApi = "/api/auth/signup";    Svc = "auth"; Body = @{ email = "newuser@example.com"; fullName = "Test User"; userType = "Individual" } }
    @{ Name = "Auth: Request OTP (Email)"; Method = "POST"; Path = "/auth/login";     BackendApi = "/api/auth/login";     Svc = "auth"; Body = @{ email = "admin@stayhere.com" } }
    @{ Name = "Auth: Verify OTP (Mock)";    Method = "POST"; Path = "/auth/verifyotp"; BackendApi = "/api/auth/verifyotp"; Svc = "auth"; Body = @{ target = "admin@stayhere.com"; code = "123456" } }
    @{ Name = "Auth: Get Profiles";         Method = "GET";  Path = "/auth/profiles/66666666-6666-6666-6666-666666666666"; BackendApi = "/api/auth/profiles/66666666-6666-6666-6666-666666666666"; Svc = "auth"; Body = $null }
    @{ Name = "Auth: Onboard Tenant";       Method = "POST"; Path = "/auth/onboard";   BackendApi = "/api/auth/onboard";   Svc = "auth"; Body = @{ userId = "66666666-6666-6666-6666-666666666666"; role = "Tenant"; fullName = "Admin Tenant"; email = "admin@stayhere.com" } }
)

foreach ($test in $Tests) {
    Write-Host "--- $($test.Name) ---" -ForegroundColor Cyan
    
    # Optional: Test Backend Directly
    if ($TestBackends) {
        $backendUrl = "https://func-dev-$($test.Svc)-$suffix.azurewebsites.net$($test.BackendApi)"
        Test-Endpoint -Name "DIRECT" -Method $test.Method -Url $backendUrl -Body $test.Body
    }

    # Test through APIM
    Test-Endpoint -Name "GATEWAY" -Method $test.Method -Url "$BaseUrl$($test.Path)" -Body $test.Body
    Write-Host ""
}

Write-Host "`n--- Verification Complete ---" -ForegroundColor Cyan
