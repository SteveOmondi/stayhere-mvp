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
  default     = "South Africa North"
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

variable "skip_auth" {
  type        = bool
  description = "Skip authentication for testing"
  default     = false
}

variable "entra_client_id" {
  type        = string
  description = "Entra ID Client ID for Social Login"
  default     = ""
}

variable "entra_tenant_id" {
  type        = string
  description = "Entra ID Tenant ID"
  default     = ""
}

variable "openrouter_api_key" {
  type        = string
  description = "OpenRouter API Key for AI Agent"
  sensitive   = true
}

variable "openrouter_model" {
  type        = string
  description = "OpenRouter Model to use"
  default     = "deepseek/deepseek-chat-v3.1:free"
}

variable "openrouter_embedding_model" {
  type        = string
  description = "OpenRouter Embedding Model to use"
  default     = "nvidia/llama-nemotron-embed-vl-1b-v2:free"
}
