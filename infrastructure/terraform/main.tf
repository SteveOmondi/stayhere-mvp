data "azurerm_client_config" "current" {}

# Root level App Registration to break dependency cycles
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

resource "random_id" "suffix" {
  byte_length = 4
  keepers = {
    # Keep the same suffix unless the environment name changes
    project = var.project_name
    env     = var.environment
  }
}

resource "azurerm_resource_group" "main" {
  name     = "rg-${var.project_name}-${var.environment}-${random_id.suffix.hex}"
  location = var.location

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# Hub Network Module
module "network" {
  source      = "./modules/network"
  rg_name     = azurerm_resource_group.main.name
  location    = azurerm_resource_group.main.location
  environment = var.environment
}

# Database Module (SQL + NoSQL Atlas)
module "database" {
  source      = "./modules/database"
  rg_name     = azurerm_resource_group.main.name
  location    = azurerm_resource_group.main.location
  environment = var.environment
  suffix      = random_id.suffix.hex
  org_id      = var.mongodb_atlas_org_id
}

# Cache Module
module "cache" {
  source      = "./modules/cache"
  rg_name     = azurerm_resource_group.main.name
  location    = azurerm_resource_group.main.location
  environment = var.environment
  suffix      = random_id.suffix.hex
}

# Security Module
module "security" {
  source      = "./modules/security"
  rg_name     = azurerm_resource_group.main.name
  location    = azurerm_resource_group.main.location
  environment = var.environment
  suffix      = random_id.suffix.hex

  # Entra ID credentials from root
  entra_client_secret_value = azuread_application_password.main.value
  auth_app_principal_id     = module.compute.auth_principal_id
}

# Compute Module
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

  openrouter_api_key         = var.openrouter_api_key
  openrouter_model           = var.openrouter_model
  openrouter_embedding_model = var.openrouter_embedding_model
}

# APIM Module
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
  entra_client_id             = module.security.entra_client_id
  entra_tenant_id             = module.security.entra_tenant_id
}
