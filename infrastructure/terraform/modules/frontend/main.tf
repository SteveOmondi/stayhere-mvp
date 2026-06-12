resource "azurerm_storage_account" "admin" {
  name                     = "st${var.environment}admin${var.suffix}"
  resource_group_name      = var.rg_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"

  static_website {
    index_document     = "index.html"
    error_404_document = "index.html"
  }

  tags = {
    Environment = var.environment
    Project     = "stayhere"
    Portal      = "admin"
    ManagedBy   = "Terraform"
  }
}

resource "azurerm_storage_account" "owner" {
  name                     = "st${var.environment}owner${var.suffix}"
  resource_group_name      = var.rg_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"

  static_website {
    index_document     = "index.html"
    error_404_document = "index.html"
  }

  tags = {
    Environment = var.environment
    Project     = "stayhere"
    Portal      = "owner"
    ManagedBy   = "Terraform"
  }
}

output "admin_portal_url" {
  value       = azurerm_storage_account.admin.primary_web_endpoint
  description = "Primary web endpoint URL for the admin portal static site"
}

output "owner_portal_url" {
  value       = azurerm_storage_account.owner.primary_web_endpoint
  description = "Primary web endpoint URL for the property owner portal static site"
}

output "admin_storage_name" {
  value       = azurerm_storage_account.admin.name
  description = "Storage account name for the admin portal static site"
}

output "owner_storage_name" {
  value       = azurerm_storage_account.owner.name
  description = "Storage account name for the property owner portal static site"
}
