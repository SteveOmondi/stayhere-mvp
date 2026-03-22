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
# Note: These paths match the APIM paths defined in modules/apim/main.tf
$Tests = @(
    @{ Name = "StaticData: Categories"; Method = "GET";  Path = "/staticdata/categories";  BackendApi = "/api/categories"; Svc = "staticdata" }
    @{ Name = "Property: List All";     Method = "GET";  Path = "/property/properties";    BackendApi = "/api/properties"; Svc = "property" }
    @{ Name = "Auth: Login";            Method = "POST"; Path = "/auth/Login";             BackendApi = "/api/Login";      Svc = "auth"; Body = @{  = "test@example.com" } }
    @{ Name = "Customer: List";         Method = "GET";  Path = "/customer/customers";     BackendApi = "/api/customers";  Svc = "customer" }
    @{ Name = "Owner: Properties";      Method = "GET";  Path = "/propertyowner/owners/$dummyId/properties"; BackendApi = "/api/owners/$dummyId/properties"; Svc = "propertyowner" }
)

foreach ($test in $Tests) {
    # Test through APIM
    Test-Endpoint -Name $test.Name -Method $test.Method -Url "$BaseUrl$($test.Path)" -Body $test.Body
    
    # Optional: Test Backend Directly
    if ($TestBackends) {
        $backendUrl = "https://func-dev-$($test.Svc)-$suffix.azurewebsites.net$($test.BackendApi)"
        Test-Endpoint -Name "DIRECT: $($test.Name)" -Method $test.Method -Url $backendUrl -Body $test.Body
    }
}

Write-Host "`n--- Verification Complete ---" -ForegroundColor Cyan
