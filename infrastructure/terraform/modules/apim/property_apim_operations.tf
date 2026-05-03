# ──────────────────────────────────────────────
# CREATE
# ──────────────────────────────────────────────

resource "azurerm_api_management_api_operation" "create_property" {
  operation_id        = "create-property"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Create Property"
  method              = "POST"
  url_template        = "/properties"
}

# ──────────────────────────────────────────────
# READ
# ──────────────────────────────────────────────

resource "azurerm_api_management_api_operation" "get_property_by_id" {
  operation_id        = "get-property-by-id"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Property by ID"
  method              = "GET"
  url_template        = "/properties/{id}"

  template_parameter {
    name        = "id"
    required    = true
    type        = "string"
    description = "Property GUID"
  }
}

resource "azurerm_api_management_api_operation" "get_property_by_code" {
  operation_id        = "get-property-by-code"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Property by Code"
  method              = "GET"
  url_template        = "/properties/code/{code}"

  template_parameter {
    name        = "code"
    required    = true
    type        = "string"
    description = "Property code"
  }
}

resource "azurerm_api_management_api_operation" "get_all_properties" {
  operation_id        = "get-all-properties"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get All Properties"
  method              = "GET"
  url_template        = "/properties"
}

resource "azurerm_api_management_api_operation" "get_properties_by_owner" {
  operation_id        = "get-properties-by-owner"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Properties by Owner"
  method              = "GET"
  url_template        = "/properties/owner/{ownerId}"

  template_parameter {
    name        = "ownerId"
    required    = true
    type        = "string"
    description = "Owner GUID"
  }
}

# ──────────────────────────────────────────────
# UPDATE
# ──────────────────────────────────────────────

resource "azurerm_api_management_api_operation" "update_property" {
  operation_id        = "update-property"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Update Property"
  method              = "PUT"
  url_template        = "/properties/{id}"

  template_parameter {
    name        = "id"
    required    = true
    type        = "string"
    description = "Property GUID"
  }
}

# ──────────────────────────────────────────────
# DELETE
# ──────────────────────────────────────────────

resource "azurerm_api_management_api_operation" "delete_property" {
  operation_id        = "delete-property"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Delete Property"
  method              = "DELETE"
  url_template        = "/properties/{id}"

  template_parameter {
    name        = "id"
    required    = true
    type        = "string"
    description = "Property GUID"
  }
}
