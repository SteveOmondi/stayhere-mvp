
resource "azurerm_api_management_api_operation_policy" "auth_profiles" {
  api_name            = azurerm_api_management_api.auth_api.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  operation_id        = azurerm_api_management_api_operation.auth_profiles.operation_id

  xml_content = <<XML
<policies>
    <inbound>
        <base />
        <validate-jwt header-name="Authorization" failed-validation-httpcode="401" failed-validation-error-message="Unauthorized. Access token is missing or invalid.">
            <issuer-signing-keys>
                <key>{{jwt-secret}}</key>
            </issuer-signing-keys>
        </validate-jwt>
    </inbound>
</policies>
XML
}
