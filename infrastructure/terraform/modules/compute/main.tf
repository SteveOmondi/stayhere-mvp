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
    "APP_MODE"                       = var.app_mode # 'live' in production to hide OTPs
    "JWT_SECRET"                     = var.jwt_secret
    "SEED_ADMIN_ENABLED"             = tostring(var.seed_admin_enabled)
    "SEED_ADMIN_EMAIL"               = var.seed_admin_email
    "SEED_ADMIN_PHONE"               = var.seed_admin_phone
    "SEED_ADMIN_FULL_NAME"           = var.seed_admin_full_name
    "SEED_ADMIN_USER_ID"             = var.seed_admin_user_id
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
    "REDIS_CONNECTION"               = var.redis_connection_string # key AddStayHereRedisCache actually reads
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
    "JWT_SECRET"                     = var.jwt_secret
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
    "JWT_SECRET"                     = var.jwt_secret
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
    "JWT_SECRET"                     = var.jwt_secret
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
    "JWT_SECRET"                     = var.jwt_secret
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
    "JWT_SECRET"                     = var.jwt_secret
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
    "FUNCTIONS_WORKER_RUNTIME"          = "dotnet-isolated"
    "AzureWebJobsStorage"               = azurerm_storage_account.main.primary_connection_string
    "DB_HOST"                           = var.psql_host
    "DB_PORT"                           = "5432"
    "DB_NAME"                           = var.psql_database_name
    "DB_USER"                           = var.psql_admin_login
    "DB_PASSWORD"                       = var.psql_admin_password
    "MONGODB_CONNECTION_STRING"         = var.mongodb_connection_string
    "REDIS_CONNECTION_STRING"           = var.redis_connection_string
    "REDIS_CONNECTION"                  = var.redis_connection_string # key AddStayHereRedisCache actually reads
    "SCM_DO_BUILD_DURING_DEPLOYMENT"    = "false"
    "FUNCTIONS_EXTENSION_VERSION"       = "~4"
    "SKIP_AUTH"                         = var.skip_auth
    "Groq__ApiKey"                      = var.groq_api_key
    "Groq__Model"                       = var.groq_model
    "Groq__MaxRetries"                  = "4"
    "Groq__RecommendNarrationMode"      = "Llm"
    "Groq__RecommendNarrationMaxTokens" = "280"
    "Groq__RecommendLlmTimeoutSeconds"  = "40"
    "Groq__ToolCallingMaxIterations"    = "4"
    "Google__ApiKey"                    = var.google_api_key
    "Google__EmbeddingModel"            = var.google_embedding_model
    "Google__EmbeddingCacheMinutes"     = "60"
    "ListingPortalBaseUrl"              = "https://apim-${var.environment}-${var.suffix}.azure-api.net/property"
    "JWT_SECRET"                        = var.jwt_secret
    # Floor plan analysis (Claude -> Gemini -> Qwen fallback chain)
    "FloorPlan__ProviderOrder"       = var.floor_plan_provider_order
    "Anthropic__ApiKey"              = var.anthropic_api_key
    "Anthropic__FloorPlanModel"      = var.anthropic_floor_plan_model
    "Google__FloorPlanModel"         = var.google_floor_plan_model
    "Groq__FloorPlanModel"           = var.groq_floor_plan_model
    "Google__FloorPlanFallbackModel" = var.google_floor_plan_fallback_model
    "Anthropic__FloorPlanMaxRetries" = "2"
    "Google__FloorPlanMaxRetries"    = "2"
    "Groq__FloorPlanMaxRetries"      = "2"
    # Google Places (nearby amenities) - falls back to Google__ApiKey when empty
    "Google__MapsApiKey"            = var.google_maps_api_key != "" ? var.google_maps_api_key : var.google_api_key
    "AzureWebJobs.Http.RoutePrefix" = ""
    "WEBSITE_RUN_FROM_PACKAGE"      = "1"
    # Opt Sage into its own MCP server as an external tool source - empty/absent by default
    # (Mcp:ExternalServers), so this is what actually turns the McpServer deployment into something
    # Sage uses rather than a resource sitting idle.
    "Mcp__ExternalServers__0__Name" = "stayhere"
    "Mcp__ExternalServers__0__Url"  = "https://${azurerm_function_app_flex_consumption.mcp.default_hostname}/mcp"
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
    "JWT_SECRET"                     = var.jwt_secret
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

# --- McpServer: hosted as a self-hosted MCP server (public preview) on Flex Consumption, NOT the
# shared Y1 Consumption plan the other 8 Function Apps use - Y1 can't run a long-lived ASP.NET Core
# process (McpServer's actual code: Microsoft.NET.Sdk.Web, ModelContextProtocol.AspNetCore, no
# Functions worker SDK at all). Flex Consumption still scales to zero / bills per-execution like Y1,
# it's just the plan tier this preview feature requires. See src/McpServer/host.json -
# "configurationProfile": "mcp-custom-handler" is what actually makes this work, not the runtime_name
# below (which only has to match a real Functions language worker for extension-bundle resolution -
# the custom handler profile is what overrides all request routing to proxy into the app itself).
resource "azurerm_service_plan" "mcp_flex" {
  name                = "asp-${var.environment}-mcp-${var.suffix}"
  resource_group_name = var.rg_name
  location            = var.location
  os_type             = "Linux"
  sku_name            = "FC1"
}

resource "azurerm_storage_container" "mcp_deploy" {
  name                  = "mcp-deploy"
  storage_account_id    = azurerm_storage_account.main.id
  container_access_type = "private"
}

resource "azurerm_function_app_flex_consumption" "mcp" {
  name                = "func-${var.environment}-mcp-${var.suffix}"
  resource_group_name = var.rg_name
  location            = var.location
  service_plan_id     = azurerm_service_plan.mcp_flex.id

  storage_container_type      = "blobContainer"
  storage_container_endpoint  = "${azurerm_storage_account.main.primary_blob_endpoint}${azurerm_storage_container.mcp_deploy.name}"
  storage_authentication_type = "StorageAccountConnectionString"
  storage_access_key          = azurerm_storage_account.main.primary_access_key

  # Keep dotnet-isolated even though McpServer is a custom handler (host.json: mcp-custom-handler):
  # the host launches `dotnet StayHere.McpServer.dll`, and only the .NET stack image ships `dotnet`.
  # The "custom" runtime has no .NET and returns 502 (matches Azure-Samples/mcp-sdk-functions-hosting-dotnet).
  runtime_name           = "dotnet-isolated"
  runtime_version        = "9.0"
  maximum_instance_count = 40
  instance_memory_in_mb  = 2048

  site_config {}

  app_settings = {
    "DB_HOST"                          = var.psql_host
    "DB_PORT"                          = "5432"
    "DB_NAME"                          = var.psql_database_name
    "DB_USER"                          = var.psql_admin_login
    "DB_PASSWORD"                      = var.psql_admin_password
    "REDIS_CONNECTION_STRING"          = var.redis_connection_string
    "REDIS_CONNECTION"                 = var.redis_connection_string # key AddStayHereRedisCache actually reads
    "Google__ApiKey"                   = var.google_api_key
    "Google__EmbeddingModel"           = var.google_embedding_model
    "Google__EmbeddingCacheMinutes"    = "60"
    "Google__MapsApiKey"               = var.google_maps_api_key != "" ? var.google_maps_api_key : var.google_api_key
    "Google__PlacesSearchRadiusMeters" = "3000"
    "Google__PlacesMaxResults"         = "8"
  }

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Service = "McpServer"
  }
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

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "app_mode" {
  type    = string
  default = "test"
}

variable "seed_admin_enabled" {
  type    = bool
  default = false
}

variable "seed_admin_email" {
  type    = string
  default = ""
}

variable "seed_admin_phone" {
  type    = string
  default = ""
}

variable "seed_admin_full_name" {
  type    = string
  default = "Admin"
}

variable "seed_admin_user_id" {
  type    = string
  default = ""
}

variable "anthropic_api_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "anthropic_floor_plan_model" {
  type    = string
  default = "claude-sonnet-5-5"
}

variable "google_floor_plan_model" {
  type    = string
  default = "gemini-flash-latest"
}

variable "google_floor_plan_fallback_model" {
  type    = string
  default = "gemini-3.6-flash"
}

variable "groq_floor_plan_model" {
  type    = string
  default = "qwen/qwen3.8-27b"
}

variable "floor_plan_provider_order" {
  type    = string
  default = "Claude,Gemini,Qwen"
}

variable "google_maps_api_key" {
  type      = string
  sensitive = true
  default   = ""
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

output "mcp_function_name" {
  value = azurerm_function_app_flex_consumption.mcp.name
}

output "mcp_function_host" {
  value = azurerm_function_app_flex_consumption.mcp.default_hostname
}

output "mcp_principal_id" {
  value = azurerm_function_app_flex_consumption.mcp.identity[0].principal_id
}
