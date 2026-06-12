output "rg_name" {
  value = azurerm_resource_group.main.name
}

output "auth_function_name" {
  value = module.compute.auth_function_name
}

output "property_function_name" {
  value = module.compute.property_function_name
}

output "customer_function_name" {
  value = module.compute.customer_function_name
}

output "propertyowner_function_name" {
  value = module.compute.propertyowner_function_name
}

output "staticdata_function_name" {
  value = module.compute.staticdata_function_name
}

output "admin_portal_url" {
  value       = module.frontend.admin_portal_url
  description = "The static website URL of the Admin Portal"
}

output "owner_portal_url" {
  value       = module.frontend.owner_portal_url
  description = "The static website URL of the Property Owner Portal"
}
