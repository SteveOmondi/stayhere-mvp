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

variable "mpesa_consumer_key" {
  type        = string
  description = "Mpesa Consumer Key"
  sensitive   = true
}

variable "mpesa_consumer_secret" {
  type        = string
  description = "Mpesa Consumer Secret"
  sensitive   = true
}

variable "mpesa_passkey" {
  type        = string
  description = "Mpesa Lipa Na Mpesa Online PassKey"
  sensitive   = true
}

variable "mpesa_shortcode" {
  type        = string
  description = "Mpesa Paybill/Till Number"
  default     = "174379"
}

variable "mpesa_environment" {
  type        = string
  description = "Mpesa Environment (sandbox or production)"
  default     = "sandbox"
}

variable "r2_account_id" {
  type        = string
  description = "Cloudflare R2 Account ID"
  default     = ""
}

variable "r2_access_key_id" {
  type        = string
  description = "Cloudflare R2 Access Key ID"
  default     = ""
}

variable "r2_secret_access_key" {
  type        = string
  description = "Cloudflare R2 Secret Access Key"
  sensitive   = true
  default     = ""
}

variable "r2_bucket_name" {
  type        = string
  description = "Cloudflare R2 Bucket Name"
  default     = "stayhere"
}

variable "r2_public_base_url" {
  type        = string
  description = "Cloudflare R2 Public Base URL"
  default     = ""
}

# --- AUTH / PLATFORM ---
variable "jwt_secret" {
  type        = string
  description = "Base64 HMAC key used to sign/validate JWTs (Function Apps + APIM named value). Empty = legacy default."
  sensitive   = true
  default     = ""
}

variable "app_mode" {
  type        = string
  description = "AuthService mode: 'test' returns OTPs in responses, 'live' hides them"
  default     = "test"
}

variable "seed_admin_enabled" {
  type        = bool
  description = "Seed a platform admin user on AuthService startup"
  default     = false
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

# --- AI AGENT: FLOOR PLAN ANALYSIS & PLACES ---
variable "anthropic_api_key" {
  type        = string
  description = "Anthropic API key (Claude floor plan analysis - primary provider)"
  sensitive   = true
  default     = ""
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
  type        = string
  description = "Comma-separated fallback order of floor plan providers"
  default     = "Claude,Gemini,Qwen"
}

variable "google_maps_api_key" {
  type        = string
  description = "Google Maps/Places API key used by AiAgentService (falls back to google_api_key if empty)"
  sensitive   = true
  default     = ""
}

