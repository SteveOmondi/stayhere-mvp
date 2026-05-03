# Microsoft Entra ID OTP Configuration Guide

This guide explains how to configure Microsoft Entra ID (formerly Azure AD) to allow the `StayHere` AuthService to trigger phone-based OTPs for existing users.

## 1. App Registration Permissions

The application requires **Application Permissions** (not Delegated) because the backend service triggers the OTP without a signed-in user context.

### Required Microsoft Graph Permissions:
| Permission | Type | Reason |
| :--- | :--- | :--- |
| `User.Read.All` | Application | To lookup users by phone number to find their Entra Object ID. |
| `UserAuthenticationMethod.ReadWrite.All` | Application | To trigger the SMS code via the `/authentication/phoneMethods` endpoint. |

### Manual Steps (Infrastructure as Code - Terraform)

The Terraform module `infrastructure/terraform/modules/security/main.tf` has been updated to include these permissions automatically.

```hcl
resource "azuread_application" "main" {
  # ...
  required_resource_access {
    resource_app_id = "00000003-0000-0000-c000-000000000000" # Microsoft Graph
    resource_access {
      id   = "df02183c-f9d3-4921-9493-514926984c0c" # User.Read.All
      type = "Role"
    }
    resource_access {
      id   = "064f2601-523c-41c6-992a-8c7604f86d87" # UserAuthenticationMethod.ReadWrite.All
      type = "Role"
    }
  }
}
```

### Manual Actions (After Terraform Apply):
1. Navigate to **Microsoft Entra ID > App registrations**.
2. Select your app (e.g., `StayHereMVP-dev`).
3. Select **API permissions**.
4. **CRITICAL**: Click **Grant admin consent for [Your Tenant]**.

## 2. Secret Management

The `IdentityService` requires a Client Secret to authenticate as the Application. This is managed by Terraform and stored in Key Vault.

1. Terraform generates the secret: `azuread_application_password.main`.
2. Terraform stores it in Key Vault: `azurerm_key_vault_secret.entra_client_secret`.
3. The Function App pulls it via: `@Microsoft.KeyVault(...)`.

## 3. Implementation Details

When `TriggerEntraPhoneOtpAsync` is called:
1. The service authenticates with Entra ID using the Client ID and Secret.
2. It calls Graph API to find the user.
3. It triggers the SMS code flow via Microsoft Graph.

> [!NOTE]
> Ensure the users in Entra ID have a verified **Mobile Phone** property or a registered **Sms Authentication Method**.
