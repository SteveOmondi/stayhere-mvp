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

variable "publisher_name" {
  type    = string
  default = "StayHere MVP"
}

variable "publisher_email" {
  type    = string
  default = "admin@stayhere.com"
}

variable "auth_function_host" { type = string }
variable "property_function_host" { type = string }
variable "customer_function_host" { type = string }
variable "propertyowner_function_host" { type = string }
variable "staticdata_function_host" { type = string }
variable "entra_client_id" { type = string }
variable "entra_tenant_id" { type = string }
