variable "project_name" {
  type        = string
  description = "Project name for resource naming"
  default     = "stayhere"
}

variable "environment" {
  type        = string
  description = "Execution environment (dev, prod, etc.)"
  default     = "dev"
}

variable "location" {
  type        = string
  description = "Azure region for resources"
  default     = "East US"
}

variable "mongodb_atlas_public_key" {
  type        = string
  description = "MongoDB Atlas Public API Key"
  sensitive   = true
}

variable "mongodb_atlas_private_key" {
  type        = string
  description = "MongoDB Atlas Private API Key"
  sensitive   = true
}

variable "mongodb_atlas_org_id" {
  type        = string
  description = "MongoDB Atlas Organization ID"
}
