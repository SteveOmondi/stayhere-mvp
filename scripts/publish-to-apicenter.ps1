# Publish APIs to Azure API Center
# This script registers and updates the OpenAPI definitions for all StayHere services in the API Center portal.

param(
    [string]$ResourceGroupName = "rg-stayhere-dev-5c27bcf3",
    [string]$ServiceContext = "apim-dev-5c27bcf3-apic",
    [string]$Workspace = "default"
)

$apis = @(
    @{ name = "auth-api"; title = "Auth Service"; url = "https://func-dev-auth-5c27bcf3.azurewebsites.net/api/swagger.json" },
    @{ name = "property-api"; title = "Property Service"; url = "https://func-dev-property-5c27bcf3.azurewebsites.net/api/swagger.json" },
    @{ name = "customer-api"; title = "Customer Service"; url = "https://func-dev-customer-5c27bcf3.azurewebsites.net/api/swagger.json" },
    @{ name = "propertyowner-api"; title = "Property Owner Service"; url = "https://func-dev-propertyowner-5c27bcf3.azurewebsites.net/api/swagger.json" },
    @{ name = "staticdata-api"; title = "Static Data Service"; url = "https://func-dev-staticdata-5c27bcf3.azurewebsites.net/api/swagger.json" },
    @{ name = "aiagent-api"; title = "AI Agent Service"; url = "https://func-dev-aiagent-5c27bcf3.azurewebsites.net/api/swagger.json" }
)

Write-Host "Starting API Center registration for $ServiceContext..." -ForegroundColor Cyan

foreach ($api in $apis) {
    Write-Host "----------------------------------------------------"
    Write-Host "Processing: $($api.title) ($($api.name))" -ForegroundColor Yellow
    
    # Ensure the API exists
    Write-Host "  Registering API..."
    az apic api create --resource-group $ResourceGroupName --service-name $ServiceContext --api-id $($api.name) --title $($api.title) --type rest
    
    # Create or update the version
    Write-Host "  Defining Version v1-0-0..."
    az apic api version create --resource-group $ResourceGroupName --service-name $ServiceContext --api-id $($api.name) --version-id "v1-0-0" --title "Version 1.0.0" --lifecycle production
    
    # Create or update the definition
    Write-Host "  Importing OpenAPI Specification from URL..."
    az apic api definition create --resource-group $ResourceGroupName --service-name $ServiceContext --api-id $($api.name) --version-id "v1-0-0" --definition-id "openapi" --title "OpenAPI Definition"
    
    # Import the specification from the URL
    $specJson = '{"name":"openapi","version":"3.0.1"}'
    az apic api definition import-specification --resource-group $ResourceGroupName --service-name $ServiceContext --api-id $($api.name) --version-id "v1-0-0" --definition-id "openapi" --format link --value $($api.url) --specification $specJson
}

Write-Host "----------------------------------------------------"
Write-Host "API Center registration completed successfully!" -ForegroundColor Green
Write-Host "Documentation Portal: https://$ServiceContext.portal.eastus.azure-apicenter.ms/"
