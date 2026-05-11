# --- PROTECTED OPERATIONS POLICIES ---
# This file contains JWT validation for sensitive endpoints only.

locals {
  jwt_policy = <<XML
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
</policies>
XML
}

# --- CUSTOMER PROTECTION ---

# --- PROPERTY OWNER PROTECTION ---

# --- PROPERTY MANAGEMENT PROTECTION ---

# --- AUTH PROTECTION ---
