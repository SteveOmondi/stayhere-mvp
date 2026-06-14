variable "rg_name" {
  type        = string
  description = "The name of the resource group"
}

variable "location" {
  type        = string
  description = "The Azure region"
}

variable "environment" {
  type        = string
  description = "The environment (e.g. dev, prod)"
}

variable "suffix" {
  type        = string
  description = "The suffix for resource naming uniqueness"
}
