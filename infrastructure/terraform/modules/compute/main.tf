resource "azurerm_service_plan" "main" {
  name                = "asp-${var.environment}-stayhere"
  resource_group_name = var.rg_name
  location            = var.location
  os_type             = "Linux"
  sku_name            = "Y1" # Reverted to Consumption tier for Pay-As-You-Go
}

resource "azurerm_linux_function_app" "auth" {
  name                = "func-${var.environment}-auth-${var.suffix}"
  resource_group_name = var.rg_name
  location            = var.location

  storage_account_name       = azurerm_storage_account.main.name
  storage_account_access_key = azurerm_storage_account.main.primary_access_key
  service_plan_id            = azurerm_service_plan.main.id

  site_config {
    application_stack {
      dotnet_version = "8.0" # or 9.0 when available in terraform
    }
  }

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_linux_function_app" "property" {
  name                = "func-${var.environment}-property-${var.suffix}"
  resource_group_name = var.rg_name
  location            = var.location

  storage_account_name       = azurerm_storage_account.main.name
  storage_account_access_key = azurerm_storage_account.main.primary_access_key
  service_plan_id            = azurerm_service_plan.main.id

  site_config {
    application_stack {
      dotnet_version = "8.0"
    }
  }

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_linux_function_app" "customer" {
  name                = "func-${var.environment}-customer-${var.suffix}"
  resource_group_name = var.rg_name
  location            = var.location

  storage_account_name       = azurerm_storage_account.main.name
  storage_account_access_key = azurerm_storage_account.main.primary_access_key
  service_plan_id            = azurerm_service_plan.main.id

  site_config {
    application_stack {
      dotnet_version = "8.0"
    }
  }

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_linux_function_app" "propertyowner" {
  name                = "func-${var.environment}-propertyowner-${var.suffix}"
  resource_group_name = var.rg_name
  location            = var.location

  storage_account_name       = azurerm_storage_account.main.name
  storage_account_access_key = azurerm_storage_account.main.primary_access_key
  service_plan_id            = azurerm_service_plan.main.id

  site_config {
    application_stack {
      dotnet_version = "8.0"
    }
  }

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_linux_function_app" "staticdata" {
  name                = "func-${var.environment}-staticdata-${var.suffix}"
  resource_group_name = var.rg_name
  location            = var.location

  storage_account_name       = azurerm_storage_account.main.name
  storage_account_access_key = azurerm_storage_account.main.primary_access_key
  service_plan_id            = azurerm_service_plan.main.id

  site_config {
    application_stack {
      dotnet_version = "8.0"
    }
  }

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_storage_account" "main" {
  name                     = "st${var.environment}${var.suffix}"
  resource_group_name      = var.rg_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

variable "rg_name" {
  type = string
}

variable "location" {
  type = string
}

variable "environment" {
  type = string
}

variable "suffix" {
  type = string
}

output "auth_function_name" {
  value = azurerm_linux_function_app.auth.name
}

output "auth_function_host" {
  value = azurerm_linux_function_app.auth.default_hostname
}

output "property_function_name" {
  value = azurerm_linux_function_app.property.name
}

output "property_function_host" {
  value = azurerm_linux_function_app.property.default_hostname
}

output "customer_function_name" {
  value = azurerm_linux_function_app.customer.name
}

output "customer_function_host" {
  value = azurerm_linux_function_app.customer.default_hostname
}

output "propertyowner_function_name" {
  value = azurerm_linux_function_app.propertyowner.name
}

output "propertyowner_function_host" {
  value = azurerm_linux_function_app.propertyowner.default_hostname
}

output "staticdata_function_name" {
  value = azurerm_linux_function_app.staticdata.name
}

output "staticdata_function_host" {
  value = azurerm_linux_function_app.staticdata.default_hostname
}
