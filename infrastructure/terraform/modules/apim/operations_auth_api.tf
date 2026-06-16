# Auto-generated Operations for AuthService

resource "azurerm_api_management_api_operation" "op_auth_api_signup" {
  operation_id        = "Signup"
  api_name            = azurerm_api_management_api.auth_api.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Signup"
  method              = "POST"
  url_template        = "/signup"
  depends_on          = [azurerm_api_management_api_policy.auth]
}

resource "azurerm_api_management_api_operation_policy" "pol_auth_api_signup" {
  api_name            = azurerm_api_management_api_operation.op_auth_api_signup.api_name
  api_management_name = azurerm_api_management_api_operation.op_auth_api_signup.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_auth_api_signup.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_auth_api_signup.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/auth/signup" />
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

resource "azurerm_api_management_api_operation" "op_auth_api_login" {
  operation_id        = "Login"
  api_name            = azurerm_api_management_api.auth_api.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Login"
  method              = "POST"
  url_template        = "/login"
  depends_on          = [azurerm_api_management_api_policy.auth]
}

resource "azurerm_api_management_api_operation_policy" "pol_auth_api_login" {
  api_name            = azurerm_api_management_api_operation.op_auth_api_login.api_name
  api_management_name = azurerm_api_management_api_operation.op_auth_api_login.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_auth_api_login.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_auth_api_login.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/auth/login" />
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

resource "azurerm_api_management_api_operation" "op_auth_api_verifyotp" {
  operation_id        = "VerifyOtp"
  api_name            = azurerm_api_management_api.auth_api.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "VerifyOtp"
  method              = "POST"
  url_template        = "/verifyotp"
  depends_on          = [azurerm_api_management_api_policy.auth]
}

resource "azurerm_api_management_api_operation_policy" "pol_auth_api_verifyotp" {
  api_name            = azurerm_api_management_api_operation.op_auth_api_verifyotp.api_name
  api_management_name = azurerm_api_management_api_operation.op_auth_api_verifyotp.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_auth_api_verifyotp.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_auth_api_verifyotp.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/auth/verifyotp" />
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

resource "azurerm_api_management_api_operation" "op_auth_api_getprofiles" {
  operation_id        = "GetProfiles"
  api_name            = azurerm_api_management_api.auth_api.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetProfiles"
  method              = "GET"
  url_template        = "/profiles/{userId}"
  depends_on          = [azurerm_api_management_api_policy.auth]

  template_parameter {
    name     = "userId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_auth_api_getprofiles" {
  api_name            = azurerm_api_management_api_operation.op_auth_api_getprofiles.api_name
  api_management_name = azurerm_api_management_api_operation.op_auth_api_getprofiles.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_auth_api_getprofiles.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_auth_api_getprofiles.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/auth/profiles/{userId}" />
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

resource "azurerm_api_management_api_operation" "op_auth_api_updateprofile" {
  operation_id        = "UpdateProfile"
  api_name            = azurerm_api_management_api.auth_api.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "UpdateProfile"
  method              = "PATCH"
  url_template        = "/profile/update"
  depends_on          = [azurerm_api_management_api_policy.auth]
}

resource "azurerm_api_management_api_operation_policy" "pol_auth_api_updateprofile" {
  api_name            = azurerm_api_management_api_operation.op_auth_api_updateprofile.api_name
  api_management_name = azurerm_api_management_api_operation.op_auth_api_updateprofile.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_auth_api_updateprofile.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_auth_api_updateprofile.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/auth/profile/update" />
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

resource "azurerm_api_management_api_operation" "op_auth_api_getallusers" {
  operation_id        = "GetAllUsers"
  api_name            = azurerm_api_management_api.auth_api.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetAllUsers"
  method              = "GET"
  url_template        = "/users"
  depends_on          = [azurerm_api_management_api_policy.auth]
}

resource "azurerm_api_management_api_operation_policy" "pol_auth_api_getallusers" {
  api_name            = azurerm_api_management_api_operation.op_auth_api_getallusers.api_name
  api_management_name = azurerm_api_management_api_operation.op_auth_api_getallusers.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_auth_api_getallusers.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_auth_api_getallusers.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/auth/users" />
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

resource "azurerm_api_management_api_operation" "op_auth_api_getuserbyid" {
  operation_id        = "GetUserById"
  api_name            = azurerm_api_management_api.auth_api.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetUserById"
  method              = "GET"
  url_template        = "/users/{id}"
  depends_on          = [azurerm_api_management_api_policy.auth]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_auth_api_getuserbyid" {
  api_name            = azurerm_api_management_api_operation.op_auth_api_getuserbyid.api_name
  api_management_name = azurerm_api_management_api_operation.op_auth_api_getuserbyid.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_auth_api_getuserbyid.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_auth_api_getuserbyid.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/auth/users/{id}" />
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

resource "azurerm_api_management_api_operation" "op_auth_api_onboard" {
  operation_id        = "Onboard"
  api_name            = azurerm_api_management_api.auth_api.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Onboard"
  method              = "POST"
  url_template        = "/onboard"
  depends_on          = [azurerm_api_management_api_policy.auth]
}

resource "azurerm_api_management_api_operation_policy" "pol_auth_api_onboard" {
  api_name            = azurerm_api_management_api_operation.op_auth_api_onboard.api_name
  api_management_name = azurerm_api_management_api_operation.op_auth_api_onboard.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_auth_api_onboard.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_auth_api_onboard.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/auth/onboard" />
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

resource "azurerm_api_management_api_operation" "op_auth_api_signupandonboard" {
  operation_id        = "SignupAndOnboard"
  api_name            = azurerm_api_management_api.auth_api.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "SignupAndOnboard"
  method              = "POST"
  url_template        = "/register"
  depends_on          = [azurerm_api_management_api_policy.auth]
}

resource "azurerm_api_management_api_operation_policy" "pol_auth_api_signupandonboard" {
  api_name            = azurerm_api_management_api_operation.op_auth_api_signupandonboard.api_name
  api_management_name = azurerm_api_management_api_operation.op_auth_api_signupandonboard.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_auth_api_signupandonboard.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_auth_api_signupandonboard.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/auth/register" />
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

