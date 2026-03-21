resource "azurerm_resource_group" "main" {
  name     = "rg-${var.project_name}-${var.environment}"
  location = var.location

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

resource "random_id" "suffix" {
  byte_length = 4
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
  org_id      = var.mongodb_atlas_org_id
}

# Cache Module
module "cache" {
  source      = "./modules/cache"
  rg_name     = azurerm_resource_group.main.name
  location    = azurerm_resource_group.main.location
  environment = var.environment
}

# Security Module
module "security" {
  source      = "./modules/security"
  rg_name     = azurerm_resource_group.main.name
  location    = azurerm_resource_group.main.location
  environment = var.environment
  suffix      = random_id.suffix.hex
}

# Compute Module
module "compute" {
  source      = "./modules/compute"
  rg_name     = azurerm_resource_group.main.name
  location    = azurerm_resource_group.main.location
  environment = var.environment
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
}
