<#
.SYNOPSIS
    Automatically syncs Azure API Management operations from live Swagger specs.

.DESCRIPTION
    For each service registered in $apiMap, this script:
      1. Discovers the Function App's live hostname from Azure
      2. Downloads the OpenAPI/Swagger JSON spec (with retry)
      3. Parses all paths + HTTP methods from the spec
      4. Diffs against existing APIM operations
      5. Creates new operations, deletes removed operations
      6. Applies JWT security policy based on apim-security-map.psd1
         (default: requires-jwt for anything not matched as "public")

    Terraform continues to own the APIM instance, API shells, API-level policies,
    and named values. This script exclusively manages individual operations and
    their operation-level security policies.

.PARAMETER ResourceGroupName
    The Azure Resource Group containing the APIM instance and Function Apps.

.PARAMETER ApimName
    The APIM service name. If not provided, auto-discovered via tag/name pattern.

.PARAMETER SecurityMapPath
    Path to the apim-security-map.json rules file. Defaults to sibling file.

.PARAMETER DryRun
    If set, prints what would be created/deleted without making any changes.

.EXAMPLE
    ./sync-apim-operations.ps1 -ResourceGroupName "rg-stayhere-dev-5c27bcf3"
    ./sync-apim-operations.ps1 -ResourceGroupName "rg-stayhere-dev-5c27bcf3" -DryRun
#>

param(
    [string]$ResourceGroupName = "rg-stayhere-dev-5c27bcf3",
    [string]$ApimName          = "",
    [string]$SecurityMapPath   = (Join-Path $PSScriptRoot "apim-security-map.json"),
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ─── Helpers ────────────────────────────────────────────────────────────────

function Write-Step  { param([string]$msg) Write-Host "`n▶ $msg" -ForegroundColor Cyan }
function Write-OK    { param([string]$msg) Write-Host "  ✔ $msg" -ForegroundColor Green }
function Write-Warn  { param([string]$msg) Write-Host "  ⚠ $msg" -ForegroundColor Yellow }
function Write-Info  { param([string]$msg) Write-Host "  · $msg" -ForegroundColor Gray }
function Write-Dry   { param([string]$msg) Write-Host "  [DRY-RUN] $msg" -ForegroundColor Magenta }

# Convert an OpenAPI path + method into an APIM-friendly operation ID.
# Uses the spec's own operationId if present, otherwise generates a slug.
function Get-OperationId {
    param([string]$Method, [string]$Path, [string]$SpecOperationId = "")

    if (-not [string]::IsNullOrWhiteSpace($SpecOperationId)) {
        # Normalize: lowercase, replace non-alphanumeric with hyphens, collapse
        return ($SpecOperationId -replace '[^a-zA-Z0-9]+', '-').ToLower().Trim('-')
    }

    # Fallback: generate from method + path segments
    $segments = $Path.TrimStart('/').Split('/') | ForEach-Object {
        # Strip braces from path params: {id} → id
        $_ -replace '[{}]', ''
    } | Where-Object { $_ -ne '' }

    $slug = ($Method.ToLower() + '-' + ($segments -join '-')) -replace '-+', '-'
    return $slug.Trim('-')
}

# Convert an OpenAPI path to an APIM url_template.
# OpenAPI uses {param}, APIM also uses {param} — no translation needed.
# However we strip any :constraint annotations (e.g. {id:guid} → {id}).
function Get-UrlTemplate {
    param([string]$Path)
    # Remove .NET route constraints like {id:guid}, {id:int}
    return $Path -replace '\{(\w+):[^}]+\}', '{$1}'
}

# Match a "METHOD:path" key against the JSON security rules array (evaluated in order).
# Supports * (single segment) and ** (any suffix) wildcards.
function Get-SecurityRule {
    param([string]$Method, [string]$Path, [array]$Rules)

    $key = "$($Method.ToUpper()):$($Path.TrimStart('/'))"

    foreach ($rule in $Rules) {
        # Skip comment-only entries
        if (-not $rule.pattern) { continue }
        $regex = '^' + [regex]::Escape($rule.pattern).Replace('\*\*', '.+').Replace('\*', '[^/]+') + '$'
        if ($key -match $regex) {
            return $rule.access
        }
    }
    # Default: requires-jwt
    return "requires-jwt"
}

# Build the JWT validation XML policy.
function Get-JwtPolicy {
    return @'
<policies>
    <inbound>
        <base />
        <validate-jwt header-name="Authorization"
                      failed-validation-httpcode="401"
                      failed-validation-error-message="Unauthorized. Access token is missing or invalid.">
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
'@
}

# Download swagger with retry logic.
function Get-SwaggerWithRetry {
    param([string]$Hostname, [int]$MaxRetries = 3, [int]$DelaySeconds = 10)

    $candidatePaths = @(
        "/api/openapi/v3.json",
        "/openapi/v3.json",
        "/api/swagger.json",
        "/swagger.json"
    )

    foreach ($path in $candidatePaths) {
        $url = "https://$Hostname$path"
        for ($attempt = 1; $attempt -le $MaxRetries; $attempt++) {
            try {
                Write-Info "Trying $url (attempt $attempt/$MaxRetries)..."
                $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 20 -ErrorAction Stop
                $json = $response.Content | ConvertFrom-Json
                if ($null -ne $json.paths) {
                    Write-OK "Swagger downloaded from $url"
                    return $json
                }
            } catch {
                if ($attempt -lt $MaxRetries) {
                    Write-Info "Failed. Retrying in ${DelaySeconds}s..."
                    Start-Sleep -Seconds $DelaySeconds
                }
            }
        }
    }
    return $null
}

# ─── Service Map ────────────────────────────────────────────────────────────

$apiMap = @(
    @{ id = "auth-api";         tag = "AuthService";         namePattern = "func-dev-auth"         },
    @{ id = "property-api";     tag = "PropertyService";     namePattern = "func-dev-property"     },
    @{ id = "customer-api";     tag = "CustomerService";     namePattern = "func-dev-customer"     },
    @{ id = "propertyowner-api";tag = "PropertyOwnerService";namePattern = "func-dev-propertyowner"},
    @{ id = "staticdata-api";   tag = "StaticDataService";   namePattern = "func-dev-staticdata"   },
    @{ id = "aiagent-api";      tag = "AiAgentService";      namePattern = "func-dev-aiagent"      }
)

# ─── Bootstrap ──────────────────────────────────────────────────────────────

Write-Step "Loading security map from: $SecurityMapPath"
if (-not (Test-Path $SecurityMapPath)) {
    Write-Error "Security map not found at: $SecurityMapPath"
    exit 1
}
$securityRules = Get-Content $SecurityMapPath -Raw | ConvertFrom-Json
Write-OK "Loaded $($securityRules.Count) security rules."

Write-Step "Installing/updating Azure API Center extension..."
az extension add --name apic-extension --upgrade --yes 2>$null | Out-Null

Write-Step "Discovering APIM instance in $ResourceGroupName..."
if ([string]::IsNullOrWhiteSpace($ApimName)) {
    $ApimName = az apim list --resource-group $ResourceGroupName `
        --query "[?contains(name, 'apim-') && !contains(name, '-apic')].name" -o tsv |
        Select-Object -First 1
}
if ([string]::IsNullOrWhiteSpace($ApimName)) {
    Write-Error "Could not discover APIM instance in resource group '$ResourceGroupName'."
    exit 1
}
Write-OK "APIM: $ApimName"

if ($DryRun) { Write-Host "`n  *** DRY-RUN MODE — no changes will be applied ***`n" -ForegroundColor Magenta }

$jwtPolicyXml = Get-JwtPolicy
$summary      = @{ Created = 0; Deleted = 0; Protected = 0; Skipped = 0 }

# ─── Per-Service Sync Loop ──────────────────────────────────────────────────

foreach ($api in $apiMap) {
    Write-Step "[$($api.id)] Syncing operations..."

    # 1. Discover Function App hostname
    $hostname = az functionapp list --resource-group $ResourceGroupName `
        --query "[?tags.Service=='$($api.tag)'].defaultHostName" -o tsv | Select-Object -First 1

    if ([string]::IsNullOrWhiteSpace($hostname)) {
        $hostname = az functionapp list --resource-group $ResourceGroupName `
            --query "[?contains(name, '$($api.namePattern)')].defaultHostName" -o tsv | Select-Object -First 1
    }

    if ([string]::IsNullOrWhiteSpace($hostname)) {
        Write-Warn "Could not find Function App for $($api.tag). Skipping."
        $summary.Skipped++
        continue
    }
    Write-Info "Function App: $hostname"

    # 2. Download Swagger
    $swagger = Get-SwaggerWithRetry -Hostname $hostname
    if ($null -eq $swagger) {
        Write-Warn "Swagger unavailable for $($api.id). Skipping (service may still be starting)."
        $summary.Skipped++
        continue
    }

    # 3. Parse all operations from Swagger
    $swaggerOps = [System.Collections.Generic.Dictionary[string, hashtable]]::new()
    foreach ($pathEntry in $swagger.paths.PSObject.Properties) {
        $rawPath = $pathEntry.Name
        $urlTemplate = Get-UrlTemplate -Path $rawPath

        foreach ($methodEntry in $pathEntry.Value.PSObject.Properties) {
            $method = $methodEntry.Name.ToUpper()
            # Skip non-HTTP-method keys (parameters, servers, etc.)
            if ($method -notin @("GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS")) { continue }

            $specOpId  = $methodEntry.Value.operationId
            $opId      = Get-OperationId -Method $method -Path $rawPath -SpecOperationId $specOpId
            $displayName = $methodEntry.Value.summary
            if ([string]::IsNullOrWhiteSpace($displayName)) { $displayName = "$method $rawPath" }

            $swaggerOps[$opId] = @{
                OperationId  = $opId
                Method       = $method
                UrlTemplate  = $urlTemplate
                DisplayName  = $displayName
                RawPath      = $rawPath
            }
        }
    }
    Write-Info "Found $($swaggerOps.Count) operations in Swagger spec."

    # 4. Get existing APIM operations
    $existingOpsRaw = az apim api operation list `
        --resource-group $ResourceGroupName `
        --service-name $ApimName `
        --api-id $($api.id) `
        -o json 2>$null | ConvertFrom-Json

    $existingOps = @{}
    if ($null -ne $existingOpsRaw) {
        foreach ($op in $existingOpsRaw) {
            $existingOps[$op.name] = $op
        }
    }
    Write-Info "Found $($existingOps.Count) existing operations in APIM."

    # 5. Determine CREATE / DELETE sets
    $toCreate = $swaggerOps.Keys | Where-Object { -not $existingOps.ContainsKey($_) }
    $toDelete  = $existingOps.Keys | Where-Object { -not $swaggerOps.ContainsKey($_) }

    # 6. DELETE removed operations
    foreach ($opId in $toDelete) {
        Write-Info "DELETE: $opId"
        if (-not $DryRun) {
            az apim api operation delete `
                --resource-group $ResourceGroupName `
                --service-name $ApimName `
                --api-id $($api.id) `
                --operation-id $opId `
                --yes 2>$null | Out-Null
            Write-OK "Deleted: $opId"
        } else {
            Write-Dry "Would delete operation: $opId"
        }
        $summary.Deleted++
    }

    # 7. CREATE new operations + apply security
    foreach ($opId in $toCreate) {
        $op = $swaggerOps[$opId]
        Write-Info "CREATE: [$($op.Method)] $($op.UrlTemplate) → $opId"

        if (-not $DryRun) {
            az apim api operation create `
                --resource-group $ResourceGroupName `
                --service-name $ApimName `
                --api-id $($api.id) `
                --operation-id $opId `
                --display-name $($op.DisplayName) `
                --method $($op.Method) `
                --url-template $($op.UrlTemplate) 2>$null | Out-Null
            Write-OK "Created: $opId"
        } else {
            Write-Dry "Would create: [$($op.Method)] $($op.UrlTemplate) → $opId"
        }
        $summary.Created++
    }

    # 8. Apply security policy to ALL operations (create + existing) based on rules
    $allOpIds = @($swaggerOps.Keys)
    foreach ($opId in $allOpIds) {
        $op   = $swaggerOps[$opId]
        $rule = Get-SecurityRule -Method $op.Method -Path $op.RawPath -Rules $securityRules

        if ($rule -eq "requires-jwt") {
            Write-Info "SECURE: $opId → JWT required"
            if (-not $DryRun) {
                # Write policy XML to a temp file (Azure CLI requires file path for policy XML)
                $tempFile = [System.IO.Path]::GetTempFileName()
                try {
                    $jwtPolicyXml | Out-File -FilePath $tempFile -Encoding utf8
                    az apim api operation policy create `
                        --resource-group $ResourceGroupName `
                        --service-name $ApimName `
                        --api-id $($api.id) `
                        --operation-id $opId `
                        --policy-id policy `
                        --value (Get-Content $tempFile -Raw) `
                        --format rawxml 2>$null | Out-Null
                } finally {
                    Remove-Item $tempFile -ErrorAction SilentlyContinue
                }
            } else {
                Write-Dry "Would apply JWT policy to: $opId"
            }
            $summary.Protected++
        } else {
            Write-Info "PUBLIC: $opId → no JWT policy"
        }
    }

    Write-OK "[$($api.id)] Done."
}

# ─── Summary ────────────────────────────────────────────────────────────────

Write-Host "`n────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  APIM Sync Complete" -ForegroundColor White
Write-Host "  Created  : $($summary.Created)" -ForegroundColor Green
Write-Host "  Deleted  : $($summary.Deleted)" -ForegroundColor Yellow
Write-Host "  Protected: $($summary.Protected) (JWT)" -ForegroundColor Cyan
Write-Host "  Skipped  : $($summary.Skipped) (Swagger unavailable)" -ForegroundColor Gray
if ($DryRun) {
    Write-Host "`n  *** DRY-RUN — no changes were applied ***" -ForegroundColor Magenta
}
Write-Host "────────────────────────────────────────────`n" -ForegroundColor DarkGray

exit 0
