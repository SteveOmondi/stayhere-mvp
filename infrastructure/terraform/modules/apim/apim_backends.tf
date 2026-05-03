resource "azurerm_api_management_backend" "property" {
  name                = "property-backend"
  resource_group_name = var.rg_name
  api_management_name = azurerm_api_management.main.name
  protocol            = "http"
  url                 = "https://${var.property_function_host}/api"
}