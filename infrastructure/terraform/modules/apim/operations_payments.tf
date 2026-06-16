# Auto-generated Operations for PaymentsService

resource "azurerm_api_management_api_operation" "op_payments_registerc2burls" {
  operation_id        = "RegisterC2bUrls"
  api_name            = azurerm_api_management_api.payments.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "RegisterC2bUrls"
  method              = "POST"
  url_template        = "/mpesa/c2b/register"
  depends_on          = [azurerm_api_management_api_policy.payments]
}

resource "azurerm_api_management_api_operation_policy" "pol_payments_registerc2burls" {
  api_name            = azurerm_api_management_api_operation.op_payments_registerc2burls.api_name
  api_management_name = azurerm_api_management_api_operation.op_payments_registerc2burls.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_payments_registerc2burls.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_payments_registerc2burls.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/payments/mpesa/c2b/register" />
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

resource "azurerm_api_management_api_operation" "op_payments_c2bvalidate" {
  operation_id        = "C2bValidate"
  api_name            = azurerm_api_management_api.payments.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "C2bValidate"
  method              = "POST"
  url_template        = "/mpesa/c2b/validate"
  depends_on          = [azurerm_api_management_api_policy.payments]
}

resource "azurerm_api_management_api_operation_policy" "pol_payments_c2bvalidate" {
  api_name            = azurerm_api_management_api_operation.op_payments_c2bvalidate.api_name
  api_management_name = azurerm_api_management_api_operation.op_payments_c2bvalidate.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_payments_c2bvalidate.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_payments_c2bvalidate.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/payments/mpesa/c2b/validate" />
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

resource "azurerm_api_management_api_operation" "op_payments_c2bconfirm" {
  operation_id        = "C2bConfirm"
  api_name            = azurerm_api_management_api.payments.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "C2bConfirm"
  method              = "POST"
  url_template        = "/mpesa/c2b/confirm"
  depends_on          = [azurerm_api_management_api_policy.payments]
}

resource "azurerm_api_management_api_operation_policy" "pol_payments_c2bconfirm" {
  api_name            = azurerm_api_management_api_operation.op_payments_c2bconfirm.api_name
  api_management_name = azurerm_api_management_api_operation.op_payments_c2bconfirm.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_payments_c2bconfirm.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_payments_c2bconfirm.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/payments/mpesa/c2b/confirm" />
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

resource "azurerm_api_management_api_operation" "op_payments_getpayment" {
  operation_id        = "GetPayment"
  api_name            = azurerm_api_management_api.payments.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetPayment"
  method              = "GET"
  url_template        = "/{paymentId}"
  depends_on          = [azurerm_api_management_api_policy.payments]

  template_parameter {
    name     = "paymentId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_payments_getpayment" {
  api_name            = azurerm_api_management_api_operation.op_payments_getpayment.api_name
  api_management_name = azurerm_api_management_api_operation.op_payments_getpayment.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_payments_getpayment.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_payments_getpayment.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/payments/{paymentId}" />
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

resource "azurerm_api_management_api_operation" "op_payments_getpaymentsbyapplication" {
  operation_id        = "GetPaymentsByApplication"
  api_name            = azurerm_api_management_api.payments.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetPaymentsByApplication"
  method              = "GET"
  url_template        = "/application/{applicationId}"
  depends_on          = [azurerm_api_management_api_policy.payments]

  template_parameter {
    name     = "applicationId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_payments_getpaymentsbyapplication" {
  api_name            = azurerm_api_management_api_operation.op_payments_getpaymentsbyapplication.api_name
  api_management_name = azurerm_api_management_api_operation.op_payments_getpaymentsbyapplication.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_payments_getpaymentsbyapplication.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_payments_getpaymentsbyapplication.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/payments/application/{applicationId}" />
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

resource "azurerm_api_management_api_operation" "op_payments_getunmatchedpayments" {
  operation_id        = "GetUnmatchedPayments"
  api_name            = azurerm_api_management_api.payments.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "GetUnmatchedPayments"
  method              = "GET"
  url_template        = "/unmatched"
  depends_on          = [azurerm_api_management_api_policy.payments]
}

resource "azurerm_api_management_api_operation_policy" "pol_payments_getunmatchedpayments" {
  api_name            = azurerm_api_management_api_operation.op_payments_getunmatchedpayments.api_name
  api_management_name = azurerm_api_management_api_operation.op_payments_getunmatchedpayments.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_payments_getunmatchedpayments.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_payments_getunmatchedpayments.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/payments/unmatched" />
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

resource "azurerm_api_management_api_operation" "op_payments_manualconfirmpayment" {
  operation_id        = "ManualConfirmPayment"
  api_name            = azurerm_api_management_api.payments.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "ManualConfirmPayment"
  method              = "PATCH"
  url_template        = "/{paymentId}/manual-confirm"
  depends_on          = [azurerm_api_management_api_policy.payments]

  template_parameter {
    name     = "paymentId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_payments_manualconfirmpayment" {
  api_name            = azurerm_api_management_api_operation.op_payments_manualconfirmpayment.api_name
  api_management_name = azurerm_api_management_api_operation.op_payments_manualconfirmpayment.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_payments_manualconfirmpayment.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_payments_manualconfirmpayment.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/payments/{paymentId}/manual-confirm" />
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

resource "azurerm_api_management_api_operation" "op_payments_matchpaymenttoapplication" {
  operation_id        = "MatchPaymentToApplication"
  api_name            = azurerm_api_management_api.payments.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "MatchPaymentToApplication"
  method              = "PATCH"
  url_template        = "/{paymentId}/match/{applicationId}"
  depends_on          = [azurerm_api_management_api_policy.payments]

  template_parameter {
    name     = "paymentId"
    required = true
    type     = "string"
  }
  template_parameter {
    name     = "applicationId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_payments_matchpaymenttoapplication" {
  api_name            = azurerm_api_management_api_operation.op_payments_matchpaymenttoapplication.api_name
  api_management_name = azurerm_api_management_api_operation.op_payments_matchpaymenttoapplication.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_payments_matchpaymenttoapplication.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_payments_matchpaymenttoapplication.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/payments/{paymentId}/match/{applicationId}" />
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

resource "azurerm_api_management_api_operation" "op_payments_initiatestkpush" {
  operation_id        = "InitiateStkPush"
  api_name            = azurerm_api_management_api.payments.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "InitiateStkPush"
  method              = "POST"
  url_template        = "/mpesa/stk/initiate"
  depends_on          = [azurerm_api_management_api_policy.payments]
}

resource "azurerm_api_management_api_operation_policy" "pol_payments_initiatestkpush" {
  api_name            = azurerm_api_management_api_operation.op_payments_initiatestkpush.api_name
  api_management_name = azurerm_api_management_api_operation.op_payments_initiatestkpush.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_payments_initiatestkpush.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_payments_initiatestkpush.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/payments/mpesa/stk/initiate" />
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

resource "azurerm_api_management_api_operation" "op_payments_stkpushcallback" {
  operation_id        = "StkPushCallback"
  api_name            = azurerm_api_management_api.payments.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "StkPushCallback"
  method              = "POST"
  url_template        = "/mpesa/stk/callback"
  depends_on          = [azurerm_api_management_api_policy.payments]
}

resource "azurerm_api_management_api_operation_policy" "pol_payments_stkpushcallback" {
  api_name            = azurerm_api_management_api_operation.op_payments_stkpushcallback.api_name
  api_management_name = azurerm_api_management_api_operation.op_payments_stkpushcallback.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_payments_stkpushcallback.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_payments_stkpushcallback.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/payments/mpesa/stk/callback" />
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

resource "azurerm_api_management_api_operation" "op_payments_querystkstatus" {
  operation_id        = "QueryStkStatus"
  api_name            = azurerm_api_management_api.payments.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = var.rg_name
  display_name        = "QueryStkStatus"
  method              = "GET"
  url_template        = "/mpesa/stk/query/{checkoutRequestId}"
  depends_on          = [azurerm_api_management_api_policy.payments]

  template_parameter {
    name     = "checkoutRequestId"
    required = true
    type     = "string"
  }
}

resource "azurerm_api_management_api_operation_policy" "pol_payments_querystkstatus" {
  api_name            = azurerm_api_management_api_operation.op_payments_querystkstatus.api_name
  api_management_name = azurerm_api_management_api_operation.op_payments_querystkstatus.api_management_name
  resource_group_name = azurerm_api_management_api_operation.op_payments_querystkstatus.resource_group_name
  operation_id        = azurerm_api_management_api_operation.op_payments_querystkstatus.operation_id
  xml_content         = <<XML
<policies>
    <inbound>
        <base />
        <rewrite-uri template="/payments/mpesa/stk/query/{checkoutRequestId}" />
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

