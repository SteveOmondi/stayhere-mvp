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
  url_template        = "/verifyotp"
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

resource "azurerm_api_management_api_operation" "property_listings_alias" {
  operation_id        = "get-listings-alias"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Listings (Alias for Properties)"
  method              = "GET"
  url_template        = "/listings/{id}"

  template_parameter {
    name     = "id"
    type     = "string"
    required = true
  }
}

resource "azurerm_api_management_api_operation_policy" "property_listings_alias" {
  api_name            = azurerm_api_management_api_operation.property_listings_alias.api_name
  operation_id        = azurerm_api_management_api_operation.property_listings_alias.operation_id
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name

  xml_content = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/properties/{id}" />
    </inbound>
</policies>
XML
}

resource "azurerm_api_management_api_operation" "property_get_by_id" {
  operation_id        = "get-property-by-id"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Property By ID"
  method              = "GET"
  url_template        = "/properties/{id}"
  template_parameter {
    name     = "id"
    type     = "string"
    required = true
  }
}

resource "azurerm_api_management_api_operation" "property_create" {
  operation_id        = "create-property"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Create Property"
  method              = "POST"
  url_template        = "/properties"
}

resource "azurerm_api_management_api_operation" "listing_list" {
  operation_id        = "get-listings"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get All Listings"
  method              = "GET"
  url_template        = "/listings"
}

resource "azurerm_api_management_api_operation" "listing_search" {
  operation_id        = "search-listings"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Search Listings"
  method              = "POST"
  url_template        = "/listings/search"
}

resource "azurerm_api_management_api_operation" "listing_by_location" {
  operation_id        = "get-listings-by-location"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Listings By Location"
  method              = "GET"
  url_template        = "/listings/by-location"
}

resource "azurerm_api_management_api_operation" "listing_featured" {
  operation_id        = "get-featured-listings"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Featured Listings"
  method              = "GET"
  url_template        = "/listings/featured"
}

resource "azurerm_api_management_api_operation" "listing_by_code" {
  operation_id        = "get-listing-by-code"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Listing By Code"
  method              = "GET"
  url_template        = "/listings/code/{code}"
  template_parameter {
    name     = "code"
    type     = "string"
    required = true
  }
}

resource "azurerm_api_management_api_operation" "listing_availability" {
  operation_id        = "update-listing-availability"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Update Listing Availability"
  method              = "PATCH"
  url_template        = "/listings/{id}/availability"
  template_parameter {
    name     = "id"
    type     = "string"
    required = true
  }
}

resource "azurerm_api_management_api_operation" "listing_rating" {
  operation_id        = "update-listing-rating"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Update Listing Rating"
  method              = "PATCH"
  url_template        = "/listings/{id}/rating"
  template_parameter {
    name     = "id"
    type     = "string"
    required = true
  }
}

resource "azurerm_api_management_api_operation" "listing_view" {
  operation_id        = "increment-listing-views"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Increment Listing Views"
  method              = "POST"
  url_template        = "/listings/{id}/view"
  template_parameter {
    name     = "id"
    type     = "string"
    required = true
  }
}

resource "azurerm_api_management_api_operation" "listing_by_city" {
  operation_id        = "get-listings-by-city"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Listings By City"
  method              = "GET"
  url_template        = "/listings/city/{city}"
  template_parameter {
    name     = "city"
    type     = "string"
    required = true
  }
}

resource "azurerm_api_management_api_operation" "listing_available" {
  operation_id        = "get-available-listings"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Available Listings"
  method              = "GET"
  url_template        = "/listings/available"
}

resource "azurerm_api_management_api_operation" "listing_by_owner" {
  operation_id        = "get-listings-by-owner"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Listings By Owner"
  method              = "GET"
  url_template        = "/listings/owner/{ownerId}"
  template_parameter {
    name     = "ownerId"
    type     = "string"
    required = true
  }
}

resource "azurerm_api_management_api_operation" "listing_by_county" {
  operation_id        = "get-listings-by-county"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Listings By County"
  method              = "GET"
  url_template        = "/listings/county/{county}"
  template_parameter {
    name     = "county"
    type     = "string"
    required = true
  }
}

resource "azurerm_api_management_api_operation" "listing_by_type" {
  operation_id        = "get-listings-by-type"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Listings By Property Type"
  method              = "GET"
  url_template        = "/listings/type/{propertyType}"
  template_parameter {
    name     = "propertyType"
    type     = "string"
    required = true
  }
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

resource "azurerm_api_management_api_operation" "static_user_types" {
  operation_id        = "get-user-types"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get User Types"
  method              = "GET"
  url_template        = "/user-types"
}

resource "azurerm_api_management_api_operation" "static_user_roles" {
  operation_id        = "get-user-roles"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get User Roles"
  method              = "GET"
  url_template        = "/user-roles"
}

resource "azurerm_api_management_api_operation" "static_category_by_id" {
  operation_id        = "get-category-by-id"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Category By ID"
  method              = "GET"
  url_template        = "/categories/{id}"
  template_parameter {
    name     = "id"
    type     = "string"
    required = true
  }
}

resource "azurerm_api_management_api_operation" "static_category_by_city" {
  operation_id        = "get-category-by-city"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Categories By City"
  method              = "GET"
  url_template        = "/categories/city/{city}"
  template_parameter {
    name     = "city"
    type     = "string"
    required = true
  }
}

resource "azurerm_api_management_api_operation" "static_create_category" {
  operation_id        = "create-category"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Create Category"
  method              = "POST"
  url_template        = "/categories"
}

# --- AI AGENT OPERATIONS ---
resource "azurerm_api_management_api_operation" "aiagent_chat" {
  operation_id        = "ai-chat"
  api_name            = azurerm_api_management_api.aiagent.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "AI Agent Chat"
  method              = "POST"
  url_template        = "/chat"
}

resource "azurerm_api_management_api_operation" "aiagent_recommend" {
  operation_id        = "ai-recommend"
  api_name            = azurerm_api_management_api.aiagent.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "AI Agent Recommend"
  method              = "POST"
  url_template        = "/respondandrecommend"
}

resource "azurerm_api_management_api_operation" "aiagent_knowledge_status" {
  operation_id        = "ai-knowledge-status"
  api_name            = azurerm_api_management_api.aiagent.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "AI Agent Knowledge Status"
  method              = "GET"
  url_template        = "/knowledge/status"
}

resource "azurerm_api_management_api_operation" "aiagent_listings" {
  operation_id        = "ai-listings"
  api_name            = azurerm_api_management_api.aiagent.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "AI Agent Search Listings"
  method              = "GET"
  url_template        = "/listings"
}

resource "azurerm_api_management_api_operation" "propertyowner_create" {
  operation_id        = "create-owner"
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Create Property Owner"
  method              = "POST"
  url_template        = "/owners"
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

resource "azurerm_api_management_api_operation" "propertyowner_get_by_id" {
  operation_id        = "get-owner-by-id"
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Owner By ID"
  method              = "GET"
  url_template        = "/owners/{id}"
  template_parameter {
    name     = "id"
    type     = "string"
    required = true
  }
}

resource "azurerm_api_management_api_operation" "propertyowner_wallet" {
  operation_id        = "get-owner-wallet"
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Owner Wallet"
  method              = "GET"
  url_template        = "/owners/{ownerId}/wallet"
  template_parameter {
    name     = "ownerId"
    type     = "string"
    required = true
  }
}

resource "azurerm_api_management_api_operation" "propertyowner_agents" {
  operation_id        = "get-owner-agents"
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Owner Agents"
  method              = "GET"
  url_template        = "/owners/{ownerId}/agents"
  template_parameter {
    name     = "ownerId"
    type     = "string"
    required = true
  }
}

# --- CUSTOMER OPERATIONS ---
resource "azurerm_api_management_api_operation" "customer_create" {
  operation_id        = "create-customer"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Create Customer"
  method              = "POST"
  url_template        = "/customers"
}

resource "azurerm_api_management_api_operation" "customer_list" {
  operation_id        = "get-customers"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Customers"
  method              = "GET"
  url_template        = "/customers/list"
}

resource "azurerm_api_management_api_operation" "customer_get_by_id" {
  operation_id        = "get-customer-by-id"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Customer By ID"
  method              = "GET"
  url_template        = "/customers/{id}"
  template_parameter {
    name     = "id"
    type     = "string"
    required = true
  }
}

resource "azurerm_api_management_api_operation" "customer_by_listing" {
  operation_id        = "get-customers-by-listing"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Customers By Listing"
  method              = "GET"
  url_template        = "/listings/{listingId}/customers"
  template_parameter {
    name     = "listingId"
    type     = "string"
    required = true
  }
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
        <set-header name="X-Original-URL" exists-action="delete" />
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
        <set-header name="X-Original-URL" exists-action="delete" />
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
