# Operations for LoggingService

resource "azurerm_api_management_api_operation" "op_logging_writelog" {
  operation_id        = "WriteLog"
  api_name            = azurerm_api_management_api.logging.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "WriteLog"
  method              = "POST"
  url_template        = "/logs"
  depends_on          = [azurerm_api_management_api_policy.logging]
}

resource "azurerm_api_management_api_operation_policy" "pol_logging_writelog" {
  api_name            = azurerm_api_management_api_operation.op_logging_writelog.api_name
  api_management_name = azurerm_api_management_api_operation.op_logging_writelog.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_logging_writelog.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_logging_writelog.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
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

resource "azurerm_api_management_api_operation" "op_logging_readlog" {
  operation_id        = "ReadLog"
  api_name            = azurerm_api_management_api.logging.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "ReadLog"
  method              = "GET"
  url_template        = "/logs"
  depends_on          = [azurerm_api_management_api_policy.logging]
}

resource "azurerm_api_management_api_operation_policy" "pol_logging_readlog" {
  api_name            = azurerm_api_management_api_operation.op_logging_readlog.api_name
  api_management_name = azurerm_api_management_api_operation.op_logging_readlog.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_logging_readlog.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_logging_readlog.operation_id
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
