param(
    [Parameter(Mandatory=$true)]
    [string]$BaseUrl,
    
    [string]$SubscriptionKey = ""
)

$ErrorActionPreference = "Stop"

function Test-Endpoint {
    param($Name, $Method, $Path, $Body = $null)
    
    $url = "$BaseUrl$Path"
    $headers = @{ "Content-Type" = "application/json" }
    if ($SubscriptionKey) { $headers["Ocp-Apim-Subscription-Key"] = $SubscriptionKey }
    
    Write-Host "Testing [$Name] ($Method $url)... " -NoNewline
    try {
        $params = @{
            Uri = $url
            Method = $Method
            Headers = $headers
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

# 1. Static Data Service
Test-Endpoint -Name "StaticData: Categories" -Method "GET" -Path "/staticdata/categories"

# 2. Property Service
Test-Endpoint -Name "Property: List All" -Method "GET" -Path "/property/properties"

# 3. Auth Service (Login Initiation)
$loginBody = @{
    email = "test@example.com"
}
Test-Endpoint -Name "Auth: Login (Email)" -Method "POST" -Path "/auth/Login" -Body $loginBody

# 4. Auth Service (Verify OTP)
$verifyBody = @{
    identity = "test@example.com"
    otp = "123456"
}
Test-Endpoint -Name "Auth: Verify OTP" -Method "POST" -Path "/auth/VerifyOtp" -Body $verifyBody

# 5. Customer Service (Profile)
# Note: This will likely return 401/404 if no user is found, but tests the connectivity.
Test-Endpoint -Name "Customer: Profile" -Method "GET" -Path "/customer/customers/profile"

# 6. Property Owner Service (Owner Properties)
Test-Endpoint -Name "Owner: Properties" -Method "GET" -Path "/propertyowner/owners/properties"

Write-Host "`n--- Verification Complete ---" -ForegroundColor Cyan
