terraform {
  required_providers {
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.10"
    }
  }
}

# PostgreSQL Flexible Server
resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "psql-${var.environment}-stay-${var.suffix}"
  resource_group_name    = var.rg_name
  location               = var.location
  version                = "15"
  administrator_login    = "psqladmin"
  administrator_password = "P@ssword1234!" # Use KeyVault in production

  storage_mb = 32768
  sku_name   = "B_Standard_B1ms"

  lifecycle {
    ignore_changes = [zone]
  }
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure_services" {
  name             = "AllowAllAzureServices"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = "stayhere"
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# MongoDB Atlas Project
resource "mongodbatlas_project" "main" {
  name   = "stayhere-${var.environment}-${var.suffix}"
  org_id = var.org_id
}

variable "suffix" {
  type = string
}

# MongoDB Atlas Cluster (Shared M0 Tier)
resource "mongodbatlas_cluster" "main" {
  project_id   = mongodbatlas_project.main.id
  name         = "atlas-${var.environment}-stayhere"
  cluster_type = "REPLICASET"

  provider_name               = "TENANT"
  backing_provider_name       = "AZURE"
  provider_instance_size_name = "M0"
  provider_region_name        = "EUROPE_WEST" # Atlas region name for West Europe (Closest M0-supported region)
}

resource "mongodbatlas_database_user" "main" {
  username           = "dbuser"
  password           = "StayHere_Secure_2026!" # Complexity requirement fix
  project_id         = mongodbatlas_project.main.id
  auth_database_name = "admin"

  roles {
    role_name     = "readWriteAnyDatabase"
    database_name = "admin"
  }
}

resource "mongodbatlas_project_ip_access_list" "all" {
  project_id = mongodbatlas_project.main.id
  cidr_block = "0.0.0.0/0"
  comment    = "Allow All for MVP Verification"
}

output "psql_host" {
  value = azurerm_postgresql_flexible_server.main.fqdn
}

output "psql_admin_login" {
  value = azurerm_postgresql_flexible_server.main.administrator_login
}

output "psql_admin_password" {
  value     = azurerm_postgresql_flexible_server.main.administrator_password
  sensitive = true
}

output "psql_database_name" {
  value = azurerm_postgresql_flexible_server_database.main.name
}

output "mongodb_connection_string" {
  value     = mongodbatlas_cluster.main.connection_strings[0].standard_srv
  sensitive = true
}
