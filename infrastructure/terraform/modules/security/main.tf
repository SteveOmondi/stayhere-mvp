# --- KEY VAULT ---
resource "azurerm_key_vault" "main" {
  name                        = "kv-${var.environment}-${var.suffix}"
  location                    = var.location
  resource_group_name         = var.rg_name
  enabled_for_disk_encryption = true
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  soft_delete_retention_days  = 7
  purge_protection_enabled    = false

  sku_name = "standard"

  # 1. Pipeline Identity (Always present)
  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    secret_permissions = ["Get", "List", "Set", "Delete", "Purge", "Recover"]
    key_permissions    = ["Get", "List", "Create", "Update", "Delete"]
  }

  # 2. Auth App Identity (Conditional to break the cycle)
  dynamic "access_policy" {
    for_each = var.auth_app_principal_id != null ? [1] : []
    content {
      tenant_id = data.azurerm_client_config.current.tenant_id
      object_id = var.auth_app_principal_id
      secret_permissions = ["Get"]
    }
  }
}

# --- SECURE STORAGE ---
resource "azurerm_key_vault_secret" "entra_client_secret" {
  name         = "entra-client-secret"
  value        = var.entra_client_secret_value
  key_vault_id = azurerm_key_vault.main.id
}

# --- VARIABLES ---
variable "suffix" { type = string }
variable "rg_name" { type = string }
variable "location" { type = string }
variable "environment" { type = string }
variable "auth_app_principal_id" { 
  type = string 
  default = null
}
variable "entra_client_secret_value" {
  type      = string
  sensitive = true
}

# --- DATA ---
data "azurerm_client_config" "current" {}

# --- OUTPUTS ---
output "key_vault_id" {
  value = azurerm_key_vault.main.id
}

output "key_vault_uri" {
  value = azurerm_key_vault.main.vault_uri
}
