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

variable "groq_api_key" {
  type        = string
  description = "Groq API Key for AI Agent LLM (llama-3.3-70b-versatile)"
  sensitive   = true
}

variable "groq_model" {
  type        = string
  description = "Groq model to use for chat completions"
  default     = "llama-3.3-70b-versatile"
}

variable "google_api_key" {
  type        = string
  description = "Google AI Studio API Key for embeddings (text-embedding-004)"
  sensitive   = true
}

variable "google_embedding_model" {
  type        = string
  description = "Google AI Studio embedding model to use"
  default     = "text-embedding-004"
}

variable "onfon_client_id" {
  type        = string
  description = "OnFon SMS Client ID"
  default     = "dailat"
}

variable "onfon_api_key" {
  type        = string
  description = "OnFon SMS API Key"
  sensitive   = true
}

variable "onfon_base_url" {
  type        = string
  description = "OnFon SMS API Base URL"
  default     = "https://api.onfonmedia.co.ke"
}

variable "onfon_sender_id" {
  type        = string
  description = "OnFon SMS Sender ID"
  default     = "STAYHERE"
}
