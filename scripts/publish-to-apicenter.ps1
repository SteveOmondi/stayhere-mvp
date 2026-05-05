# Publish APIs to Azure API Center
# This script registers and updates the OpenAPI definitions for all StayHere services in the API Center portal.

param(
    [string]$ResourceGroupName = "rg-stayhere-dev-5c27bcf3",
    [string]$ServiceContext = "apim-dev-5c27bcf3-apic",
    [string]$Workspace = "default"
)

$apiMap = @(
    @{ id = "auth-api"; title = "Auth Service"; tag = "AuthService" },
    @{ id = "property-api"; title = "Property Service"; tag = "PropertyService" },
    @{ id = "customer-api"; title = "Customer Service"; tag = "CustomerService" },
    @{ id = "propertyowner-api"; title = "Property Owner Service"; tag = "PropertyOwnerService" },
    @{ id = "staticdata-api"; title = "Static Data Service"; tag = "StaticDataService" },
    @{ id = "aiagent-api"; title = "AI Agent Service"; tag = "AiAgentService" }
)

Write-Host "Starting API Center registration for $ServiceContext..." -ForegroundColor Cyan

foreach ($api in $apiMap) {
    Write-Host "----------------------------------------------------"
    Write-Host "Processing: $($api.title) ($($api.id))" -ForegroundColor Yellow

    # Discover the Function App URL dynamically using Tags
    Write-Host "  Discovering Function App for $($api.tag)..."
    $query = "[?tags.Service=='$($api.tag)'].defaultHostName"
    $hostName = az functionapp list --resource-group $ResourceGroupName --query $query -o tsv
    
    if ([string]::IsNullOrWhiteSpace($hostName)) {
        Write-Host "  WARNING: Could not find Function App with tag Service=$($api.tag) in $ResourceGroupName" -ForegroundColor Red
        continue
    }

    
    # Ensure the API exists
    Write-Host "  Registering API..."
    az apic api create --resource-group $ResourceGroupName --service-name $ServiceContext --api-id $($api.id) --title $($api.title) --type rest
    
    # Create or update the version
    Write-Host "  Defining Version v1-0-0..."
    az apic api version create --resource-group $ResourceGroupName --service-name $ServiceContext --api-id $($api.id) --version-id "v1-0-0" --title "Version 1.0.0" --lifecycle production
    
    # Create or update the definition
    Write-Host "  Preparing OpenAPI Definition..."
    az apic api definition create --resource-group $ResourceGroupName --service-name $ServiceContext --api-id $($api.id) --version-id "v1-0-0" --definition-id "openapi" --title "OpenAPI Definition"
    
    # Download the JSON to a local file first
    $swaggerPath = Join-Path $PSScriptRoot "$($api.id)-swagger.json"
    $candidatePaths = @("/api/swagger.json", "/swagger.json")
    $success = $false

    foreach ($path in $candidatePaths) {
        $url = "https://$hostName$path"
        Write-Host "  Trying: $url..."
        try {
            Invoke-WebRequest -Uri $url -OutFile $swaggerPath -ErrorAction Stop
            Write-Host "  SUCCESS: Found swagger at $url" -ForegroundColor Green
            $success = $true
            break
        } catch {
            Write-Host "  Not found at $url..." -ForegroundColor Gray
        }
    }

    if ($success) {
        try {
            # Import the specification as INLINE content
            Write-Host "  Pushing specification to API Center..."
            $specJson = '{"name":"openapi","version":"3.0.1"}'
            az apic api definition import-specification --resource-group $ResourceGroupName --service-name $ServiceContext --api-id $($api.id) --version-id "v1-0-0" --definition-id "openapi" --format inline --value "@$swaggerPath" --specification $specJson
            
            Remove-Item -Path $swaggerPath -ErrorAction SilentlyContinue
        } catch {
            Write-Host "  ERROR: Failed to import specification for $($api.id)." -ForegroundColor Red
        }
    } else {
        Write-Host "  WARNING: Could not find Swagger JSON at any of the candidate paths for $($api.id)." -ForegroundColor Red
        Write-Host "  SKIPPING registration." -ForegroundColor Yellow
    }
}

Write-Host "----------------------------------------------------"
Write-Host "API Center registration completed successfully!" -ForegroundColor Green
Write-Host "Documentation Portal: https://$ServiceContext.portal.eastus.azure-apicenter.ms/"
