# --- DATA & SUFFIX ---
data "azurerm_client_config" "current" {}

resource "random_id" "suffix" {
  byte_length = 4
  keepers = {
    project = var.project_name
    env     = var.environment
  }
}

# --- RESOURCE GROUP ---
resource "azurerm_resource_group" "main" {
  name     = "rg-${var.project_name}-${var.environment}-${random_id.suffix.hex}"
  location = var.location

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# --- ENTRA ID (BASE) ---
resource "azuread_application" "main" {
  display_name = "StayHere-EntraID-${var.environment}"
  
  web {
    implicit_grant {
      access_token_issuance_enabled = false
      id_token_issuance_enabled     = true
    }
  }
}

resource "azuread_service_principal" "main" {
  client_id = azuread_application.main.client_id
}

resource "azuread_application_password" "main" {
  application_id = azuread_application.main.id
}

# --- INFRASTRUCTURE MODULES ---
module "network" {
  source      = "./modules/network"
  rg_name     = azurerm_resource_group.main.name
  location    = azurerm_resource_group.main.location
  environment = var.environment
}

module "database" {
  source      = "./modules/database"
  rg_name     = azurerm_resource_group.main.name
  location    = azurerm_resource_group.main.location
  environment = var.environment
  suffix      = random_id.suffix.hex
  org_id      = var.mongodb_atlas_org_id
}

module "cache" {
  source      = "./modules/cache"
  rg_name     = azurerm_resource_group.main.name
  location    = azurerm_resource_group.main.location
  environment = var.environment
  suffix      = random_id.suffix.hex
}

# --- COMPUTE MODULE ---
module "compute" {
  source      = "./modules/compute"
  rg_name     = azurerm_resource_group.main.name
  location    = azurerm_resource_group.main.location
  environment = var.environment
  suffix      = random_id.suffix.hex

  # Entra ID details
  entra_client_id          = azuread_application.main.client_id
  entra_tenant_id          = data.azurerm_client_config.current.tenant_id
  entra_client_secret_name = "entra-client-secret"
  key_vault_id             = "" 

  psql_host                 = module.database.psql_host
  psql_admin_login          = module.database.psql_admin_login
  psql_admin_password       = module.database.psql_admin_password
  psql_database_name        = module.database.psql_database_name
  mongodb_connection_string = module.database.mongodb_connection_string
  redis_connection_string   = module.cache.redis_connection_string

  groq_api_key           = var.groq_api_key
  groq_model             = var.groq_model
  google_api_key         = var.google_api_key
  google_embedding_model = var.google_embedding_model

  onfon_client_id  = var.onfon_client_id
  onfon_base_url   = var.onfon_base_url
  onfon_sender_id  = var.onfon_sender_id

  mpesa_shortcode   = var.mpesa_shortcode
  mpesa_environment = var.mpesa_environment

  r2_account_id        = var.r2_account_id
  r2_access_key_id     = var.r2_access_key_id
  r2_secret_access_key = var.r2_secret_access_key
  r2_bucket_name       = var.r2_bucket_name
  r2_public_base_url   = var.r2_public_base_url
}

# --- SECURITY MODULE ---
module "security" {
  source      = "./modules/security"
  rg_name     = azurerm_resource_group.main.name
  location    = azurerm_resource_group.main.location
  environment = var.environment
  suffix      = random_id.suffix.hex

  # Entra ID credentials from root
  entra_client_secret_value = azuread_application_password.main.value
  auth_app_principal_id     = module.compute.auth_principal_id
  payments_app_principal_id = module.compute.payments_principal_id
  
  onfon_api_key_value       = var.onfon_api_key

  mpesa_consumer_key_value    = var.mpesa_consumer_key
  mpesa_consumer_secret_value = var.mpesa_consumer_secret
  mpesa_passkey_value         = var.mpesa_passkey
}

# --- FRONTEND STATIC SITES ---
module "frontend" {
  source      = "./modules/frontend"
  rg_name     = azurerm_resource_group.main.name
  location    = azurerm_resource_group.main.location
  environment = var.environment
  suffix      = random_id.suffix.hex
}

# --- APIM MODULE ---
module "apim" {
  source      = "./modules/apim"
  rg_name     = azurerm_resource_group.main.name
  location    = azurerm_resource_group.main.location
  environment = var.environment
  suffix      = random_id.suffix.hex

  auth_function_host          = module.compute.auth_function_host
  property_function_host      = module.compute.property_function_host
  customer_function_host      = module.compute.customer_function_host
  propertyowner_function_host = module.compute.propertyowner_function_host
  staticdata_function_host    = module.compute.staticdata_function_host
  aiagent_function_host       = module.compute.aiagent_function_host
  payments_function_host      = module.compute.payments_function_host
  logging_function_host       = module.compute.logging_function_host

  entra_client_id             = azuread_application.main.client_id
  entra_tenant_id             = data.azurerm_client_config.current.tenant_id

  onfon_client_id             = var.onfon_client_id
  onfon_sender_id             = var.onfon_sender_id

  admin_portal_url            = module.frontend.admin_portal_url
  owner_portal_url            = module.frontend.owner_portal_url
}
