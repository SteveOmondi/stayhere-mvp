
# --- PROTECTED OPERATIONS POLICIES ---
# This file contains JWT validation for sensitive endpoints only.

locals {
  jwt_policy = <<XML
<policies>
    <inbound>
        <base />
        <validate-jwt header-name="Authorization" failed-validation-httpcode="401" failed-validation-error-message="Unauthorized. Access token is missing or invalid.">
            <issuer-signing-keys>
                <key>{{jwt-secret}}</key>
            </issuer-signing-keys>
            <audiences>
                <audience>stayhere-mvp</audience>
            </audiences>
            <issuers>
                <issuer>stayhere-auth-service</issuer>
            </issuers>
        </validate-jwt>
    </inbound>
</policies>
XML
}

# --- CUSTOMER PROTECTION ---
resource "azurerm_api_management_api_operation_policy" "customer_list" {
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  operation_id        = azurerm_api_management_api_operation.customer_list.operation_id
  xml_content         = local.jwt_policy
}

resource "azurerm_api_management_api_operation_policy" "customer_get" {
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  operation_id        = azurerm_api_management_api_operation.customer_get_by_id.operation_id
  xml_content         = local.jwt_policy
}

# --- PROPERTY OWNER PROTECTION ---
resource "azurerm_api_management_api_operation_policy" "owner_list" {
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  operation_id        = azurerm_api_management_api_operation.propertyowner_list.operation_id
  xml_content         = local.jwt_policy
}

resource "azurerm_api_management_api_operation_policy" "owner_wallet" {
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  operation_id        = azurerm_api_management_api_operation.propertyowner_wallet.operation_id
  xml_content         = local.jwt_policy
}

# --- PROPERTY MANAGEMENT PROTECTION ---
resource "azurerm_api_management_api_operation_policy" "create_listing" {
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  operation_id        = "create-listing"
  xml_content         = local.jwt_policy
}

resource "azurerm_api_management_api_operation_policy" "owner_listings" {
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  operation_id        = "get-listings-by-owner"
  xml_content         = local.jwt_policy
}

# --- AUTH PROTECTION ---
resource "azurerm_api_management_api_operation_policy" "auth_profiles" {
  api_name            = azurerm_api_management_api.auth_api.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  operation_id        = azurerm_api_management_api_operation.auth_profiles.operation_id
  xml_content         = local.jwt_policy
}
