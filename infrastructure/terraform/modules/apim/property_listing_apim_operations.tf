# ──────────────────────────────────────────────
# CREATE
# ──────────────────────────────────────────────

resource "azurerm_api_management_api_operation" "create_listing" {
  operation_id        = "create-listing"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Create Listing"
  method              = "POST"
  url_template        = "/listings"
}

resource "azurerm_api_management_api_operation" "create_listing_from_property" {
  operation_id        = "create-listing-from-property"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Create Listing from Property"
  method              = "POST"
  url_template        = "/properties/{propertyId}/listings"

  template_parameter {
    name        = "propertyId"
    required    = true
    type        = "string"
    description = "Property GUID"
  }
}

# ──────────────────────────────────────────────
# READ (single)
# ──────────────────────────────────────────────

resource "azurerm_api_management_api_operation" "get_listing_by_id" {
  operation_id        = "get-listing-by-id"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Listing by ID"
  method              = "GET"
  url_template        = "/listings/{id}"

  template_parameter {
    name        = "id"
    required    = true
    type        = "string"
    description = "Listing GUID"
  }
}

resource "azurerm_api_management_api_operation" "get_listing_by_code" {
  operation_id        = "get-listing-by-code"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Listing by Code"
  method              = "GET"
  url_template        = "/listings/code/{code}"

  template_parameter {
    name        = "code"
    required    = true
    type        = "string"
    description = "Listing code"
  }
}

# ──────────────────────────────────────────────
# READ (collections)
# ──────────────────────────────────────────────

# NOTE: GET /listings already exists as "property_list" in your codebase — skipped.

resource "azurerm_api_management_api_operation" "get_listings_by_property" {
  operation_id        = "get-listings-by-property"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Listings by Property"
  method              = "GET"
  url_template        = "/listings/property/{propertyId}"

  template_parameter {
    name        = "propertyId"
    required    = true
    type        = "string"
    description = "Property GUID"
  }
}

resource "azurerm_api_management_api_operation" "get_listings_by_owner" {
  operation_id        = "get-listings-by-owner"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Listings by Owner"
  method              = "GET"
  url_template        = "/listings/owner/{ownerId}"

  template_parameter {
    name        = "ownerId"
    required    = true
    type        = "string"
    description = "Owner GUID"
  }
}

resource "azurerm_api_management_api_operation" "get_listings_by_city" {
  operation_id        = "get-listings-by-city"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Listings by City"
  method              = "GET"
  url_template        = "/listings/city/{city}"

  template_parameter {
    name        = "city"
    required    = true
    type        = "string"
    description = "City name"
  }
}

resource "azurerm_api_management_api_operation" "get_listings_by_county" {
  operation_id        = "get-listings-by-county"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Listings by County"
  method              = "GET"
  url_template        = "/listings/county/{county}"

  template_parameter {
    name        = "county"
    required    = true
    type        = "string"
    description = "County name"
  }
}

resource "azurerm_api_management_api_operation" "get_listings_by_type" {
  operation_id        = "get-listings-by-type"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Listings by Property Type"
  method              = "GET"
  url_template        = "/listings/type/{propertyType}"

  template_parameter {
    name        = "propertyType"
    required    = true
    type        = "string"
    description = "Property type"
  }
}

resource "azurerm_api_management_api_operation" "get_listings_by_listing_type" {
  operation_id        = "get-listings-by-listing-type"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Listings by Listing Type"
  method              = "GET"
  url_template        = "/listings/listing-type/{listingType}"

  template_parameter {
    name        = "listingType"
    required    = true
    type        = "string"
    description = "Listing type"
  }
}

resource "azurerm_api_management_api_operation" "get_featured_listings" {
  operation_id        = "get-featured-listings"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Featured Listings"
  method              = "GET"
  url_template        = "/api/listings/featured"
}

resource "azurerm_api_management_api_operation" "get_available_listings" {
  operation_id        = "get-available-listings"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get Available Listings"
  method              = "GET"
  url_template        = "/api/listings/available"
}

resource "azurerm_api_management_api_operation" "get_all_listings" {
  operation_id        = "get-all-listings"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Get All Listings"
  method              = "GET"
  url_template        = "/listings"
}

# ──────────────────────────────────────────────
# SEARCH
# ──────────────────────────────────────────────

resource "azurerm_api_management_api_operation" "search_listings" {
  operation_id        = "search-listings"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Search Listings"
  method              = "POST"
  url_template        = "/listings/search"
}

# ──────────────────────────────────────────────
# UPDATE
# ──────────────────────────────────────────────

resource "azurerm_api_management_api_operation" "update_listing" {
  operation_id        = "update-listing"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Update Listing"
  method              = "PUT"
  url_template        = "/listings/{id}"

  template_parameter {
    name        = "id"
    required    = true
    type        = "string"
    description = "Listing GUID"
  }
}

resource "azurerm_api_management_api_operation" "update_listing_availability" {
  operation_id        = "update-listing-availability"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Update Listing Availability"
  method              = "PATCH"
  url_template        = "/listings/{id}/availability"

  template_parameter {
    name        = "id"
    required    = true
    type        = "string"
    description = "Listing GUID"
  }
}

resource "azurerm_api_management_api_operation" "update_listing_rating" {
  operation_id        = "update-listing-rating"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Update Listing Rating"
  method              = "PATCH"
  url_template        = "/listings/{id}/rating"

  template_parameter {
    name        = "id"
    required    = true
    type        = "string"
    description = "Listing GUID"
  }
}

resource "azurerm_api_management_api_operation" "update_listing_featured" {
  operation_id        = "update-listing-featured"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Update Listing Featured Status"
  method              = "PATCH"
  url_template        = "/listings/{id}/featured"

  template_parameter {
    name        = "id"
    required    = true
    type        = "string"
    description = "Listing GUID"
  }
}

resource "azurerm_api_management_api_operation" "increment_listing_views" {
  operation_id        = "increment-listing-views"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Increment Listing Views"
  method              = "POST"
  url_template        = "/listings/{id}/view"

  template_parameter {
    name        = "id"
    required    = true
    type        = "string"
    description = "Listing GUID"
  }
}

# ──────────────────────────────────────────────
# AGENT
# ──────────────────────────────────────────────

resource "azurerm_api_management_api_operation" "assign_listing_agent" {
  operation_id        = "assign-listing-agent"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Assign Listing Agent"
  method              = "POST"
  url_template        = "/listings/{id}/agent"

  template_parameter {
    name        = "id"
    required    = true
    type        = "string"
    description = "Listing GUID"
  }
}

resource "azurerm_api_management_api_operation" "remove_listing_agent" {
  operation_id        = "remove-listing-agent"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Remove Listing Agent"
  method              = "DELETE"
  url_template        = "/listings/{id}/agent"

  template_parameter {
    name        = "id"
    required    = true
    type        = "string"
    description = "Listing GUID"
  }
}

# ──────────────────────────────────────────────
# CARETAKER
# ──────────────────────────────────────────────

resource "azurerm_api_management_api_operation" "assign_listing_caretaker" {
  operation_id        = "assign-listing-caretaker"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Assign Listing Caretaker"
  method              = "POST"
  url_template        = "/listings/{id}/caretaker"

  template_parameter {
    name        = "id"
    required    = true
    type        = "string"
    description = "Listing GUID"
  }
}

resource "azurerm_api_management_api_operation" "remove_listing_caretaker" {
  operation_id        = "remove-listing-caretaker"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Remove Listing Caretaker"
  method              = "DELETE"
  url_template        = "/listings/{id}/caretaker"

  template_parameter {
    name        = "id"
    required    = true
    type        = "string"
    description = "Listing GUID"
  }
}

# ──────────────────────────────────────────────
# DELETE
# ──────────────────────────────────────────────

resource "azurerm_api_management_api_operation" "delete_listing" {
  operation_id        = "delete-listing"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Delete Listing"
  method              = "DELETE"
  url_template        = "/listings/{id}"

  template_parameter {
    name        = "id"
    required    = true
    type        = "string"
    description = "Listing GUID"
  }
}
