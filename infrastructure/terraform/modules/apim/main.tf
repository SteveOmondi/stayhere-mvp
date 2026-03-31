resource "azurerm_api_management" "main" {
  name                = "apim-${var.environment}-${var.suffix}"
  location            = var.location
  resource_group_name = var.rg_name
  publisher_name      = var.publisher_name
  publisher_email     = var.publisher_email

  sku_name = "Consumption_0"
}

resource "azurerm_api_management_api" "auth" {
  name                = "auth-api"
  resource_group_name = var.rg_name
  api_management_name = azurerm_api_management.main.name
  revision            = "1"
  display_name        = "Auth API"
  path                = "auth"
  protocols           = ["https"]
  service_url         = "https://${var.auth_function_host}/api/auth"
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

# --- AUTH OPERATIONS ---
resource "azurerm_api_management_api_operation" "auth_signup" {
  operation_id        = "signup"
  api_name            = azurerm_api_management_api.auth.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Signup"
  method              = "POST"
  url_template        = "/signup"
}

resource "azurerm_api_management_api_operation" "auth_login" {
  operation_id        = "login"
  api_name            = azurerm_api_management_api.auth.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Login"
  method              = "POST"
  url_template        = "/login"
}

resource "azurerm_api_management_api_operation" "auth_verify" {
  operation_id        = "verify-otp"
  api_name            = azurerm_api_management_api.auth.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Verify OTP"
  method              = "POST"
}

resource "azurerm_api_management_api_operation" "auth_onboard" {
  operation_id        = "onboard"
  api_name            = azurerm_api_management_api.auth.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Onboard User"
  method              = "POST"
  url_template        = "/onboard"
}

resource "azurerm_api_management_api_operation" "auth_profiles" {
  operation_id        = "profiles"
  api_name            = azurerm_api_management_api.auth.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get User Profiles"
  method              = "GET"
  url_template        = "/profiles/{userId}"
  
  template_parameter {
    name     = "userId"
    type     = "string"
    required = true
  }
}

# --- PROPERTY OPERATIONS ---
resource "azurerm_api_management_api_operation" "property_list" {
  operation_id        = "get-properties"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Properties"
  method              = "GET"
  url_template        = "/properties"
}


# --- STATIC DATA OPERATIONS ---
resource "azurerm_api_management_api_operation" "static_categories" {
  operation_id        = "get-categories"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Categories"
  method              = "GET"
  url_template        = "/categories"
}

resource "azurerm_api_management_api_operation" "static_all_categories" {
  operation_id        = "get-all-categories"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get All Categories"
  method              = "GET"
  url_template        = "/categories/all"
}

resource "azurerm_api_management_api_operation" "propertyowner_list" {
  operation_id        = "get-owners"
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get All Owners"
  method              = "GET"
  url_template        = "/owners"
}

# --- CUSTOMER OPERATIONS ---
resource "azurerm_api_management_api_operation" "customer_list" {
  operation_id        = "get-customers"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Customers"
  method              = "GET"
  url_template        = "/list"
}

resource "azurerm_api_management_api_operation_policy" "customer_list" {
  api_name            = azurerm_api_management_api_operation.customer_list.api_name
  operation_id        = azurerm_api_management_api_operation.customer_list.operation_id
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name

  xml_content = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/customers" />
    </inbound>
</policies>
XML
}

# --- PROPERTY OWNER OPERATIONS ---
resource "azurerm_api_management_api_operation" "owner_properties" {
  operation_id        = "get-owner-properties"
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Owner Properties"
  method              = "GET"
  url_template        = "/owners/{ownerId}/properties"

  template_parameter {
    name     = "ownerId"
    type     = "string"
    required = true
  }
}

# --- GLOBAL FORWARDING POLICIES (Host Header Override) ---
resource "azurerm_api_management_api_policy" "auth" {
  api_name            = azurerm_api_management_api.auth.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  xml_content = <<XML
<policies>
    <inbound>
        <base />
        <set-header name="Host" exists-action="override"><value>${var.auth_function_host}</value></set-header>
        <set-header name="X-Original-URL" exists-action="delete" />
        <!-- Placeholder for Entra ID Validation -->
        <!-- <validate-jwt header-name="Authorization" failed-validation-httpcode="401" ... /> -->
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
        <rewrite-uri template="/api{relative-url}" />
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
        <rewrite-uri template="/api{relative-url}" />
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

resource "azurerm_api_management_named_value" "entra_tenant_id" {
  name                = "entra-tenant-id"
  resource_group_name = var.rg_name
  api_management_name = azurerm_api_management.main.name
  display_name        = "ENTRA_TENANT_ID"
  value               = var.entra_tenant_id != "" ? var.entra_tenant_id : "REPLACE_ME"
}
