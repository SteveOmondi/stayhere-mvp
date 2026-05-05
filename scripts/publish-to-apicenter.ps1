# Publish APIs to Azure API Center
# This script registers and updates the OpenAPI definitions for all StayHere services in the API Center portal.

param(
    [string]$ResourceGroupName = "rg-stayhere-dev-5c27bcf3",
    [string]$ServiceContext = "apim-dev-5c27bcf3-apic"
)

$apiMap = @(
    @{ id = "auth-service"; title = "Auth Service"; tag = "AuthService"; path = "auth" },
    @{ id = "property-service"; title = "Property Service"; tag = "PropertyService"; path = "property" },
    @{ id = "customer-service"; title = "Customer Service"; tag = "CustomerService"; path = "customers" },
    @{ id = "propertyowner-service"; title = "Property Owner Service"; tag = "PropertyOwnerService"; path = "propertyowner" },
    @{ id = "staticdata-service"; title = "Static Data Service"; tag = "StaticDataService"; path = "staticdata" },
    @{ id = "aiagent-service"; title = "AI Agent Service"; tag = "AiAgentService"; path = "aiagent" }
)

Write-Host "----------------------------------------------------"
Write-Host "Discovering APIM Gateway in $ResourceGroupName..." -ForegroundColor Cyan

# Find APIM name (it starts with 'apim-' and is in the same RG)
$apimName = az apimanagement list --resource-group $ResourceGroupName --query "[?contains(name, 'apim-') && !contains(name, '-apic')].name" -o tsv | Select-Object -First 1
if ([string]::IsNullOrWhiteSpace($apimName)) {
    Write-Host "  ERROR: Could not find APIM instance. Defaulting to ServiceContext prefix..." -ForegroundColor Yellow
    $apimName = $ServiceContext.Replace("-apic", "")
}

$apimUrl = "https://$apimName.azure-api.net"
Write-Host "  APIM Gateway: $apimUrl" -ForegroundColor Green
Write-Host "----------------------------------------------------"

Write-Host "CLEANUP: Removing all existing assets from $ServiceContext..." -ForegroundColor Cyan

# 0. Delete all API Sources (to unlink resources)
Write-Host "  Unlinking API Sources..." -ForegroundColor Gray
$existingSources = az apic api-source list --resource-group $ResourceGroupName --service-name $ServiceContext -o json --allow-preview true | ConvertFrom-Json
foreach ($source in $existingSources) {
    Write-Host "  Deleting API Source: $($source.name)..." -ForegroundColor Gray
    az apic api-source delete --resource-group $ResourceGroupName --service-name $ServiceContext --api-source-name $($source.name) --yes --allow-preview true
}

# 1. Delete all existing APIs
$existingApis = az apic api list --resource-group $ResourceGroupName --service-name $ServiceContext -o json --allow-preview true | ConvertFrom-Json
foreach ($existing in $existingApis) {
    Write-Host "  Deleting API Asset: $($existing.name)..." -ForegroundColor Gray
    az apic api delete --resource-group $ResourceGroupName --service-name $ServiceContext --api-id $($existing.name) --yes --allow-preview true
}

# 2. Delete all existing Environments
$existingEnvs = az apic environment list --resource-group $ResourceGroupName --service-name $ServiceContext -o json --allow-preview true | ConvertFrom-Json
foreach ($env in $existingEnvs) {
    Write-Host "  Deleting Environment: $($env.name)..." -ForegroundColor Gray
    az apic environment delete --resource-group $ResourceGroupName --service-name $ServiceContext --environment-id $($env.name) --yes --allow-preview true
}

Write-Host "Cleanup complete. Recreating all assets..." -ForegroundColor Green
Write-Host "----------------------------------------------------"

foreach ($api in $apiMap) {
    Write-Host "----------------------------------------------------"
    Write-Host "Processing: $($api.title) ($($api.id))" -ForegroundColor Yellow

    # Discover the Function App URL
    $query = "[?tags.Service=='$($api.tag)'].defaultHostName"
    $hostName = az functionapp list --resource-group $ResourceGroupName --query $query -o tsv
    
    if ([string]::IsNullOrWhiteSpace($hostName)) {
        Write-Host "  WARNING: Could not find Function App with tag Service=$($api.tag)" -ForegroundColor Red
        continue
    }

    Write-Host "  Creating API metadata..."
    az apic api create --resource-group $ResourceGroupName --service-name $ServiceContext --api-id $($api.id) --title $($api.title) --type rest --allow-preview true
    
    az apic api version create --resource-group $ResourceGroupName --service-name $ServiceContext --api-id $($api.id) --version-id "v1-0-0" --title "Version 1.0.0" --lifecycle production --allow-preview true
    
    az apic api definition create --resource-group $ResourceGroupName --service-name $ServiceContext --api-id $($api.id) --version-id "v1-0-0" --definition-id "openapi" --title "OpenAPI Definition" --allow-preview true
    
    # Download and REWRITE Swagger
    $swaggerPath = Join-Path $PSScriptRoot "$($api.id)-swagger.json"
    $candidatePaths = @("/api/swagger.json", "/swagger.json")
    $success = $false

    foreach ($path in $candidatePaths) {
        $url = "https://$hostName$path"
        Write-Host "  Downloading spec from: $url..."
        try {
            $json = Invoke-RestMethod -Uri $url -ErrorAction Stop
            
            # REWRITE: Point the Swagger 'servers' to APIM instead of the direct Function App
            $gatewayPath = "$apimUrl/$($api.path)"
            Write-Host "  Rewriting server URL to: $gatewayPath" -ForegroundColor Gray
            $json.servers = @( @{ url = $gatewayPath; description = "APIM Gateway" } )

            # Save rewritten JSON
            $json | ConvertTo-Json -Depth 10 | Out-File -FilePath $swaggerPath -Encoding ascii
            $success = $true
            break
        } catch {
            Write-Host "  Could not download from $url..." -ForegroundColor Gray
        }
    }

    if ($success) {
        try {
            Write-Host "  Importing rewritten spec to API Center..."
            $specJson = '{"name":"openapi","version":"3.0.1"}'
            az apic api definition import-specification --resource-group $ResourceGroupName --service-name $ServiceContext --api-id $($api.id) --version-id "v1-0-0" --definition-id "openapi" --format inline --value "@$swaggerPath" --specification $specJson --allow-preview true
            
            Remove-Item -Path $swaggerPath -ErrorAction SilentlyContinue
            Write-Host "  SUCCESS: $($api.id) is now live in API Center." -ForegroundColor Green
        } catch {
            Write-Host "  ERROR: Failed to import specification for $($api.id)." -ForegroundColor Red
        }
    } else {
        Write-Host "  SKIPPING: Could not find Swagger JSON for $($api.id)." -ForegroundColor Red
    }
}

Write-Host "----------------------------------------------------"
Write-Host "API Center refresh completed successfully!" -ForegroundColor Green
Write-Host "Portal: https://$ServiceContext.portal.eastus.azure-apicenter.ms/"

