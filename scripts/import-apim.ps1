# Terraform Import Script for APIM Operations
# This script helps resolve "AlreadyExists" errors by importing existing resources into the Terraform state.

$Env = "dev"
$Suffix = "5c27bcf3" # Update this with the actual suffix from your deployment
$RG = "rg-stayhere-$Env-$Suffix"
$APIM = "apim-$Env-$Suffix"

# Function to import an operation
function Import-Operation {
    param($ResourceName, $ApiName, $OperationId)
    Write-Host "Attempting to import $ResourceName ($OperationId)..."
    
    try {
        # Pass variables from environment (Azure DevOps) to prevent interactive prompts
        # Use -ErrorAction SilentlyContinue so we can handle the exit code manually
        terraform import -input=false `
            -var="mongodb_atlas_public_key=$($env:MONGODB_ATLAS_PUBLIC_KEY)" `
            -var="mongodb_atlas_private_key=$($env:MONGODB_ATLAS_PRIVATE_KEY)" `
            -var="mongodb_atlas_org_id=$($env:MONGODB_ATLAS_ORG_ID)" `
            -var="skip_auth=$($env:SKIP_AUTH)" `
            -var="openrouter_api_key=$($env:OPENROUTER_API_KEY)" `
            -var="openrouter_model=$($env:OPENROUTER_MODEL)" `
            -var="openrouter_embedding_model=$($env:OPENROUTER_EMBEDDING_MODEL)" `
            -var="onfon_client_id=$($env:ONFON_CLIENT_ID)" `
            -var="onfon_api_key=$($env:ONFON_API_KEY)" `
            -var="onfon_base_url=$($env:ONFON_BASE_URL)" `
            -var="onfon_sender_id=$($env:ONFON_SENDER_ID)" `
            "module.apim.azurerm_api_management_api_operation.$ResourceName" "/subscriptions/039755a5-67c2-48a5-9304-448c909618f6/resourceGroups/$RG/providers/Microsoft.ApiManagement/service/$APIM/apis/$ApiName/operations/$OperationId" 2>&1 | Out-Null
            
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  SUCCESS: Imported $ResourceName" -ForegroundColor Green
        } else {
            Write-Host "  SKIPPED: Resource already managed or not found in config." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ERROR: Failed to process $ResourceName" -ForegroundColor Red
    }
}

# --- Auth API Operations ---
Import-Operation "auth_login" "auth-api" "auth-login"
Import-Operation "auth_signup" "auth-api" "auth-signup"
Import-Operation "auth_verify" "auth-api" "verify-otp"
Import-Operation "auth_onboard" "auth-api" "onboard"
Import-Operation "auth_profiles" "auth-api" "profiles"

# --- Property API Operations ---
Import-Operation "create_property" "property-api" "create-property"
Import-Operation "get_property_by_id" "property-api" "get-property-by-id"
Import-Operation "get_property_by_code" "property-api" "get-property-by-code"
Import-Operation "get_all_properties" "property-api" "get-all-properties"
Import-Operation "get_properties_by_owner" "property-api" "get-properties-by-owner"
Import-Operation "update_property" "property-api" "update-property"
Import-Operation "delete_property" "property-api" "delete-property"

# --- Listing API Operations ---
Import-Operation "create_listing" "property-api" "create-listing"
Import-Operation "get_listing_by_id" "property-api" "get-listing-by-id"
Import-Operation "get_all_listings" "property-api" "get-all-listings"
Import-Operation "search_listings" "property-api" "search-listings"
Import-Operation "update_listing" "property-api" "update-listing"

# --- Customer API Operations ---
Import-Operation "customer_create" "customer-api" "create-customer"
Import-Operation "customer_list" "customer-api" "get-customers"
Import-Operation "customer_get_by_id" "customer-api" "get-customer-by-id"

# --- Static Data Operations ---
Import-Operation "static_categories" "staticdata-api" "get-categories"
Import-Operation "static_all_categories" "staticdata-api" "get-all-categories"
Import-Operation "static_user_types" "staticdata-api" "get-user-types"
Import-Operation "static_user_roles" "staticdata-api" "get-user-roles"

Write-Host "Import process completed successfully."
exit 0
