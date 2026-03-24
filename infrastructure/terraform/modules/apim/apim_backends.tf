resource "azurerm_api_management_backend" "property" {
  name                = "property-backend"
  resource_group_name = var.rg_name
  api_management_name = azurerm_api_management.main.name
  protocol            = "http"
  url                 = "https://${var.property_function_host}"
}

resource "azurerm_api_management_api_policy" "property" {
  api_name            = azurerm_api_management_api.property.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name

  xml_content = <<XML
<policies>
  <inbound>
    <base />
    <set-backend-service backend-id="property-backend" />
  </inbound>
  <backend><base /></backend>
  <outbound><base /></outbound>
  <on-error><base /></on-error>
</policies>
XML
}