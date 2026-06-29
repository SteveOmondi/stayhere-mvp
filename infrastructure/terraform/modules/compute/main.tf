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
    "OnFonSms__ClientId"             = var.onfon_client_id
    "OnFonSms__ApiKey"               = "@Microsoft.KeyVault(SecretUri=${local.kv_uri}secrets/onfon-api-key)"
    "OnFonSms__BaseUrl"              = var.onfon_base_url
    "OnFonSms__SenderId"             = var.onfon_sender_id
    "AzureWebJobs.Http.RoutePrefix"  = ""
    "WEBSITE_RUN_FROM_PACKAGE"       = "1"
    "APP_MODE"                       = "test" # Set to 'live' for production to hide OTPs
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
    "Google__ApiKey"                 = var.google_api_key
    "Google__EmbeddingModel"         = var.google_embedding_model
    "Google__EmbeddingCacheMinutes"  = "60"
    "AzureWebJobs.Http.RoutePrefix"  = ""
    "WEBSITE_RUN_FROM_PACKAGE"       = "1"
    "R2__AccountId"                  = var.r2_account_id
    "R2__AccessKeyId"                = var.r2_access_key_id
    "R2__SecretAccessKey"            = var.r2_secret_access_key
    "R2__BucketName"                 = var.r2_bucket_name
    "R2__PublicBaseUrl"              = var.r2_public_base_url
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
    "AzureWebJobs.Http.RoutePrefix"  = ""
    "WEBSITE_RUN_FROM_PACKAGE"       = "1"
  }

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Service = "CustomerService"
  }
}

resource "azurerm_linux_function_app" "logging" {
  name                = "func-${var.environment}-logging-${var.suffix}"
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
    "SCM_DO_BUILD_DURING_DEPLOYMENT" = "false"
    "FUNCTIONS_EXTENSION_VERSION"    = "~4"
    "SKIP_AUTH"                      = var.skip_auth
    "AzureWebJobs.Http.RoutePrefix"  = ""
    "WEBSITE_RUN_FROM_PACKAGE"       = "1"
    "LogStorageConnectionString"     = azurerm_storage_account.main.primary_connection_string
    "LogContainerName"               = "logs"
  }

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Service = "LoggingService"
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
    "AzureWebJobs.Http.RoutePrefix"  = ""
    "WEBSITE_RUN_FROM_PACKAGE"       = "1"
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
    "AzureWebJobs.Http.RoutePrefix"  = ""
    "WEBSITE_RUN_FROM_PACKAGE"       = "1"
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
    "Groq__ApiKey"                             = var.groq_api_key
    "Groq__Model"                              = var.groq_model
    "Groq__MaxRetries"                         = "4"
    "Groq__RecommendNarrationMode"             = "Llm"
    "Groq__RecommendNarrationMaxTokens"        = "280"
    "Groq__RecommendLlmTimeoutSeconds"         = "40"
    "Google__ApiKey"                           = var.google_api_key
    "Google__EmbeddingModel"                   = var.google_embedding_model
    "Google__EmbeddingCacheMinutes"            = "60"
    "ListingPortalBaseUrl"                     = "https://apim-${var.environment}-${var.suffix}.azure-api.net/property"
    "AzureWebJobs.Http.RoutePrefix"            = ""
    "WEBSITE_RUN_FROM_PACKAGE"                 = "1"
  }

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Service = "AiAgentService"
  }
}

resource "azurerm_linux_function_app" "payments" {
  name                = "func-${var.environment}-payments-${var.suffix}"
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
    "AzureWebJobs.Http.RoutePrefix"  = ""
    "WEBSITE_RUN_FROM_PACKAGE"       = "1"
    "Mpesa__ConsumerKey"             = "@Microsoft.KeyVault(SecretUri=${local.kv_uri}secrets/mpesa-consumer-key)"
    "Mpesa__ConsumerSecret"          = "@Microsoft.KeyVault(SecretUri=${local.kv_uri}secrets/mpesa-consumer-secret)"
    "Mpesa__ShortCode"               = var.mpesa_shortcode
    "Mpesa__PassKey"                 = "@Microsoft.KeyVault(SecretUri=${local.kv_uri}secrets/mpesa-passkey)"
    "Mpesa__Environment"             = var.mpesa_environment
    "Mpesa__StkCallbackUrl"          = "https://apim-${var.environment}-${var.suffix}.azure-api.net/payments/mpesa/stk/callback"
    "Mpesa__C2bValidationUrl"        = "https://apim-${var.environment}-${var.suffix}.azure-api.net/payments/mpesa/c2b/validate"
    "Mpesa__C2bConfirmationUrl"      = "https://apim-${var.environment}-${var.suffix}.azure-api.net/payments/mpesa/c2b/confirm"
  }

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Service = "PaymentsService"
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

variable "groq_api_key" {
  type      = string
  sensitive = true
}

variable "groq_model" {
  type    = string
  default = "llama-3.3-70b-versatile"
}

variable "google_api_key" {
  type      = string
  sensitive = true
}

variable "google_embedding_model" {
  type    = string
  default = "text-embedding-004"
}

variable "onfon_client_id" {
  type = string
}

variable "onfon_base_url" {
  type = string
}

variable "onfon_sender_id" {
  type = string
}

variable "mpesa_shortcode" {
  type = string
}

variable "mpesa_environment" {
  type = string
}

variable "r2_account_id" {
  type    = string
  default = ""
}

variable "r2_access_key_id" {
  type    = string
  default = ""
}

variable "r2_secret_access_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "r2_bucket_name" {
  type    = string
  default = "stayhere"
}

variable "r2_public_base_url" {
  type    = string
  default = ""
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

output "payments_function_name" {
  value = azurerm_linux_function_app.payments.name
}

output "payments_function_host" {
  value = azurerm_linux_function_app.payments.default_hostname
}

output "payments_principal_id" {
  value = azurerm_linux_function_app.payments.identity[0].principal_id
}

output "logging_function_name" {
  value = azurerm_linux_function_app.logging.name
}

output "logging_function_host" {
  value = azurerm_linux_function_app.logging.default_hostname
}
