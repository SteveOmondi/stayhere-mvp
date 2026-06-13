resource "azurerm_api_management" "main" {
  name                = "apim-${var.environment}-${var.suffix}"
  location            = var.location
  resource_group_name = var.rg_name
  publisher_name      = var.publisher_name
  publisher_email     = var.publisher_email

  sku_name = "Consumption_0"
}

resource "azurerm_api_management_api" "auth_api" {
  name                = "auth-api"
  resource_group_name = var.rg_name
  api_management_name = azurerm_api_management.main.name
  revision            = "1"
  display_name        = "Auth API"
  path                = "auth"
  protocols           = ["https"]
  service_url         = "https://${var.auth_function_host}/api"
  subscription_required = false
}

resource "azurerm_api_management_api" "property" {
  name                = "property-api"
  resource_group_name = var.rg_name
  api_management_name = azurerm_api_management.main.name
  revision            = "1"
  display_name        = "Property API"
  path                = "property"
  protocols           = ["https"]
  service_url         = "https://${var.property_function_host}/api"
  subscription_required = false
}

resource "azurerm_api_management_api" "customer" {
  name                = "customer-api"
  resource_group_name = var.rg_name
  api_management_name = azurerm_api_management.main.name
  revision            = "1"
  display_name        = "Customer API"
  path                = "customers"
  protocols           = ["https"]
  service_url         = "https://${var.customer_function_host}/api"
  subscription_required = false
}

resource "azurerm_api_management_api" "propertyowner" {
  name                = "propertyowner-api"
  resource_group_name = var.rg_name
  api_management_name = azurerm_api_management.main.name
  revision            = "1"
  display_name        = "Property Owner API"
  path                = "propertyowner"
  protocols           = ["https"]
  service_url         = "https://${var.propertyowner_function_host}/api"
  subscription_required = false
}

resource "azurerm_api_management_api" "staticdata" {
  name                = "staticdata-api"
  resource_group_name = var.rg_name
  api_management_name = azurerm_api_management.main.name
  revision            = "1"
  display_name        = "Static Data API"
  path                = "staticdata"
  protocols           = ["https"]
  service_url         = "https://${var.staticdata_function_host}/api"
  subscription_required = false
}

resource "azurerm_api_management_api" "aiagent" {
  name                = "aiagent-api"
  resource_group_name = var.rg_name
  api_management_name = azurerm_api_management.main.name
  revision            = "1"
  display_name        = "AI Agent API"
  path                = "aiagent"
  protocols           = ["https"]
  service_url         = "https://${var.aiagent_function_host}/api"
  subscription_required = false
}

# NOTICE: All API operations are managed dynamically by
# scripts/sync-apim-operations.ps1 â€” which reads live Swagger specs and
# auto-creates/deletes/secures operations in APIM on every deploy.
# DO NOT add azurerm_api_management_api_operation resources manually.
# The API shell resources above (service_url, path, policies) are Terraform-owned.

# =============================================================================
# OPERATIONS ARE DYNAMICALLY MANAGED â€” DO NOT ADD OPERATIONS HERE
# =============================================================================
# All azurerm_api_management_api_operation resources are managed by:
#   scripts/sync-apim-operations.ps1
#
# That script runs after every deploy and:
#   - Downloads live Swagger from each Function App
#   - Diffs against current APIM operations
#   - Creates new operations, deletes removed ones
#   - Applies JWT security per scripts/apim-security-map.psd1
#
# Terraform owns: API shells, host-header policies, named values.
# sync-apim-operations.ps1 owns: individual operations + operation policies.
# =============================================================================

# --- AI AGENT OPERATIONS ---

# --- CUSTOMER OPERATIONS ---

# --- PROPERTY OWNER OPERATIONS ---

# --- GLOBAL FORWARDING POLICIES (Host Header Override) ---
resource "azurerm_api_management_api_policy" "auth" {
  api_name            = azurerm_api_management_api.auth_api.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  xml_content = <<XML
<policies>
    <inbound>
        <base />
        <set-header name="Host" exists-action="override"><value>${var.auth_function_host}</value></set-header>
        <set-header name="X-Original-URL" exists-action="delete" />
        <set-header name="X-WAWS-Unencoded-URL" exists-action="delete" />
    </inbound>
</policies>
XML
}

resource "azurerm_api_management_api_policy" "property" {
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  xml_content = <<XML
<policies>
    <inbound>
        <base />
        <set-header name="Host" exists-action="override"><value>${var.property_function_host}</value></set-header>
        <set-header name="X-Original-URL" exists-action="delete" />
        <set-header name="X-WAWS-Unencoded-URL" exists-action="delete" />
    </inbound>
</policies>
XML
}

resource "azurerm_api_management_api_policy" "customer" {
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  xml_content = <<XML
<policies>
    <inbound>
        <base />
        <set-header name="Host" exists-action="override"><value>${var.customer_function_host}</value></set-header>
        <set-header name="X-Original-URL" exists-action="delete" />
        <set-header name="X-WAWS-Unencoded-URL" exists-action="delete" />
    </inbound>
</policies>
XML
}

resource "azurerm_api_management_api_policy" "propertyowner" {
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  xml_content = <<XML
<policies>
    <inbound>
        <base />
        <set-header name="Host" exists-action="override"><value>${var.propertyowner_function_host}</value></set-header>
        <set-header name="X-Original-URL" exists-action="delete" />
        <set-header name="X-WAWS-Unencoded-URL" exists-action="delete" />
    </inbound>
</policies>
XML
}

resource "azurerm_api_management_api_policy" "staticdata" {
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  xml_content = <<XML
<policies>
    <inbound>
        <base />
        <set-header name="Host" exists-action="override"><value>${var.staticdata_function_host}</value></set-header>
        <set-header name="X-Original-URL" exists-action="delete" />
        <set-header name="X-WAWS-Unencoded-URL" exists-action="delete" />
    </inbound>
</policies>
XML
}

resource "azurerm_api_management_api_policy" "aiagent" {
  api_name            = azurerm_api_management_api.aiagent.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  xml_content = <<XML
<policies>
    <inbound>
        <base />
        <set-header name="Host" exists-action="override"><value>${var.aiagent_function_host}</value></set-header>
        <set-header name="X-Original-URL" exists-action="delete" />
        <set-header name="X-WAWS-Unencoded-URL" exists-action="delete" />
    </inbound>
</policies>
XML
}

resource "azurerm_api_management_named_value" "entra_client_id" {
  name                = "entra-client-id"
  resource_group_name = var.rg_name
  api_management_name = azurerm_api_management.main.name
  display_name        = "ENTRA_CLIENT_ID"
  value               = var.entra_client_id != "" ? var.entra_client_id : "REPLACE_ME"
}

resource "azurerm_api_management_named_value" "jwt_secret" {
  name                = "jwt-secret"
  resource_group_name = var.rg_name
  api_management_name = azurerm_api_management.main.name
  display_name        = "jwt-secret"
  value               = "U3RheUhlcmVNdHBTZWN1cmVKV1RLZXkyMDI2IVNlY3JldA==" # Base64 of StayHereMvpSecureJWTKey2026!Secret
  secret              = true
}

resource "azurerm_api_management_named_value" "entra_tenant_id" {
  name                = "entra-tenant-id"
  resource_group_name = var.rg_name
  api_management_name = azurerm_api_management.main.name
  display_name        = "ENTRA_TENANT_ID"
  value               = var.entra_tenant_id != "" ? var.entra_tenant_id : "REPLACE_ME"
}

resource "azurerm_api_management_named_value" "onfon_client_id" {
  name                = "onfon-client-id"
  resource_group_name = var.rg_name
  api_management_name = azurerm_api_management.main.name
  display_name        = "ONFON_CLIENT_ID"
  value               = var.onfon_client_id
}

resource "azurerm_api_management_named_value" "onfon_sender_id" {
  name                = "onfon-sender-id"
  resource_group_name = var.rg_name
  api_management_name = azurerm_api_management.main.name
  display_name        = "ONFON_SENDER_ID"
  value               = var.onfon_sender_id
}

resource "azurerm_api_management_policy" "global" {
  api_management_id = azurerm_api_management.main.id

  xml_content = <<XML
<policies>
    <inbound>
        <cors allow-credentials="true">
            <allowed-origins>
                <origin>${trimsuffix(var.admin_portal_url, "/")}</origin>
                <origin>${trimsuffix(var.owner_portal_url, "/")}</origin>
                <origin>http://localhost:5100</origin>
                <origin>http://localhost:5101</origin>
                <origin>http://localhost:5173</origin>
                <origin>http://localhost:5174</origin>
            </allowed-origins>
            <allowed-methods preflight-max-age="300">
                <method>GET</method>
                <method>POST</method>
                <method>PUT</method>
                <method>DELETE</method>
                <method>OPTIONS</method>
                <method>PATCH</method>
            </allowed-methods>
            <allowed-headers>
                <header>*</header>
            </allowed-headers>
            <expose-headers>
                <header>*</header>
            </expose-headers>
        </cors>
    </inbound>
    <backend />
    <outbound />
    <on-error />
</policies>
XML
}
