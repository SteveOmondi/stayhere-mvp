# Auto-generated Operations for PropertyOwnerService

resource "azurerm_api_management_api_operation" "op_propertyowner_createpropertyowner" {
  operation_id        = "CreatePropertyOwner"
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "CreatePropertyOwner"
  method              = "POST"
  url_template        = "/owners"
}

resource "azurerm_api_management_api_operation_policy" "pol_propertyowner_createpropertyowner" {
  api_name            = azurerm_api_management_api_operation.op_propertyowner_createpropertyowner.api_name
  api_management_name = azurerm_api_management_api_operation.op_propertyowner_createpropertyowner.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_propertyowner_createpropertyowner.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_propertyowner_createpropertyowner.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_propertyowner_getpropertyownerbyid" {
  operation_id        = "GetPropertyOwnerById"
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetPropertyOwnerById"
  method              = "GET"
  url_template        = "/owners/{id}"

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_propertyowner_getpropertyownerbyid" {
  api_name            = azurerm_api_management_api_operation.op_propertyowner_getpropertyownerbyid.api_name
  api_management_name = azurerm_api_management_api_operation.op_propertyowner_getpropertyownerbyid.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_propertyowner_getpropertyownerbyid.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_propertyowner_getpropertyownerbyid.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_propertyowner_getpropertyownerbyuserid" {
  operation_id        = "GetPropertyOwnerByUserId"
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetPropertyOwnerByUserId"
  method              = "GET"
  url_template        = "/owners/user/{userId}"

  template_parameter {
    name     = "userId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_propertyowner_getpropertyownerbyuserid" {
  api_name            = azurerm_api_management_api_operation.op_propertyowner_getpropertyownerbyuserid.api_name
  api_management_name = azurerm_api_management_api_operation.op_propertyowner_getpropertyownerbyuserid.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_propertyowner_getpropertyownerbyuserid.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_propertyowner_getpropertyownerbyuserid.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_propertyowner_getpropertyownerbyemail" {
  operation_id        = "GetPropertyOwnerByEmail"
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetPropertyOwnerByEmail"
  method              = "GET"
  url_template        = "/owners/email/{email}"

  template_parameter {
    name     = "email"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_propertyowner_getpropertyownerbyemail" {
  api_name            = azurerm_api_management_api_operation.op_propertyowner_getpropertyownerbyemail.api_name
  api_management_name = azurerm_api_management_api_operation.op_propertyowner_getpropertyownerbyemail.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_propertyowner_getpropertyownerbyemail.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_propertyowner_getpropertyownerbyemail.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_propertyowner_updatepropertyowner" {
  operation_id        = "UpdatePropertyOwner"
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "UpdatePropertyOwner"
  method              = "PUT"
  url_template        = "/owners/{id}"

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_propertyowner_updatepropertyowner" {
  api_name            = azurerm_api_management_api_operation.op_propertyowner_updatepropertyowner.api_name
  api_management_name = azurerm_api_management_api_operation.op_propertyowner_updatepropertyowner.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_propertyowner_updatepropertyowner.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_propertyowner_updatepropertyowner.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_propertyowner_getownerwallet" {
  operation_id        = "GetOwnerWallet"
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetOwnerWallet"
  method              = "GET"
  url_template        = "/owners/{ownerId}/wallet"

  template_parameter {
    name     = "ownerId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_propertyowner_getownerwallet" {
  api_name            = azurerm_api_management_api_operation.op_propertyowner_getownerwallet.api_name
  api_management_name = azurerm_api_management_api_operation.op_propertyowner_getownerwallet.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_propertyowner_getownerwallet.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_propertyowner_getownerwallet.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_propertyowner_getownerproperties" {
  operation_id        = "GetOwnerProperties"
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetOwnerProperties"
  method              = "GET"
  url_template        = "/owners/{ownerId}/properties"

  template_parameter {
    name     = "ownerId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_propertyowner_getownerproperties" {
  api_name            = azurerm_api_management_api_operation.op_propertyowner_getownerproperties.api_name
  api_management_name = azurerm_api_management_api_operation.op_propertyowner_getownerproperties.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_propertyowner_getownerproperties.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_propertyowner_getownerproperties.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_propertyowner_getownerlistings" {
  operation_id        = "GetOwnerListings"
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetOwnerListings"
  method              = "GET"
  url_template        = "/owners/{ownerId}/listings"

  template_parameter {
    name     = "ownerId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_propertyowner_getownerlistings" {
  api_name            = azurerm_api_management_api_operation.op_propertyowner_getownerlistings.api_name
  api_management_name = azurerm_api_management_api_operation.op_propertyowner_getownerlistings.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_propertyowner_getownerlistings.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_propertyowner_getownerlistings.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_propertyowner_createagent" {
  operation_id        = "CreateAgent"
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "CreateAgent"
  method              = "POST"
  url_template        = "/owners/{ownerId}/agents"

  template_parameter {
    name     = "ownerId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_propertyowner_createagent" {
  api_name            = azurerm_api_management_api_operation.op_propertyowner_createagent.api_name
  api_management_name = azurerm_api_management_api_operation.op_propertyowner_createagent.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_propertyowner_createagent.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_propertyowner_createagent.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_propertyowner_getagentbyid" {
  operation_id        = "GetAgentById"
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetAgentById"
  method              = "GET"
  url_template        = "/agents/{id}"

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_propertyowner_getagentbyid" {
  api_name            = azurerm_api_management_api_operation.op_propertyowner_getagentbyid.api_name
  api_management_name = azurerm_api_management_api_operation.op_propertyowner_getagentbyid.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_propertyowner_getagentbyid.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_propertyowner_getagentbyid.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_propertyowner_getowneragents" {
  operation_id        = "GetOwnerAgents"
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetOwnerAgents"
  method              = "GET"
  url_template        = "/owners/{ownerId}/agents"

  template_parameter {
    name     = "ownerId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_propertyowner_getowneragents" {
  api_name            = azurerm_api_management_api_operation.op_propertyowner_getowneragents.api_name
  api_management_name = azurerm_api_management_api_operation.op_propertyowner_getowneragents.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_propertyowner_getowneragents.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_propertyowner_getowneragents.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_propertyowner_createcaretaker" {
  operation_id        = "CreateCaretaker"
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "CreateCaretaker"
  method              = "POST"
  url_template        = "/owners/{ownerId}/caretakers"

  template_parameter {
    name     = "ownerId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_propertyowner_createcaretaker" {
  api_name            = azurerm_api_management_api_operation.op_propertyowner_createcaretaker.api_name
  api_management_name = azurerm_api_management_api_operation.op_propertyowner_createcaretaker.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_propertyowner_createcaretaker.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_propertyowner_createcaretaker.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_propertyowner_getcaretakerbyid" {
  operation_id        = "GetCaretakerById"
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetCaretakerById"
  method              = "GET"
  url_template        = "/caretakers/{id}"

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_propertyowner_getcaretakerbyid" {
  api_name            = azurerm_api_management_api_operation.op_propertyowner_getcaretakerbyid.api_name
  api_management_name = azurerm_api_management_api_operation.op_propertyowner_getcaretakerbyid.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_propertyowner_getcaretakerbyid.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_propertyowner_getcaretakerbyid.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_propertyowner_getownercaretakers" {
  operation_id        = "GetOwnerCaretakers"
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetOwnerCaretakers"
  method              = "GET"
  url_template        = "/owners/{ownerId}/caretakers"

  template_parameter {
    name     = "ownerId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_propertyowner_getownercaretakers" {
  api_name            = azurerm_api_management_api_operation.op_propertyowner_getownercaretakers.api_name
  api_management_name = azurerm_api_management_api_operation.op_propertyowner_getownercaretakers.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_propertyowner_getownercaretakers.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_propertyowner_getownercaretakers.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_propertyowner_getownersportaldirectory" {
  operation_id        = "GetOwnersPortalDirectory"
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetOwnersPortalDirectory"
  method              = "GET"
  url_template        = "/owners/portal-directory"
}

resource "azurerm_api_management_api_operation_policy" "pol_propertyowner_getownersportaldirectory" {
  api_name            = azurerm_api_management_api_operation.op_propertyowner_getownersportaldirectory.api_name
  api_management_name = azurerm_api_management_api_operation.op_propertyowner_getownersportaldirectory.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_propertyowner_getownersportaldirectory.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_propertyowner_getownersportaldirectory.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_propertyowner_getowners" {
  operation_id        = "GetOwners"
  api_name            = azurerm_api_management_api.propertyowner.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetOwners"
  method              = "GET"
  url_template        = "/owners"
}

resource "azurerm_api_management_api_operation_policy" "pol_propertyowner_getowners" {
  api_name            = azurerm_api_management_api_operation.op_propertyowner_getowners.api_name
  api_management_name = azurerm_api_management_api_operation.op_propertyowner_getowners.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_propertyowner_getowners.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_propertyowner_getowners.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

