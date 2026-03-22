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
  service_url         = "https://${var.auth_function_host}"
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
  service_url         = "https://${var.property_function_host}"
  subscription_required = false
}

resource "azurerm_api_management_api" "customer" {
  name                = "customer-api"
  resource_group_name = var.rg_name
  api_management_name = azurerm_api_management.main.name
  revision            = "1"
  display_name        = "Customer API"
  path                = "customer"
  protocols           = ["https"]
  service_url         = "https://${var.customer_function_host}"
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
  service_url         = "https://${var.propertyowner_function_host}"
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
  service_url         = "https://${var.staticdata_function_host}"
  subscription_required = false
}
# --- AUTH OPERATIONS ---
resource "azurerm_api_management_api_operation" "auth_login" {
  operation_id        = "login"
  api_name            = azurerm_api_management_api.auth.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Login"
  method              = "POST"
  url_template        = "/api/Login"
}

resource "azurerm_api_management_api_operation" "auth_verify" {
  operation_id        = "verify-otp"
  api_name            = azurerm_api_management_api.auth.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Verify OTP"
  method              = "POST"
  url_template        = "/api/VerifyOtp"
}

# --- PROPERTY OPERATIONS ---
resource "azurerm_api_management_api_operation" "property_list" {
  operation_id        = "get-properties"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Properties"
  method              = "GET"
  url_template        = "/api/properties"
}

# --- STATIC DATA OPERATIONS ---
resource "azurerm_api_management_api_operation" "static_categories" {
  operation_id        = "get-categories"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Categories"
  method              = "GET"
  url_template        = "/api/categories"
}

# --- CUSTOMER OPERATIONS ---
resource "azurerm_api_management_api_operation" "customer_profile" {
  operation_id        = "get-profile"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Profile"
  method              = "GET"
  url_template        = "/api/customers/profile"
}

# --- PROPERTY OWNER OPERATIONS ---
resource "azurerm_api_management_api_operation" "owner_properties" {
  operation_id        = "get-owner-properties"
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Owner Properties"
  method              = "GET"
  url_template        = "/api/owners/{ownerId}/properties"

  template_parameter {
    name     = "ownerId"
    type     = "string"
    required = true
  }
}

# --- POLICIES TO FIX FORWARDING ---
resource "azurerm_api_management_api_policy" "auth" {
  api_name            = azurerm_api_management_api.auth.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  xml_content = <<XML
<policies>
    <inbound>
        <base />
        <set-header name="Host" exists-action="override">
            <value>${var.auth_function_host}</value>
        </set-header>
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
        <set-header name="Host" exists-action="override">
            <value>${var.property_function_host}</value>
        </set-header>
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
        <set-header name="Host" exists-action="override">
            <value>${var.staticdata_function_host}</value>
        </set-header>
    </inbound>
</policies>
XML
}
