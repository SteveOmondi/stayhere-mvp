# Auto-generated Operations for AiAgentService

resource "azurerm_api_management_api_operation" "op_aiagent_agentchat" {
  operation_id        = "AgentChat"
  api_name            = azurerm_api_management_api.aiagent.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "AgentChat"
  method              = "POST"
  url_template        = "/chat"
  depends_on          = [azurerm_api_management_api_policy.aiagent]
}

resource "azurerm_api_management_api_operation_policy" "pol_aiagent_agentchat" {
  api_name            = azurerm_api_management_api_operation.op_aiagent_agentchat.api_name
  api_management_name = azurerm_api_management_api_operation.op_aiagent_agentchat.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_aiagent_agentchat.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_aiagent_agentchat.operation_id
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

resource "azurerm_api_management_api_operation" "op_aiagent_agentrespondandrecommend" {
  operation_id        = "AgentRespondAndRecommend"
  api_name            = azurerm_api_management_api.aiagent.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "AgentRespondAndRecommend"
  method              = "POST"
  url_template        = "/respondandrecommend"
  depends_on          = [azurerm_api_management_api_policy.aiagent]
}

resource "azurerm_api_management_api_operation_policy" "pol_aiagent_agentrespondandrecommend" {
  api_name            = azurerm_api_management_api_operation.op_aiagent_agentrespondandrecommend.api_name
  api_management_name = azurerm_api_management_api_operation.op_aiagent_agentrespondandrecommend.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_aiagent_agentrespondandrecommend.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_aiagent_agentrespondandrecommend.operation_id
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

resource "azurerm_api_management_api_operation" "op_aiagent_agentknowledgestatus" {
  operation_id        = "AgentKnowledgeStatus"
  api_name            = azurerm_api_management_api.aiagent.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "AgentKnowledgeStatus"
  method              = "GET"
  url_template        = "/knowledge/status"
  depends_on          = [azurerm_api_management_api_policy.aiagent]
}

resource "azurerm_api_management_api_operation_policy" "pol_aiagent_agentknowledgestatus" {
  api_name            = azurerm_api_management_api_operation.op_aiagent_agentknowledgestatus.api_name
  api_management_name = azurerm_api_management_api_operation.op_aiagent_agentknowledgestatus.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_aiagent_agentknowledgestatus.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_aiagent_agentknowledgestatus.operation_id
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

resource "azurerm_api_management_api_operation" "op_aiagent_agentsearchlistings" {
  operation_id        = "AgentSearchListings"
  api_name            = azurerm_api_management_api.aiagent.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "AgentSearchListings"
  method              = "GET"
  url_template        = "/listings"
  depends_on          = [azurerm_api_management_api_policy.aiagent]
}

resource "azurerm_api_management_api_operation" "op_aiagent_agenthealth" {
  operation_id        = "AgentHealth"
  api_name            = azurerm_api_management_api.aiagent.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "AgentHealth"
  method              = "GET"
  url_template        = "/health"
  depends_on          = [azurerm_api_management_api_policy.aiagent]
}

