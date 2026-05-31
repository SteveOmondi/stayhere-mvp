# Auto-generated Operations for PropertyService

resource "azurerm_api_management_api_operation" "op_property_createlisting" {
  operation_id        = "CreateListing"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "CreateListing"
  method              = "POST"
  url_template        = "/listings"
  depends_on          = [azurerm_api_management_api_policy.property]
}

resource "azurerm_api_management_api_operation_policy" "pol_property_createlisting" {
  api_name            = azurerm_api_management_api_operation.op_property_createlisting.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_createlisting.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_createlisting.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_createlisting.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_property_createlistingfromproperty" {
  operation_id        = "CreateListingFromProperty"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "CreateListingFromProperty"
  method              = "POST"
  url_template        = "/properties/{propertyId}/listings"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "propertyId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_createlistingfromproperty" {
  api_name            = azurerm_api_management_api_operation.op_property_createlistingfromproperty.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_createlistingfromproperty.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_createlistingfromproperty.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_createlistingfromproperty.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_property_getlistingbyid" {
  operation_id        = "GetListingById"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetListingById"
  method              = "GET"
  url_template        = "/listings/{id}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation" "op_property_getlistingbycode" {
  operation_id        = "GetListingByCode"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetListingByCode"
  method              = "GET"
  url_template        = "/listings/code/{code}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "code"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation" "op_property_getalllistings" {
  operation_id        = "GetAllListings"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetAllListings"
  method              = "GET"
  url_template        = "/listings"
  depends_on          = [azurerm_api_management_api_policy.property]
}

resource "azurerm_api_management_api_operation" "op_property_getlistingsbyproperty" {
  operation_id        = "GetListingsByProperty"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetListingsByProperty"
  method              = "GET"
  url_template        = "/listings/property/{propertyId}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "propertyId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation" "op_property_getlistingsbyowner" {
  operation_id        = "GetListingsByOwner"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetListingsByOwner"
  method              = "GET"
  url_template        = "/listings/owner/{ownerId}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "ownerId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_getlistingsbyowner" {
  api_name            = azurerm_api_management_api_operation.op_property_getlistingsbyowner.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_getlistingsbyowner.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_getlistingsbyowner.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_getlistingsbyowner.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_property_getlistingsbycity" {
  operation_id        = "GetListingsByCity"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetListingsByCity"
  method              = "GET"
  url_template        = "/listings/city/{city}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "city"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation" "op_property_getlistingsbycounty" {
  operation_id        = "GetListingsByCounty"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetListingsByCounty"
  method              = "GET"
  url_template        = "/listings/county/{county}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "county"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation" "op_property_getlistingsbylocation" {
  operation_id        = "GetListingsByLocation"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetListingsByLocation"
  method              = "GET"
  url_template        = "/listings/by-location"
  depends_on          = [azurerm_api_management_api_policy.property]
}

resource "azurerm_api_management_api_operation" "op_property_getlistingsbytype" {
  operation_id        = "GetListingsByType"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetListingsByType"
  method              = "GET"
  url_template        = "/listings/type/{propertyType}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "propertyType"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation" "op_property_getlistingsbylistingtype" {
  operation_id        = "GetListingsByListingType"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetListingsByListingType"
  method              = "GET"
  url_template        = "/listings/listing-type/{listingType}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "listingType"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation" "op_property_getfeaturedlistings" {
  operation_id        = "GetFeaturedListings"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetFeaturedListings"
  method              = "GET"
  url_template        = "/listings/featured"
  depends_on          = [azurerm_api_management_api_policy.property]
}

resource "azurerm_api_management_api_operation" "op_property_getavailablelistings" {
  operation_id        = "GetAvailableListings"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetAvailableListings"
  method              = "GET"
  url_template        = "/listings/available"
  depends_on          = [azurerm_api_management_api_policy.property]
}

resource "azurerm_api_management_api_operation" "op_property_searchlistings" {
  operation_id        = "SearchListings"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "SearchListings"
  method              = "POST"
  url_template        = "/listings/search"
  depends_on          = [azurerm_api_management_api_policy.property]
}

resource "azurerm_api_management_api_operation" "op_property_updatelisting" {
  operation_id        = "UpdateListing"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "UpdateListing"
  method              = "PUT"
  url_template        = "/listings/{id}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_updatelisting" {
  api_name            = azurerm_api_management_api_operation.op_property_updatelisting.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_updatelisting.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_updatelisting.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_updatelisting.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_property_regeneratelistingembedding" {
  operation_id        = "RegenerateListingEmbedding"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "RegenerateListingEmbedding"
  method              = "POST"
  url_template        = "/listings/{id}/embedding"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_regeneratelistingembedding" {
  api_name            = azurerm_api_management_api_operation.op_property_regeneratelistingembedding.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_regeneratelistingembedding.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_regeneratelistingembedding.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_regeneratelistingembedding.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_property_updatelistingavailability" {
  operation_id        = "UpdateListingAvailability"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "UpdateListingAvailability"
  method              = "PATCH"
  url_template        = "/listings/{id}/availability"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_updatelistingavailability" {
  api_name            = azurerm_api_management_api_operation.op_property_updatelistingavailability.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_updatelistingavailability.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_updatelistingavailability.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_updatelistingavailability.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_property_updatelistingrating" {
  operation_id        = "UpdateListingRating"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "UpdateListingRating"
  method              = "PATCH"
  url_template        = "/listings/{id}/rating"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation" "op_property_incrementlistingviews" {
  operation_id        = "IncrementListingViews"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "IncrementListingViews"
  method              = "POST"
  url_template        = "/listings/{id}/view"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation" "op_property_updatelistingfeatured" {
  operation_id        = "UpdateListingFeatured"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "UpdateListingFeatured"
  method              = "PATCH"
  url_template        = "/listings/{id}/featured"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_updatelistingfeatured" {
  api_name            = azurerm_api_management_api_operation.op_property_updatelistingfeatured.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_updatelistingfeatured.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_updatelistingfeatured.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_updatelistingfeatured.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_property_assignlistingagent" {
  operation_id        = "AssignListingAgent"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "AssignListingAgent"
  method              = "POST"
  url_template        = "/listings/{id}/agent"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_assignlistingagent" {
  api_name            = azurerm_api_management_api_operation.op_property_assignlistingagent.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_assignlistingagent.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_assignlistingagent.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_assignlistingagent.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_property_removelistingagent" {
  operation_id        = "RemoveListingAgent"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "RemoveListingAgent"
  method              = "DELETE"
  url_template        = "/listings/{id}/agent"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_removelistingagent" {
  api_name            = azurerm_api_management_api_operation.op_property_removelistingagent.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_removelistingagent.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_removelistingagent.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_removelistingagent.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_property_assignlistingcaretaker" {
  operation_id        = "AssignListingCaretaker"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "AssignListingCaretaker"
  method              = "POST"
  url_template        = "/listings/{id}/caretaker"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_assignlistingcaretaker" {
  api_name            = azurerm_api_management_api_operation.op_property_assignlistingcaretaker.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_assignlistingcaretaker.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_assignlistingcaretaker.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_assignlistingcaretaker.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_property_removelistingcaretaker" {
  operation_id        = "RemoveListingCaretaker"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "RemoveListingCaretaker"
  method              = "DELETE"
  url_template        = "/listings/{id}/caretaker"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_removelistingcaretaker" {
  api_name            = azurerm_api_management_api_operation.op_property_removelistingcaretaker.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_removelistingcaretaker.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_removelistingcaretaker.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_removelistingcaretaker.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_property_deletelisting" {
  operation_id        = "DeleteListing"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "DeleteListing"
  method              = "DELETE"
  url_template        = "/listings/{id}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_deletelisting" {
  api_name            = azurerm_api_management_api_operation.op_property_deletelisting.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_deletelisting.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_deletelisting.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_deletelisting.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_property_createproperty" {
  operation_id        = "CreateProperty"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "CreateProperty"
  method              = "POST"
  url_template        = "/properties"
  depends_on          = [azurerm_api_management_api_policy.property]
}

resource "azurerm_api_management_api_operation_policy" "pol_property_createproperty" {
  api_name            = azurerm_api_management_api_operation.op_property_createproperty.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_createproperty.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_createproperty.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_createproperty.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_property_getpropertybyid" {
  operation_id        = "GetPropertyById"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetPropertyById"
  method              = "GET"
  url_template        = "/properties/{id}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation" "op_property_getpropertybycode" {
  operation_id        = "GetPropertyByCode"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetPropertyByCode"
  method              = "GET"
  url_template        = "/properties/code/{code}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "code"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation" "op_property_getallproperties" {
  operation_id        = "GetAllProperties"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetAllProperties"
  method              = "GET"
  url_template        = "/properties"
  depends_on          = [azurerm_api_management_api_policy.property]
}

resource "azurerm_api_management_api_operation" "op_property_getpropertiesbyowner" {
  operation_id        = "GetPropertiesByOwner"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetPropertiesByOwner"
  method              = "GET"
  url_template        = "/properties/owner/{ownerId}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "ownerId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_getpropertiesbyowner" {
  api_name            = azurerm_api_management_api_operation.op_property_getpropertiesbyowner.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_getpropertiesbyowner.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_getpropertiesbyowner.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_getpropertiesbyowner.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_property_updateproperty" {
  operation_id        = "UpdateProperty"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "UpdateProperty"
  method              = "PUT"
  url_template        = "/properties/{id}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_updateproperty" {
  api_name            = azurerm_api_management_api_operation.op_property_updateproperty.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_updateproperty.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_updateproperty.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_updateproperty.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_property_deleteproperty" {
  operation_id        = "DeleteProperty"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "DeleteProperty"
  method              = "DELETE"
  url_template        = "/properties/{id}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_deleteproperty" {
  api_name            = azurerm_api_management_api_operation.op_property_deleteproperty.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_deleteproperty.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_deleteproperty.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_deleteproperty.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

