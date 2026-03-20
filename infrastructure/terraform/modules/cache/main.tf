resource "azurerm_redis_cache" "main" {
  name                = "redis-${var.environment}-stayhere"
  location            = var.location
  resource_group_name = var.rg_name
  capacity            = 0
  family              = "C"
  sku_name            = "Basic"
  non_ssl_port_enabled = false
  minimum_tls_version = "1.2"

  tags = {
    Environment = var.environment
  }
}

output "redis_connection_string" {
  value     = azurerm_redis_cache.main.primary_connection_string
  sensitive = true
}
