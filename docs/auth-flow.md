# StayHere Authentication Flow Documentation

This document outlines the hybrid authentication strategy used by StayHere, which utilizes Microsoft Entra ID for existing users and a local OTP service for new user onboarding.

## Sequence Diagram

![Authentication Flow](images/auth-flow.png)

<details>
<summary>View Mermaid Source Code</summary>

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant App as Mobile/Web App
    participant API as APIM (Auth API)
    participant AuthSvc as AuthService (Azure Function)
    participant DB as PostgreSQL
    participant Entra as Microsoft Entra ID
    participant LocalOTP as Local OtpService

    User->>App: Enter Phone Number
    App->>API: POST /auth/login (phone)
    API->>AuthSvc: RequestOtp(phone)
    
    AuthSvc->>DB: Check if User Exists
    
    alt User Exists
        AuthSvc->>Entra: TriggerEntraPhoneOtp(phone)
        Entra-->>User: Send SMS OTP (Microsoft)
        AuthSvc-->>App: 200 OK (Entra Flow)
    else User Not Found
        AuthSvc->>LocalOTP: Generate & Send OTP
        LocalOTP-->>User: Send SMS OTP (Local/Twilio)
        AuthSvc-->>App: 200 OK (Local Flow)
    end

    User->>App: Enter OTP Code
    App->>API: POST /auth/verifyotp (phone, code)
    API->>AuthSvc: VerifyOtpAndLogin(phone, code)

    alt Local Flow
        AuthSvc->>LocalOTP: VerifyCode(code)
    else Entra Flow
        AuthSvc->>Entra: VerifyCode(code)
    end

    AuthSvc->>DB: Get/Create User & Roles
    AuthSvc->>API: Generate JWT
    API-->>App: 200 OK (JWT + User Profile)
    App->>User: Redirect to Dashboard
```
</details>

## Detailed Steps

### 1. Requesting OTP
The `AuthService` acts as a traffic controller. It queries the database to see if the phone number is recognized.
- **Existing Users**: Redirected to the Entra ID security stack. This ensures that if the user has advanced security settings or MFA enabled in Entra, those are respected.
- **New Users**: Handled by our internal `OtpService`. This allows us to track onboarding conversion and manage the sign-up experience closely.

### 2. Verifying OTP
The verification logic is similarly split.
- **Local Verification**: Checks against the `OtpVerifications` table for a match and expiry.
- **Entra Verification**: Validates the code against the Microsoft Graph API.

### 3. Session Creation
Regardless of the verification source, once validated, the system:
1.  Retrieves the user's roles (e.g., `PropertyOwner`, `Tenant`).
2.  Generates a standard JWT signed by our internal secret (stored in Key Vault).
3.  Returns the JWT to the application for all subsequent API calls.

## Infrastructure Support (IaC)
This entire flow is supported by the Terraform configurations in:
- `modules/security`: Handles the Entra App Registration and Graph Permissions.
- `modules/compute`: Configures the Function App with Key Vault references for the Entra Client Secret.
