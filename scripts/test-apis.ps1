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

# --- Endpoints Mapping ---
$Tests = @(
    @{ Name = "StaticData: Categories"; Method = "GET";  ApimPath = "/staticdata/categories"; BackendPath = "/api/categories"; Svc = "staticdata" }
    @{ Name = "Property: List All";     Method = "GET";  ApimPath = "/property/properties";   BackendPath = "/api/properties"; Svc = "property" }
    @{ Name = "Auth: Login";            Method = "POST"; ApimPath = "/auth/Login";            BackendPath = "/api/Login";      Svc = "auth"; Body = @{ email = "test@example.com" } }
)

foreach ($test in $Tests) {
    # Test through APIM
    Test-Endpoint -Name $test.Name -Method $test.Method -Url "$BaseUrl$($test.ApimPath)" -Body $test.Body
    
    # Optional: Test Backend Directly
    if ($TestBackends) {
        $backendUrl = "https://func-dev-$($test.Svc)-$suffix.azurewebsites.net$($test.BackendPath)"
        Test-Endpoint -Name "DIRECT: $($test.Name)" -Method $test.Method -Url $backendUrl -Body $test.Body
    }
}

Write-Host "`n--- Verification Complete ---" -ForegroundColor Cyan
