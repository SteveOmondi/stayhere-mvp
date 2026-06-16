# Auto-generated Operations for PropertyService

resource "azurerm_api_management_api_operation" "op_property_createtenantapplication" {
  operation_id        = "CreateTenantApplication"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "CreateTenantApplication"
  method              = "POST"
  url_template        = "/applications"
  depends_on          = [azurerm_api_management_api_policy.property]
}

resource "azurerm_api_management_api_operation_policy" "pol_property_createtenantapplication" {
  api_name            = azurerm_api_management_api_operation.op_property_createtenantapplication.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_createtenantapplication.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_createtenantapplication.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_createtenantapplication.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_gettenantapplication" {
  operation_id        = "GetTenantApplication"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetTenantApplication"
  method              = "GET"
  url_template        = "/applications/{id}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_gettenantapplication" {
  api_name            = azurerm_api_management_api_operation.op_property_gettenantapplication.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_gettenantapplication.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_gettenantapplication.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_gettenantapplication.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_getapplicationsbycustomer" {
  operation_id        = "GetApplicationsByCustomer"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetApplicationsByCustomer"
  method              = "GET"
  url_template        = "/applications/customer/{customerId}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "customerId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_getapplicationsbycustomer" {
  api_name            = azurerm_api_management_api_operation.op_property_getapplicationsbycustomer.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_getapplicationsbycustomer.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_getapplicationsbycustomer.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_getapplicationsbycustomer.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_getapplicationsbylisting" {
  operation_id        = "GetApplicationsByListing"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetApplicationsByListing"
  method              = "GET"
  url_template        = "/applications/listing/{listingId}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "listingId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_getapplicationsbylisting" {
  api_name            = azurerm_api_management_api_operation.op_property_getapplicationsbylisting.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_getapplicationsbylisting.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_getapplicationsbylisting.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_getapplicationsbylisting.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_getapplicationsbyowner" {
  operation_id        = "GetApplicationsByOwner"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetApplicationsByOwner"
  method              = "GET"
  url_template        = "/applications/owner/{ownerId}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "ownerId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_getapplicationsbyowner" {
  api_name            = azurerm_api_management_api_operation.op_property_getapplicationsbyowner.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_getapplicationsbyowner.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_getapplicationsbyowner.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_getapplicationsbyowner.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_addapplicationdocument" {
  operation_id        = "AddApplicationDocument"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "AddApplicationDocument"
  method              = "POST"
  url_template        = "/applications/{id}/documents"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_addapplicationdocument" {
  api_name            = azurerm_api_management_api_operation.op_property_addapplicationdocument.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_addapplicationdocument.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_addapplicationdocument.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_addapplicationdocument.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_submitapplicationforreview" {
  operation_id        = "SubmitApplicationForReview"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "SubmitApplicationForReview"
  method              = "PATCH"
  url_template        = "/applications/{id}/submit"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_submitapplicationforreview" {
  api_name            = azurerm_api_management_api_operation.op_property_submitapplicationforreview.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_submitapplicationforreview.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_submitapplicationforreview.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_submitapplicationforreview.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_reviewapplication" {
  operation_id        = "ReviewApplication"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "ReviewApplication"
  method              = "PATCH"
  url_template        = "/applications/{id}/review"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_reviewapplication" {
  api_name            = azurerm_api_management_api_operation.op_property_reviewapplication.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_reviewapplication.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_reviewapplication.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_reviewapplication.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_acceptapplicationterms" {
  operation_id        = "AcceptApplicationTerms"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "AcceptApplicationTerms"
  method              = "PATCH"
  url_template        = "/applications/{id}/accept-terms"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_acceptapplicationterms" {
  api_name            = azurerm_api_management_api_operation.op_property_acceptapplicationterms.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_acceptapplicationterms.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_acceptapplicationterms.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_acceptapplicationterms.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_cancelapplication" {
  operation_id        = "CancelApplication"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "CancelApplication"
  method              = "PATCH"
  url_template        = "/applications/{id}/cancel"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_cancelapplication" {
  api_name            = azurerm_api_management_api_operation.op_property_cancelapplication.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_cancelapplication.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_cancelapplication.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_cancelapplication.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_createviewingbooking" {
  operation_id        = "CreateViewingBooking"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "CreateViewingBooking"
  method              = "POST"
  url_template        = "/bookings"
  depends_on          = [azurerm_api_management_api_policy.property]
}

resource "azurerm_api_management_api_operation_policy" "pol_property_createviewingbooking" {
  api_name            = azurerm_api_management_api_operation.op_property_createviewingbooking.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_createviewingbooking.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_createviewingbooking.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_createviewingbooking.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_getviewingbooking" {
  operation_id        = "GetViewingBooking"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetViewingBooking"
  method              = "GET"
  url_template        = "/bookings/{id}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_getviewingbooking" {
  api_name            = azurerm_api_management_api_operation.op_property_getviewingbooking.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_getviewingbooking.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_getviewingbooking.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_getviewingbooking.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_getbookingsbycustomer" {
  operation_id        = "GetBookingsByCustomer"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetBookingsByCustomer"
  method              = "GET"
  url_template        = "/bookings/customer/{customerId}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "customerId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_getbookingsbycustomer" {
  api_name            = azurerm_api_management_api_operation.op_property_getbookingsbycustomer.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_getbookingsbycustomer.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_getbookingsbycustomer.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_getbookingsbycustomer.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_getbookingsbylisting" {
  operation_id        = "GetBookingsByListing"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetBookingsByListing"
  method              = "GET"
  url_template        = "/bookings/listing/{listingId}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "listingId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_getbookingsbylisting" {
  api_name            = azurerm_api_management_api_operation.op_property_getbookingsbylisting.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_getbookingsbylisting.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_getbookingsbylisting.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_getbookingsbylisting.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_getbookingsbyowner" {
  operation_id        = "GetBookingsByOwner"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetBookingsByOwner"
  method              = "GET"
  url_template        = "/bookings/owner/{ownerId}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "ownerId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_getbookingsbyowner" {
  api_name            = azurerm_api_management_api_operation.op_property_getbookingsbyowner.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_getbookingsbyowner.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_getbookingsbyowner.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_getbookingsbyowner.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_confirmviewingbooking" {
  operation_id        = "ConfirmViewingBooking"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "ConfirmViewingBooking"
  method              = "PATCH"
  url_template        = "/bookings/{id}/confirm"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_confirmviewingbooking" {
  api_name            = azurerm_api_management_api_operation.op_property_confirmviewingbooking.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_confirmviewingbooking.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_confirmviewingbooking.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_confirmviewingbooking.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_cancelviewingbooking" {
  operation_id        = "CancelViewingBooking"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "CancelViewingBooking"
  method              = "PATCH"
  url_template        = "/bookings/{id}/cancel"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_cancelviewingbooking" {
  api_name            = azurerm_api_management_api_operation.op_property_cancelviewingbooking.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_cancelviewingbooking.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_cancelviewingbooking.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_cancelviewingbooking.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_completeviewingbooking" {
  operation_id        = "CompleteViewingBooking"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "CompleteViewingBooking"
  method              = "PATCH"
  url_template        = "/bookings/{id}/complete"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_completeviewingbooking" {
  api_name            = azurerm_api_management_api_operation.op_property_completeviewingbooking.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_completeviewingbooking.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_completeviewingbooking.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_completeviewingbooking.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_getonboardinginfo" {
  operation_id        = "GetOnboardingInfo"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetOnboardingInfo"
  method              = "GET"
  url_template        = "/applications/{id}/onboarding"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_getonboardinginfo" {
  api_name            = azurerm_api_management_api_operation.op_property_getonboardinginfo.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_getonboardinginfo.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_getonboardinginfo.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_getonboardinginfo.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_createpropertyterms" {
  operation_id        = "CreatePropertyTerms"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "CreatePropertyTerms"
  method              = "POST"
  url_template        = "/listings/{listingId}/terms"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "listingId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_createpropertyterms" {
  api_name            = azurerm_api_management_api_operation.op_property_createpropertyterms.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_createpropertyterms.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_createpropertyterms.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_createpropertyterms.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_updatepropertyterms" {
  operation_id        = "UpdatePropertyTerms"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "UpdatePropertyTerms"
  method              = "PUT"
  url_template        = "/listings/{listingId}/terms/{id}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "listingId"
    required = true
    type     = "string"
  }
  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_updatepropertyterms" {
  api_name            = azurerm_api_management_api_operation.op_property_updatepropertyterms.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_updatepropertyterms.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_updatepropertyterms.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_updatepropertyterms.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_getlistingterms" {
  operation_id        = "GetListingTerms"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetListingTerms"
  method              = "GET"
  url_template        = "/listings/{listingId}/terms"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "listingId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation" "op_property_gettermsbyid" {
  operation_id        = "GetTermsById"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetTermsById"
  method              = "GET"
  url_template        = "/terms/{id}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_gettermsbyid" {
  api_name            = azurerm_api_management_api_operation.op_property_gettermsbyid.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_gettermsbyid.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_gettermsbyid.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_gettermsbyid.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_deletepropertyterms" {
  operation_id        = "DeletePropertyTerms"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "DeletePropertyTerms"
  method              = "DELETE"
  url_template        = "/terms/{id}"
  depends_on          = [azurerm_api_management_api_policy.property]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_property_deletepropertyterms" {
  api_name            = azurerm_api_management_api_operation.op_property_deletepropertyterms.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_deletepropertyterms.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_deletepropertyterms.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_deletepropertyterms.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_getpresigneduploadurl" {
  operation_id        = "GetPresignedUploadUrl"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetPresignedUploadUrl"
  method              = "POST"
  url_template        = "/upload/presigned-url"
  depends_on          = [azurerm_api_management_api_policy.property]
}

resource "azurerm_api_management_api_operation_policy" "pol_property_getpresigneduploadurl" {
  api_name            = azurerm_api_management_api_operation.op_property_getpresigneduploadurl.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_getpresigneduploadurl.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_getpresigneduploadurl.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_getpresigneduploadurl.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_uploadfile" {
  operation_id        = "UploadFile"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "UploadFile"
  method              = "POST"
  url_template        = "/upload/file"
  depends_on          = [azurerm_api_management_api_policy.property]
}

resource "azurerm_api_management_api_operation_policy" "pol_property_uploadfile" {
  api_name            = azurerm_api_management_api_operation.op_property_uploadfile.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_uploadfile.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_uploadfile.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_uploadfile.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_property_getpublicurl" {
  operation_id        = "GetPublicUrl"
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetPublicUrl"
  method              = "GET"
  url_template        = "/upload/url"
  depends_on          = [azurerm_api_management_api_policy.property]
}

resource "azurerm_api_management_api_operation_policy" "pol_property_getpublicurl" {
  api_name            = azurerm_api_management_api_operation.op_property_getpublicurl.api_name
  api_management_name = azurerm_api_management_api_operation.op_property_getpublicurl.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_property_getpublicurl.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_property_getpublicurl.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

