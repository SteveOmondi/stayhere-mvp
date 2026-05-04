# Azure Functions & APIM Standards for StayHere MVP

This document outlines the mandatory architectural and deployment standards for the StayHere microservices. **Do not deviate from these settings**, as they are required for the .NET 9 Isolated worker model and APIM routing to function correctly.

## 1. Runtime & Infrastructure
- **Worker Model**: Always use `.NET 9 Isolated` with ASP.NET Core Integration (`ConfigureFunctionsWebApplication`).
- **Discovery Fix (CRITICAL)**: Every Function App MUST have `WEBSITE_RUN_FROM_PACKAGE = "1"` in its environment variables. Without this, the Linux host will fail to discover functions.
- **Routing**: `AzureWebJobs.Http.RoutePrefix` must be set to `""` (empty string) in both `host.json` and Terraform `app_settings` to ensure root-level routing.

## 2. Deployment Pipeline (`azure-pipelines-app.yml`)
- **Packaging**: Avoid manual `ArchiveFiles@2` zipping if possible. 
- **Preferred Method**: Publish to a folder and deploy the **folder** directly using the `AzureFunctionApp@2` task. This allows the task to handle the internal structure correctly for Linux.
- **Output Path**: Always use `$(Build.ArtifactStagingDirectory)/[ServiceName]` for consistency.

## 3. API Management (APIM) Integration
- **Path Mapping**: APIM API paths (e.g., `/auth`) should map directly to the root of the Function App.
- **Host Header Override**: Every APIM operation/API must have an inbound policy that sets the `Host` header to the Function App's `default_hostname`.
- **Backend URL**: The `service_url` in APIM should not contain trailing slashes or `/api` prefixes.

## 4. Local Development
- Ensure `local.settings.json` matches the infrastructure overrides:
  ```json
  {
    "Values": {
      "AzureWebJobs.Http.RoutePrefix": ""
    }
  }
  ```

---
*Last Updated: 2026-05-04*
