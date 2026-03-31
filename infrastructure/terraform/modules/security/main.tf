resource "azurerm_key_vault" "main" {
  name                        = "kv-${var.environment}-${var.suffix}"
  location                    = var.location
  resource_group_name         = var.rg_name
  enabled_for_disk_encryption = true
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  soft_delete_retention_days  = 7
  purge_protection_enabled    = false

  sku_name = "standard"
}

variable "suffix" {
  type = string
}

data "azurerm_client_config" "current" {}

variable "rg_name" {
  type = string
}

variable "location" {
  type = string
}

variable "environment" {
  type = string
}

output "key_vault_id" {
  value = azurerm_key_vault.main.id
}

output "key_vault_uri" {
  value = azurerm_key_vault.main.vault_uri
}

data "azuread_client_config" "current" {}

resource "azuread_application" "main" {
  display_name = "StayHereMVP-${var.environment}"
  owners       = [data.azuread_client_config.current.object_id]

  single_page_application {
    redirect_uris = ["http://localhost:3000/"]
  }

  api {
    mapped_claims_enabled          = true
    requested_access_token_version = 2
  }
}

resource "azuread_service_principal" "main" {
  client_id                    = azuread_application.main.client_id
  app_role_assignment_required = false
  owners                       = [data.azuread_client_config.current.object_id]
}

output "entra_client_id" {
  value = azuread_application.main.client_id
}

output "entra_tenant_id" {
  value = data.azuread_client_config.current.tenant_id
}

