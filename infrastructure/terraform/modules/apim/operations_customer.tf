# Auto-generated Operations for CustomerService

resource "azurerm_api_management_api_operation" "op_customer_createcustomer" {
  operation_id        = "CreateCustomer"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "CreateCustomer"
  method              = "POST"
  url_template        = "/"
  depends_on          = [azurerm_api_management_api_policy.customer]
}

resource "azurerm_api_management_api_operation_policy" "pol_customer_createcustomer" {
  api_name            = azurerm_api_management_api_operation.op_customer_createcustomer.api_name
  api_management_name = azurerm_api_management_api_operation.op_customer_createcustomer.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_customer_createcustomer.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_customer_createcustomer.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/customers" />
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
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
XML
}

resource "azurerm_api_management_api_operation" "op_customer_getcustomers" {
  operation_id        = "GetCustomers"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetCustomers"
  method              = "GET"
  url_template        = "/list"
  depends_on          = [azurerm_api_management_api_policy.customer]
}

resource "azurerm_api_management_api_operation_policy" "pol_customer_getcustomers" {
  api_name            = azurerm_api_management_api_operation.op_customer_getcustomers.api_name
  api_management_name = azurerm_api_management_api_operation.op_customer_getcustomers.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_customer_getcustomers.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_customer_getcustomers.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/customers/list" />
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
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
XML
}

resource "azurerm_api_management_api_operation" "op_customer_getcustomerbyid" {
  operation_id        = "GetCustomerById"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetCustomerById"
  method              = "GET"
  url_template        = "/{id}"
  depends_on          = [azurerm_api_management_api_policy.customer]

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
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/customers/{id}" />
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
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
XML
}

resource "azurerm_api_management_api_operation" "op_customer_getcustomerbyphone" {
  operation_id        = "GetCustomerByPhone"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetCustomerByPhone"
  method              = "GET"
  url_template        = "/by-phone/{phone}"
  depends_on          = [azurerm_api_management_api_policy.customer]

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
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/customers/by-phone/{phone}" />
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
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
XML
}

resource "azurerm_api_management_api_operation" "op_customer_getcustomersbyregion" {
  operation_id        = "GetCustomersByRegion"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetCustomersByRegion"
  method              = "GET"
  url_template        = "/profile"
  depends_on          = [azurerm_api_management_api_policy.customer]
}

resource "azurerm_api_management_api_operation_policy" "pol_customer_getcustomersbyregion" {
  api_name            = azurerm_api_management_api_operation.op_customer_getcustomersbyregion.api_name
  api_management_name = azurerm_api_management_api_operation.op_customer_getcustomersbyregion.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_customer_getcustomersbyregion.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_customer_getcustomersbyregion.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/customers/profile" />
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
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
XML
}

resource "azurerm_api_management_api_operation" "op_customer_getcustomersbyowner" {
  operation_id        = "GetCustomersByOwner"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetCustomersByOwner"
  method              = "GET"
  url_template        = "/by-owner/{ownerId}"
  depends_on          = [azurerm_api_management_api_policy.customer]

  template_parameter {
    name     = "ownerId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_customer_getcustomersbyowner" {
  api_name            = azurerm_api_management_api_operation.op_customer_getcustomersbyowner.api_name
  api_management_name = azurerm_api_management_api_operation.op_customer_getcustomersbyowner.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_customer_getcustomersbyowner.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_customer_getcustomersbyowner.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/customers/by-owner/{ownerId}" />
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
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
XML
}

resource "azurerm_api_management_api_operation" "op_customer_getcustomersbyproperty" {
  operation_id        = "GetCustomersByProperty"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetCustomersByProperty"
  method              = "GET"
  url_template        = "/by-property/{propertyId}"
  depends_on          = [azurerm_api_management_api_policy.customer]

  template_parameter {
    name     = "propertyId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_customer_getcustomersbyproperty" {
  api_name            = azurerm_api_management_api_operation.op_customer_getcustomersbyproperty.api_name
  api_management_name = azurerm_api_management_api_operation.op_customer_getcustomersbyproperty.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_customer_getcustomersbyproperty.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_customer_getcustomersbyproperty.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/customers/by-property/{propertyId}" />
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
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
XML
}

resource "azurerm_api_management_api_operation" "op_customer_getcustomersbylisting" {
  operation_id        = "GetCustomersByListing"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetCustomersByListing"
  method              = "GET"
  url_template        = "/listings/{listingId}/customers"
  depends_on          = [azurerm_api_management_api_policy.customer]

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
  url_template        = "/{id}"
  depends_on          = [azurerm_api_management_api_policy.customer]

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
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/customers/{id}" />
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
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
XML
}

resource "azurerm_api_management_api_operation" "op_customer_deactivatecustomer" {
  operation_id        = "DeactivateCustomer"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "DeactivateCustomer"
  method              = "POST"
  url_template        = "/{id}/deactivate"
  depends_on          = [azurerm_api_management_api_policy.customer]

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
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/customers/{id}/deactivate" />
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
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
XML
}

resource "azurerm_api_management_api_operation" "op_customer_attachcustomerproperty" {
  operation_id        = "AttachCustomerProperty"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "AttachCustomerProperty"
  method              = "POST"
  url_template        = "/{customerId}/properties"
  depends_on          = [azurerm_api_management_api_policy.customer]

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
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/customers/{customerId}/properties" />
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
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
XML
}

resource "azurerm_api_management_api_operation" "op_customer_getcustomerproperties" {
  operation_id        = "GetCustomerProperties"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetCustomerProperties"
  method              = "GET"
  url_template        = "/{customerId}/properties"
  depends_on          = [azurerm_api_management_api_policy.customer]

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
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/customers/{customerId}/properties" />
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
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
XML
}

resource "azurerm_api_management_api_operation" "op_customer_addcustomerdocument" {
  operation_id        = "AddCustomerDocument"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "AddCustomerDocument"
  method              = "POST"
  url_template        = "/{customerId}/documents"
  depends_on          = [azurerm_api_management_api_policy.customer]

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
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/customers/{customerId}/documents" />
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
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
XML
}

resource "azurerm_api_management_api_operation" "op_customer_getcustomerdocuments" {
  operation_id        = "GetCustomerDocuments"
  api_name            = azurerm_api_management_api.customer.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetCustomerDocuments"
  method              = "GET"
  url_template        = "/{customerId}/documents"
  depends_on          = [azurerm_api_management_api_policy.customer]

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
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/customers/{customerId}/documents" />
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
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
XML
}

