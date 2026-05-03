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

variable "auth_app_principal_id" {
  type    = string
  default = null
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

  required_resource_access {
    resource_app_id = "00000003-0000-0000-c000-000000000000" # Microsoft Graph

    resource_access {
      id   = "df02183c-f9d3-4921-9493-514926984c0c" # User.Read.All
      type = "Role"
    }

    resource_access {
      id   = "064f2601-523c-41c6-992a-8c7604f86d87" # UserAuthenticationMethod.ReadWrite.All
      type = "Role"
    }
  }
}

resource "azuread_service_principal" "main" {
  client_id                    = azuread_application.main.client_id
  app_role_assignment_required = false
  owners                       = [data.azuread_client_config.current.object_id]
}

# --- AUTOMATED SECRET GENERATION ---
resource "azuread_application_password" "main" {
  application_id = azuread_application.main.id
  display_name   = "Managed by Terraform"
  end_date       = "2099-01-01T00:00:00Z"
}

# --- SECURE STORAGE IN KEY VAULT ---
resource "azurerm_key_vault_secret" "entra_client_secret" {
  name         = "entra-client-secret"
  value        = azuread_application_password.main.value
  key_vault_id = azurerm_key_vault.main.id
}

# --- AUTOMATED ROLE ASSIGNMENTS (Admin Consent) ---
# Note: The principal running Terraform must have AppRoleAssignment.ReadWrite.All 
# or be a Global Admin to assign these roles.

data "azuread_service_principal" "msgraph" {
  client_id = "00000003-0000-0000-c000-000000000000" # Microsoft Graph
}

# NOTE: These assignments are currently commented out because they were already 
# assigned manually in the tenant, causing a conflict during Terraform apply.
# To manage them via Terraform in the future, they should be imported into the state.

# resource "azuread_app_role_assignment" "user_read_all" {
#   app_role_id         = data.azuread_service_principal.msgraph.app_role_ids["User.Read.All"]
#   principal_object_id = azuread_service_principal.main.object_id
#   resource_object_id  = data.azuread_service_principal.msgraph.object_id
# }

# resource "azuread_app_role_assignment" "auth_method_write" {
#   app_role_id         = data.azuread_service_principal.msgraph.app_role_ids["UserAuthenticationMethod.ReadWrite.All"]
#   principal_object_id = azuread_service_principal.main.object_id
#   resource_object_id  = data.azuread_service_principal.msgraph.object_id
# }

output "entra_client_id" {
  value = azuread_application.main.client_id
}

output "entra_tenant_id" {
  value = data.azuread_client_config.current.tenant_id
}

output "entra_client_secret_name" {
  value = azurerm_key_vault_secret.entra_client_secret.name
}

