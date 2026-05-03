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
      dotnet_version              = "9.0"
      use_dotnet_isolated_runtime = true
    }
  }

  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME"       = "dotnet-isolated"
    "AzureWebJobsStorage"            = azurerm_storage_account.main.primary_connection_string
    "DB_HOST"                        = var.psql_host
    "DB_PORT"                        = "5432"
    "DB_NAME"                        = var.psql_database_name
    "DB_USER"                        = var.psql_admin_login
    "DB_PASSWORD"                    = var.psql_admin_password
    "MONGODB_CONNECTION_STRING"      = var.mongodb_connection_string
    "REDIS_CONNECTION_STRING"        = var.redis_connection_string
    "SCM_DO_BUILD_DURING_DEPLOYMENT" = "false"
    "FUNCTIONS_EXTENSION_VERSION"    = "~4"
    "SKIP_AUTH"                      = var.skip_auth
    "ENTRA_CLIENT_ID"                = var.entra_client_id
    "ENTRA_TENANT_ID"                = var.entra_tenant_id
    "ENTRA_CLIENT_SECRET"            = "@Microsoft.KeyVault(SecretUri=${local.kv_uri}secrets/${var.entra_client_secret_name})"
  }

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Service = "AuthService"
  }
}

# Key Vault URI is constructed manually to break the circular dependency with the security module
locals {
  kv_uri = "https://kv-${var.environment}-${var.suffix}.vault.azure.net/"
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
      dotnet_version              = "9.0"
      use_dotnet_isolated_runtime = true
    }
  }

  tags = {
    Service = "PropertyService"
  }

  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME"       = "dotnet-isolated"
    "AzureWebJobsStorage"            = azurerm_storage_account.main.primary_connection_string
    "DB_HOST"                        = var.psql_host
    "DB_PORT"                        = "5432"
    "DB_NAME"                        = var.psql_database_name
    "DB_USER"                        = var.psql_admin_login
    "DB_PASSWORD"                    = var.psql_admin_password
    "MONGODB_CONNECTION_STRING"      = var.mongodb_connection_string
    "REDIS_CONNECTION_STRING"        = var.redis_connection_string
    "SCM_DO_BUILD_DURING_DEPLOYMENT" = "false"
    "FUNCTIONS_EXTENSION_VERSION"    = "~4"
    "SKIP_AUTH"                      = var.skip_auth
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
      dotnet_version              = "9.0"
      use_dotnet_isolated_runtime = true
    }
  }

  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME"       = "dotnet-isolated"
    "AzureWebJobsStorage"            = azurerm_storage_account.main.primary_connection_string
    "DB_HOST"                        = var.psql_host
    "DB_PORT"                        = "5432"
    "DB_NAME"                        = var.psql_database_name
    "DB_USER"                        = var.psql_admin_login
    "DB_PASSWORD"                    = var.psql_admin_password
    "MONGODB_CONNECTION_STRING"      = var.mongodb_connection_string
    "REDIS_CONNECTION_STRING"        = var.redis_connection_string
    "SCM_DO_BUILD_DURING_DEPLOYMENT" = "false"
    "FUNCTIONS_EXTENSION_VERSION"    = "~4"
    "SKIP_AUTH"                      = var.skip_auth
  }

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Service = "CustomerService"
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
      dotnet_version              = "9.0"
      use_dotnet_isolated_runtime = true
    }
  }

  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME"       = "dotnet-isolated"
    "AzureWebJobsStorage"            = azurerm_storage_account.main.primary_connection_string
    "DB_HOST"                        = var.psql_host
    "DB_PORT"                        = "5432"
    "DB_NAME"                        = var.psql_database_name
    "DB_USER"                        = var.psql_admin_login
    "DB_PASSWORD"                    = var.psql_admin_password
    "MONGODB_CONNECTION_STRING"      = var.mongodb_connection_string
    "REDIS_CONNECTION_STRING"        = var.redis_connection_string
    "SCM_DO_BUILD_DURING_DEPLOYMENT" = "false"
    "FUNCTIONS_EXTENSION_VERSION"    = "~4"
    "SKIP_AUTH"                      = var.skip_auth
  }

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Service = "PropertyOwnerService"
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
      dotnet_version              = "9.0"
      use_dotnet_isolated_runtime = true
    }
  }

  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME"       = "dotnet-isolated"
    "AzureWebJobsStorage"            = azurerm_storage_account.main.primary_connection_string
    "DB_HOST"                        = var.psql_host
    "DB_PORT"                        = "5432"
    "DB_NAME"                        = var.psql_database_name
    "DB_USER"                        = var.psql_admin_login
    "DB_PASSWORD"                    = var.psql_admin_password
    "MONGODB_CONNECTION_STRING"      = var.mongodb_connection_string
    "REDIS_CONNECTION_STRING"        = var.redis_connection_string
    "SCM_DO_BUILD_DURING_DEPLOYMENT" = "false"
    "FUNCTIONS_EXTENSION_VERSION"    = "~4"
    "SKIP_AUTH"                      = var.skip_auth
    "ENTRA_CLIENT_ID"                = var.entra_client_id != "" ? var.entra_client_id : "REPLACE_ME"
    "ENTRA_TENANT_ID"                = var.entra_tenant_id != "" ? var.entra_tenant_id : "REPLACE_ME"
  }

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Service = "StaticDataService"
  }
}

resource "azurerm_linux_function_app" "aiagent" {
  name                = "func-${var.environment}-aiagent-${var.suffix}"
  resource_group_name = var.rg_name
  location            = var.location

  storage_account_name       = azurerm_storage_account.main.name
  storage_account_access_key = azurerm_storage_account.main.primary_access_key
  service_plan_id            = azurerm_service_plan.main.id

  site_config {
    application_stack {
      dotnet_version              = "9.0"
      use_dotnet_isolated_runtime = true
    }
  }

  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME"                 = "dotnet-isolated"
    "AzureWebJobsStorage"                      = azurerm_storage_account.main.primary_connection_string
    "DB_HOST"                                  = var.psql_host
    "DB_PORT"                                  = "5432"
    "DB_NAME"                                  = var.psql_database_name
    "DB_USER"                                  = var.psql_admin_login
    "DB_PASSWORD"                              = var.psql_admin_password
    "MONGODB_CONNECTION_STRING"                = var.mongodb_connection_string
    "REDIS_CONNECTION_STRING"                  = var.redis_connection_string
    "SCM_DO_BUILD_DURING_DEPLOYMENT"           = "false"
    "FUNCTIONS_EXTENSION_VERSION"              = "~4"
    "SKIP_AUTH"                                = var.skip_auth
    "OpenRouter__ApiKey"                       = var.openrouter_api_key
    "OpenRouter__Model"                        = var.openrouter_model
    "OpenRouter__EmbeddingModel"               = var.openrouter_embedding_model
    "OpenRouter__HttpReferer"                  = "https://stayhere.com"
    "OpenRouter__RecommendNarrationMode"       = "Llm"
    "OpenRouter__RecommendNarrationMaxTokens"  = "280"
    "OpenRouter__RecommendLlmTimeoutSeconds"   = "40"
    "ListingPortalBaseUrl"                     = "https://apim-${var.environment}-${var.suffix}.azure-api.net/property"
  }

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Service = "AiAgentService"
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

variable "skip_auth" {
  type    = bool
  default = false
}

variable "psql_host" {
  type = string
}

variable "psql_admin_login" {
  type = string
}

variable "psql_admin_password" {
  type      = string
  sensitive = true
}

variable "psql_database_name" {
  type = string
}

variable "mongodb_connection_string" {
  type      = string
  sensitive = true
}

variable "redis_connection_string" {
  type      = string
  sensitive = true
}

variable "entra_client_id" {
  type    = string
  default = ""
}

variable "entra_tenant_id" {
  type    = string
  default = ""
}

variable "key_vault_id" {
  type = string
}

variable "entra_client_secret_name" {
  type = string
}

variable "openrouter_api_key" {
  type      = string
  sensitive = true
}

variable "openrouter_model" {
  type    = string
  default = "deepseek/deepseek-chat-v3.1:free"
}

variable "openrouter_embedding_model" {
  type    = string
  default = "nvidia/llama-nemotron-embed-vl-1b-v2:free"
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

output "aiagent_function_name" {
  value = azurerm_linux_function_app.aiagent.name
}

output "aiagent_function_host" {
  value = azurerm_linux_function_app.aiagent.default_hostname
}

output "auth_principal_id" {
  value = azurerm_linux_function_app.auth.identity[0].principal_id
}
