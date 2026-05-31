# Auto-generated Operations for AuthService

resource "azurerm_api_management_api_operation" "op_auth_api_signup" {
  operation_id        = "Signup"
  api_name            = azurerm_api_management_api.auth_api.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Signup"
  method              = "POST"
  url_template        = "/auth/signup"
  depends_on          = [azurerm_api_management_api_policy.auth]
}

resource "azurerm_api_management_api_operation_policy" "pol_auth_api_signup" {
  api_name            = azurerm_api_management_api_operation.op_auth_api_signup.api_name
  api_management_name = azurerm_api_management_api_operation.op_auth_api_signup.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_auth_api_signup.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_auth_api_signup.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_auth_api_login" {
  operation_id        = "Login"
  api_name            = azurerm_api_management_api.auth_api.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Login"
  method              = "POST"
  url_template        = "/auth/login"
  depends_on          = [azurerm_api_management_api_policy.auth]
}

resource "azurerm_api_management_api_operation_policy" "pol_auth_api_login" {
  api_name            = azurerm_api_management_api_operation.op_auth_api_login.api_name
  api_management_name = azurerm_api_management_api_operation.op_auth_api_login.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_auth_api_login.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_auth_api_login.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_auth_api_verifyotp" {
  operation_id        = "VerifyOtp"
  api_name            = azurerm_api_management_api.auth_api.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "VerifyOtp"
  method              = "POST"
  url_template        = "/auth/verifyotp"
  depends_on          = [azurerm_api_management_api_policy.auth]
}

resource "azurerm_api_management_api_operation_policy" "pol_auth_api_verifyotp" {
  api_name            = azurerm_api_management_api_operation.op_auth_api_verifyotp.api_name
  api_management_name = azurerm_api_management_api_operation.op_auth_api_verifyotp.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_auth_api_verifyotp.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_auth_api_verifyotp.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_auth_api_getprofiles" {
  operation_id        = "GetProfiles"
  api_name            = azurerm_api_management_api.auth_api.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetProfiles"
  method              = "GET"
  url_template        = "/auth/profiles/{userId}"
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
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_auth_api_updateprofile" {
  operation_id        = "UpdateProfile"
  api_name            = azurerm_api_management_api.auth_api.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "UpdateProfile"
  method              = "PATCH"
  url_template        = "/auth/profile/update"
  depends_on          = [azurerm_api_management_api_policy.auth]
}

resource "azurerm_api_management_api_operation_policy" "pol_auth_api_updateprofile" {
  api_name            = azurerm_api_management_api_operation.op_auth_api_updateprofile.api_name
  api_management_name = azurerm_api_management_api_operation.op_auth_api_updateprofile.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_auth_api_updateprofile.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_auth_api_updateprofile.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

resource "azurerm_api_management_api_operation" "op_auth_api_onboard" {
  operation_id        = "Onboard"
  api_name            = azurerm_api_management_api.auth_api.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "Onboard"
  method              = "POST"
  url_template        = "/auth/onboard"
  depends_on          = [azurerm_api_management_api_policy.auth]
}

resource "azurerm_api_management_api_operation_policy" "pol_auth_api_onboard" {
  api_name            = azurerm_api_management_api_operation.op_auth_api_onboard.api_name
  api_management_name = azurerm_api_management_api_operation.op_auth_api_onboard.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_auth_api_onboard.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_auth_api_onboard.operation_id
  xml_content         = file("${path.module}/jwt_policy.xml")
}

