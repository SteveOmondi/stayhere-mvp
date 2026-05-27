# Auto-generated Operations for CustomerService

resource "azurerm_api_management_api_operation" "op_customer_createcustomer" {
  operation_id        = "CreateCustomer"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "CreateCustomer"
  method              = "POST"
  url_template        = "/customers"
}

resource "azurerm_api_management_api_operation_policy" "pol_customer_createcustomer" {
  api_name            = azurerm_api_management_api_operation.op_customer_createcustomer.api_name
  api_management_name = azurerm_api_management_api_operation.op_customer_createcustomer.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_customer_createcustomer.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_customer_createcustomer.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_customer_getcustomers" {
  operation_id        = "GetCustomers"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetCustomers"
  method              = "GET"
  url_template        = "/customers/list"
}

resource "azurerm_api_management_api_operation_policy" "pol_customer_getcustomers" {
  api_name            = azurerm_api_management_api_operation.op_customer_getcustomers.api_name
  api_management_name = azurerm_api_management_api_operation.op_customer_getcustomers.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_customer_getcustomers.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_customer_getcustomers.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_customer_getcustomerbyid" {
  operation_id        = "GetCustomerById"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetCustomerById"
  method              = "GET"
  url_template        = "/customers/{id}"

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_customer_getcustomerbyid" {
  api_name            = azurerm_api_management_api_operation.op_customer_getcustomerbyid.api_name
  api_management_name = azurerm_api_management_api_operation.op_customer_getcustomerbyid.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_customer_getcustomerbyid.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_customer_getcustomerbyid.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_customer_getcustomerbyphone" {
  operation_id        = "GetCustomerByPhone"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetCustomerByPhone"
  method              = "GET"
  url_template        = "/customers/by-phone/{phone}"

  template_parameter {
    name     = "phone"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_customer_getcustomerbyphone" {
  api_name            = azurerm_api_management_api_operation.op_customer_getcustomerbyphone.api_name
  api_management_name = azurerm_api_management_api_operation.op_customer_getcustomerbyphone.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_customer_getcustomerbyphone.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_customer_getcustomerbyphone.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_customer_getcustomersbyregion" {
  operation_id        = "GetCustomersByRegion"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetCustomersByRegion"
  method              = "GET"
  url_template        = "/customers/profile"
}

resource "azurerm_api_management_api_operation_policy" "pol_customer_getcustomersbyregion" {
  api_name            = azurerm_api_management_api_operation.op_customer_getcustomersbyregion.api_name
  api_management_name = azurerm_api_management_api_operation.op_customer_getcustomersbyregion.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_customer_getcustomersbyregion.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_customer_getcustomersbyregion.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_customer_getcustomersbylisting" {
  operation_id        = "GetCustomersByListing"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetCustomersByListing"
  method              = "GET"
  url_template        = "/listings/{listingId}/customers"

  template_parameter {
    name     = "listingId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation" "op_customer_updatecustomer" {
  operation_id        = "UpdateCustomer"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "UpdateCustomer"
  method              = "PUT"
  url_template        = "/customers/{id}"

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_customer_updatecustomer" {
  api_name            = azurerm_api_management_api_operation.op_customer_updatecustomer.api_name
  api_management_name = azurerm_api_management_api_operation.op_customer_updatecustomer.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_customer_updatecustomer.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_customer_updatecustomer.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_customer_deactivatecustomer" {
  operation_id        = "DeactivateCustomer"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "DeactivateCustomer"
  method              = "POST"
  url_template        = "/customers/{id}/deactivate"

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_customer_deactivatecustomer" {
  api_name            = azurerm_api_management_api_operation.op_customer_deactivatecustomer.api_name
  api_management_name = azurerm_api_management_api_operation.op_customer_deactivatecustomer.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_customer_deactivatecustomer.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_customer_deactivatecustomer.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_customer_attachcustomerproperty" {
  operation_id        = "AttachCustomerProperty"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "AttachCustomerProperty"
  method              = "POST"
  url_template        = "/customers/{customerId}/properties"

  template_parameter {
    name     = "customerId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_customer_attachcustomerproperty" {
  api_name            = azurerm_api_management_api_operation.op_customer_attachcustomerproperty.api_name
  api_management_name = azurerm_api_management_api_operation.op_customer_attachcustomerproperty.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_customer_attachcustomerproperty.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_customer_attachcustomerproperty.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_customer_getcustomerproperties" {
  operation_id        = "GetCustomerProperties"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetCustomerProperties"
  method              = "GET"
  url_template        = "/customers/{customerId}/properties"

  template_parameter {
    name     = "customerId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_customer_getcustomerproperties" {
  api_name            = azurerm_api_management_api_operation.op_customer_getcustomerproperties.api_name
  api_management_name = azurerm_api_management_api_operation.op_customer_getcustomerproperties.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_customer_getcustomerproperties.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_customer_getcustomerproperties.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_customer_addcustomerdocument" {
  operation_id        = "AddCustomerDocument"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "AddCustomerDocument"
  method              = "POST"
  url_template        = "/customers/{customerId}/documents"

  template_parameter {
    name     = "customerId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_customer_addcustomerdocument" {
  api_name            = azurerm_api_management_api_operation.op_customer_addcustomerdocument.api_name
  api_management_name = azurerm_api_management_api_operation.op_customer_addcustomerdocument.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_customer_addcustomerdocument.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_customer_addcustomerdocument.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_customer_getcustomerdocuments" {
  operation_id        = "GetCustomerDocuments"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetCustomerDocuments"
  method              = "GET"
  url_template        = "/customers/{customerId}/documents"

  template_parameter {
    name     = "customerId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_customer_getcustomerdocuments" {
  api_name            = azurerm_api_management_api_operation.op_customer_getcustomerdocuments.api_name
  api_management_name = azurerm_api_management_api_operation.op_customer_getcustomerdocuments.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_customer_getcustomerdocuments.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_customer_getcustomerdocuments.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

