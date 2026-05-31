# Auto-generated Operations for StaticDataService

resource "azurerm_api_management_api_operation" "op_staticdata_getcategories" {
  operation_id        = "GetCategories"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetCategories"
  method              = "GET"
  url_template        = "/categories"
  depends_on          = [azurerm_api_management_api_policy.staticdata]
}

resource "azurerm_api_management_api_operation" "op_staticdata_getusertypes" {
  operation_id        = "GetUserTypes"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetUserTypes"
  method              = "GET"
  url_template        = "/user-types"
  depends_on          = [azurerm_api_management_api_policy.staticdata]
}

resource "azurerm_api_management_api_operation" "op_staticdata_getuserroles" {
  operation_id        = "GetUserRoles"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetUserRoles"
  method              = "GET"
  url_template        = "/user-roles"
  depends_on          = [azurerm_api_management_api_policy.staticdata]
}

resource "azurerm_api_management_api_operation" "op_staticdata_getallcategories" {
  operation_id        = "GetAllCategories"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetAllCategories"
  method              = "GET"
  url_template        = "/categories/all"
  depends_on          = [azurerm_api_management_api_policy.staticdata]
}

resource "azurerm_api_management_api_operation_policy" "pol_staticdata_getallcategories" {
  api_name            = azurerm_api_management_api_operation.op_staticdata_getallcategories.api_name
  api_management_name = azurerm_api_management_api_operation.op_staticdata_getallcategories.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_staticdata_getallcategories.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_staticdata_getallcategories.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <validate-jwt header-name="Authorization" failed-validation-httpcode="401" failed-validation-error-message="Unauthorized. Access token is missing or invalid.">
            <issuer-signing-keys>
                <key>{{jwt-secret}}</key>
            </issuer-signing-keys>
            <audiences>
                <audience>stayhere-mvp</audience>
            </audiences>
            <issuers>
                <issuer>stayhere-auth-service</issuer>
            </issuers>
        </validate-jwt>
    </inbound>
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
XML
}

resource "azurerm_api_management_api_operation" "op_staticdata_getcategorybyid" {
  operation_id        = "GetCategoryById"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetCategoryById"
  method              = "GET"
  url_template        = "/categories/{id}"
  depends_on          = [azurerm_api_management_api_policy.staticdata]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation" "op_staticdata_getcategoriesbycity" {
  operation_id        = "GetCategoriesByCity"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetCategoriesByCity"
  method              = "GET"
  url_template        = "/categories/city/{city}"
  depends_on          = [azurerm_api_management_api_policy.staticdata]

  template_parameter {
    name     = "city"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation" "op_staticdata_getcategoriesbycountry" {
  operation_id        = "GetCategoriesByCountry"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetCategoriesByCountry"
  method              = "GET"
  url_template        = "/categories/country/{country}"
  depends_on          = [azurerm_api_management_api_policy.staticdata]

  template_parameter {
    name     = "country"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation" "op_staticdata_createcategory" {
  operation_id        = "CreateCategory"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "CreateCategory"
  method              = "POST"
  url_template        = "/categories"
  depends_on          = [azurerm_api_management_api_policy.staticdata]
}

resource "azurerm_api_management_api_operation_policy" "pol_staticdata_createcategory" {
  api_name            = azurerm_api_management_api_operation.op_staticdata_createcategory.api_name
  api_management_name = azurerm_api_management_api_operation.op_staticdata_createcategory.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_staticdata_createcategory.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_staticdata_createcategory.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <validate-jwt header-name="Authorization" failed-validation-httpcode="401" failed-validation-error-message="Unauthorized. Access token is missing or invalid.">
            <issuer-signing-keys>
                <key>{{jwt-secret}}</key>
            </issuer-signing-keys>
            <audiences>
                <audience>stayhere-mvp</audience>
            </audiences>
            <issuers>
                <issuer>stayhere-auth-service</issuer>
            </issuers>
        </validate-jwt>
    </inbound>
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
XML
}

resource "azurerm_api_management_api_operation" "op_staticdata_updatecategory" {
  operation_id        = "UpdateCategory"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "UpdateCategory"
  method              = "PUT"
  url_template        = "/categories/{id}"
  depends_on          = [azurerm_api_management_api_policy.staticdata]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_staticdata_updatecategory" {
  api_name            = azurerm_api_management_api_operation.op_staticdata_updatecategory.api_name
  api_management_name = azurerm_api_management_api_operation.op_staticdata_updatecategory.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_staticdata_updatecategory.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_staticdata_updatecategory.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <validate-jwt header-name="Authorization" failed-validation-httpcode="401" failed-validation-error-message="Unauthorized. Access token is missing or invalid.">
            <issuer-signing-keys>
                <key>{{jwt-secret}}</key>
            </issuer-signing-keys>
            <audiences>
                <audience>stayhere-mvp</audience>
            </audiences>
            <issuers>
                <issuer>stayhere-auth-service</issuer>
            </issuers>
        </validate-jwt>
    </inbound>
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
XML
}

resource "azurerm_api_management_api_operation" "op_staticdata_deletecategory" {
  operation_id        = "DeleteCategory"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "DeleteCategory"
  method              = "DELETE"
  url_template        = "/categories/{id}"
  depends_on          = [azurerm_api_management_api_policy.staticdata]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_staticdata_deletecategory" {
  api_name            = azurerm_api_management_api_operation.op_staticdata_deletecategory.api_name
  api_management_name = azurerm_api_management_api_operation.op_staticdata_deletecategory.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_staticdata_deletecategory.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_staticdata_deletecategory.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <validate-jwt header-name="Authorization" failed-validation-httpcode="401" failed-validation-error-message="Unauthorized. Access token is missing or invalid.">
            <issuer-signing-keys>
                <key>{{jwt-secret}}</key>
            </issuer-signing-keys>
            <audiences>
                <audience>stayhere-mvp</audience>
            </audiences>
            <issuers>
                <issuer>stayhere-auth-service</issuer>
            </issuers>
        </validate-jwt>
    </inbound>
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
XML
}

