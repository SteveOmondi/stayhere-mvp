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
  name                   = "psql-${var.environment}-stayhere"
  resource_group_name    = var.rg_name
  location               = var.location
  version                = "15"
  administrator_login    = "psqladmin"
  administrator_password = "P@ssword1234!" # Use KeyVault in production

  storage_mb = 32768
  sku_name   = "B_Standard_B1ms"
}

resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = "stayhere"
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# MongoDB Atlas Project
resource "mongodbatlas_project" "main" {
  name   = "stayhere-${var.environment}"
  org_id = var.org_id
}

# MongoDB Atlas Cluster
resource "mongodbatlas_cluster" "main" {
  project_id   = mongodbatlas_project.main.id
  name         = "atlas-${var.environment}-stayhere"
  cluster_type = "REPLICASET"
  
  replication_specs {
    num_shards = 1
    regions_config {
      region_name     = "WESTERN_EUROPE" # Atlas region
      electable_nodes = 3
      priority        = 7
      read_only_nodes = 0
    }
  }

  cloud_backup      = true
  auto_scaling_compute_enabled = false
  provider_name     = "TENANT"
  backing_provider_name = "AZURE"
  provider_instance_size_name = "M0" # Free tier for development
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
