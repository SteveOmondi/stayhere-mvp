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

resource "azurerm_api_management_api_operation" "op_staticdata_getsubcategories" {
  operation_id        = "GetSubcategories"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetSubcategories"
  method              = "GET"
  url_template        = "/subcategories"
  depends_on          = [azurerm_api_management_api_policy.staticdata]
}

resource "azurerm_api_management_api_operation" "op_staticdata_getallsubcategories" {
  operation_id        = "GetAllSubcategories"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetAllSubcategories"
  method              = "GET"
  url_template        = "/subcategories/all"
  depends_on          = [azurerm_api_management_api_policy.staticdata]
}

resource "azurerm_api_management_api_operation_policy" "pol_staticdata_getallsubcategories" {
  api_name            = azurerm_api_management_api_operation.op_staticdata_getallsubcategories.api_name
  api_management_name = azurerm_api_management_api_operation.op_staticdata_getallsubcategories.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_staticdata_getallsubcategories.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_staticdata_getallsubcategories.operation_id
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

resource "azurerm_api_management_api_operation" "op_staticdata_getsubcategorybyid" {
  operation_id        = "GetSubcategoryById"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetSubcategoryById"
  method              = "GET"
  url_template        = "/subcategories/{id}"
  depends_on          = [azurerm_api_management_api_policy.staticdata]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation" "op_staticdata_getsubcategoriesbycategory" {
  operation_id        = "GetSubcategoriesByCategory"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetSubcategoriesByCategory"
  method              = "GET"
  url_template        = "/subcategories/category/{categoryId}"
  depends_on          = [azurerm_api_management_api_policy.staticdata]

  template_parameter {
    name     = "categoryId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation" "op_staticdata_getsubcategoriesbycity" {
  operation_id        = "GetSubcategoriesByCity"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetSubcategoriesByCity"
  method              = "GET"
  url_template        = "/subcategories/city/{city}"
  depends_on          = [azurerm_api_management_api_policy.staticdata]

  template_parameter {
    name     = "city"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation" "op_staticdata_getsubcategoriesbycountry" {
  operation_id        = "GetSubcategoriesByCountry"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetSubcategoriesByCountry"
  method              = "GET"
  url_template        = "/subcategories/country/{country}"
  depends_on          = [azurerm_api_management_api_policy.staticdata]

  template_parameter {
    name     = "country"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation" "op_staticdata_createsubcategory" {
  operation_id        = "CreateSubcategory"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "CreateSubcategory"
  method              = "POST"
  url_template        = "/subcategories"
  depends_on          = [azurerm_api_management_api_policy.staticdata]
}

resource "azurerm_api_management_api_operation_policy" "pol_staticdata_createsubcategory" {
  api_name            = azurerm_api_management_api_operation.op_staticdata_createsubcategory.api_name
  api_management_name = azurerm_api_management_api_operation.op_staticdata_createsubcategory.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_staticdata_createsubcategory.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_staticdata_createsubcategory.operation_id
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

resource "azurerm_api_management_api_operation" "op_staticdata_updatesubcategory" {
  operation_id        = "UpdateSubcategory"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "UpdateSubcategory"
  method              = "PUT"
  url_template        = "/subcategories/{id}"
  depends_on          = [azurerm_api_management_api_policy.staticdata]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_staticdata_updatesubcategory" {
  api_name            = azurerm_api_management_api_operation.op_staticdata_updatesubcategory.api_name
  api_management_name = azurerm_api_management_api_operation.op_staticdata_updatesubcategory.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_staticdata_updatesubcategory.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_staticdata_updatesubcategory.operation_id
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

resource "azurerm_api_management_api_operation" "op_staticdata_deletesubcategory" {
  operation_id        = "DeleteSubcategory"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "DeleteSubcategory"
  method              = "DELETE"
  url_template        = "/subcategories/{id}"
  depends_on          = [azurerm_api_management_api_policy.staticdata]

  template_parameter {
    name     = "id"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_staticdata_deletesubcategory" {
  api_name            = azurerm_api_management_api_operation.op_staticdata_deletesubcategory.api_name
  api_management_name = azurerm_api_management_api_operation.op_staticdata_deletesubcategory.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_staticdata_deletesubcategory.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_staticdata_deletesubcategory.operation_id
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

resource "azurerm_api_management_api_operation" "op_staticdata_createuserrole" {
  operation_id        = "CreateUserRole"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "CreateUserRole"
  method              = "POST"
  url_template        = "/user-roles"
  depends_on          = [azurerm_api_management_api_policy.staticdata]
}

resource "azurerm_api_management_api_operation_policy" "pol_staticdata_createuserrole" {
  api_name            = azurerm_api_management_api_operation.op_staticdata_createuserrole.api_name
  api_management_name = azurerm_api_management_api_operation.op_staticdata_createuserrole.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_staticdata_createuserrole.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_staticdata_createuserrole.operation_id
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

resource "azurerm_api_management_api_operation" "op_staticdata_createusertype" {
  operation_id        = "CreateUserType"
  api_name            = azurerm_api_management_api.staticdata.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "CreateUserType"
  method              = "POST"
  url_template        = "/user-types"
  depends_on          = [azurerm_api_management_api_policy.staticdata]
}

resource "azurerm_api_management_api_operation_policy" "pol_staticdata_createusertype" {
  api_name            = azurerm_api_management_api_operation.op_staticdata_createusertype.api_name
  api_management_name = azurerm_api_management_api_operation.op_staticdata_createusertype.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_staticdata_createusertype.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_staticdata_createusertype.operation_id
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

