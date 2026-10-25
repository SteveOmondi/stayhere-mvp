# Pipeline Variables Guide

Both pipelines read configuration from the Azure DevOps variable group **`StayHere-Variables`**
(Pipelines → Library → StayHere-Variables).

| Pipeline | What it does with the group |
|---|---|
| `azure-pipelines-infra.yml` | Maps group vars to `TFV_*` env vars, writes `pipeline.auto.tfvars.json`, and runs Terraform. Terraform pushes them into Function App settings and APIM named values. The file is deleted after `plan`. |
| `azure-pipelines-app.yml` | Writes every non-empty `VITE_*` var into each portal's `.env` before `npm run build`. |

Empty or missing group values are **skipped**, so the Terraform default (or the portal's code default) applies.
You only need to set a value when you want to override the default.

---

## 1. Variables to add to the group

Mark everything in the **Secret** column as secret (padlock icon).

### Backend / Terraform (new)

| Group variable | Secret | Default if unset | Ends up as |
|---|---|---|---|
| `JWT_SECRET` | ✅ | legacy built-in key | `JWT_SECRET` on all Function Apps + APIM named value `jwt-secret` |
| `APP_MODE` | | `test` | `APP_MODE`. Set it to `live` in production to stop returning OTPs in responses. |
| `SEED_ADMIN_ENABLED` | | `false` | `SEED_ADMIN_ENABLED` (AuthService) |
| `SEED_ADMIN_USER_ID` | | `""` | `SEED_ADMIN_USER_ID` (AuthService) |
| `SEED_ADMIN_EMAIL` | | `""` | `SEED_ADMIN_EMAIL` (AuthService) |
| `SEED_ADMIN_PHONE` | | `""` | `SEED_ADMIN_PHONE` (AuthService) |
| `SEED_ADMIN_FULL_NAME` | | `Admin` | `SEED_ADMIN_FULL_NAME` (AuthService) |
| `ANTHROPIC_API_KEY` | ✅ | `""` | `Anthropic__ApiKey` (AiAgentService, floor plan analysis) |
| `ANTHROPIC_FLOOR_PLAN_MODEL` | | `claude-sonnet-5-5` | `Anthropic__FloorPlanModel` |
| `GOOGLE_FLOOR_PLAN_MODEL` | | `gemini-flash-latest` | `Google__FloorPlanModel` |
| `GROQ_FLOOR_PLAN_MODEL` | | `qwen/qwen3.8-27b` | `Groq__FloorPlanModel` |
| `FLOOR_PLAN_PROVIDER_ORDER` | | `Claude,Gemini,Qwen` | `FloorPlan__ProviderOrder` |
| `GOOGLE_MAPS_API_KEY` | ✅ | falls back to `GOOGLE_API_KEY` | `Google__MapsApiKey` (Places / nearby amenities) |

> **JWT_SECRET:** use a base64 string of at least 32 random bytes, for example from `openssl rand -base64 48`.
> Changing it signs out every user, because existing tokens stop validating.
> Function Apps and APIM always receive the same value, because both read the single `local.jwt_secret` in Terraform.

### Backend / Terraform (existing, unchanged)

`MONGODB_ATLAS_PUBLIC_KEY`, `MONGODB_ATLAS_PRIVATE_KEY`, `MONGODB_ATLAS_ORG_ID`, `SKIP_AUTH`,
`GROQ_API_KEY`, `GROQ_MODEL`, `GOOGLE_API_KEY`, `GOOGLE_EMBEDDING_MODEL`,
`ONFON_CLIENT_ID`, `ONFON_API_KEY`, `ONFON_BASE_URL`, `ONFON_SENDER_ID`,
`MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`, `MPESA_SHORTCODE`, `MPESA_ENVIRONMENT`,
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`.

### Frontend portals (new, all optional)

Each one defaults to the current APIM gateway (`https://apim-dev-5c27bcf3.azure-api.net/...`). Set them when the gateway changes or a new environment is added.

| Group variable | Admin portal | Owner portal | Example |
|---|---|---|---|
| `VITE_AUTH_API` | ✅ | ✅ | `https://<apim>.azure-api.net/auth` |
| `VITE_PROPERTY_OWNER_API` | ✅ | ✅ | `https://<apim>.azure-api.net/propertyowner` |
| `VITE_PROPERTY_API` | ✅ | ✅ | `https://<apim>.azure-api.net/property` |
| `VITE_CUSTOMER_API` | ✅ | ✅ | `https://<apim>.azure-api.net/customers` |
| `VITE_STATIC_API` | ✅ | ✅ | `https://<apim>.azure-api.net/staticdata` |
| `VITE_AI_API` | ✅ | ✅ | `https://<apim>.azure-api.net/aiagent` |
| `VITE_PAYMENTS_API` | ✅ | ✅ | `https://<apim>.azure-api.net/payments` |
| `VITE_GOOGLE_MAPS_API_KEY` (existing) | | ✅ | browser-restricted Maps key |

`VITE_*` values are compiled into public JavaScript, so never put a secret in one.
`VITE_USE_LOCAL_API` is pinned to `false` in the pipeline and should **not** be added to the group.

---

## 2. Adding a brand-new variable later

### Backend setting (Function App / APIM)

1. **Variable group:** add `MY_SETTING`. Mark it secret if needed.
2. **`azure-pipelines-infra.yml`:** in the *Generate Terraform Variables* step, add one line under `env:`:
   ```yaml
   TFV_MY_SETTING: $(MY_SETTING)
   ```
   The `TFV_` prefix is removed and the rest lowercased, so this becomes the Terraform variable `my_setting`.
3. **`infrastructure/terraform/variables.tf`:** declare it, with `sensitive = true` for secrets and a default if it's optional:
   ```hcl
   variable "my_setting" {
     type      = string
     sensitive = true
     default   = ""
   }
   ```
4. **`infrastructure/terraform/main.tf`:** pass it into the module (`my_setting = var.my_setting`).
5. **`modules/compute/main.tf`:** declare the module variable and add it to the right app's `app_settings`.
   Use `__` for nested .NET config keys (`MySection__MyKey`).
6. Run `terraform validate` locally, then let the infra pipeline run.

> Secret variables are **not** exposed to scripts automatically. Step 2 is what makes a secret visible to the pipeline. If you skip it, the value never reaches Terraform.

### Frontend setting (portal)

1. **Variable group:** add `VITE_MY_SETTING`.
2. **`azure-pipelines-app.yml`:** add `VITE_MY_SETTING: $(VITE_MY_SETTING)` under the `env:` of the relevant
   *Build StayHere…Portal* step(s). The build script writes every non-empty `VITE_*` env var into `.env`.
3. Read it in code with `import.meta.env.VITE_MY_SETTING ?? <default>`, and add it to the portal's `.env.example`.

---

## 3. Verifying a run

- **Infra pipeline:** the *Generate Terraform Variables* log lists `+ name` for each value it picked up and `- name: not set` for each one that used a default. Values are never printed.
- **App pipeline:** each portal build logs `+ VITE_…` for every variable written to `.env`.
- **After deploy:** check the settings in Azure Portal → Function App → *Environment variables*, or run:
  ```bash
  az functionapp config appsettings list -n <app> -g <rg> --query "[].name"
  ```
