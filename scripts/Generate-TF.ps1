$ErrorActionPreference = 'Stop'

$jsonRules = Get-Content 'd:\samples\AG\repos\StayHereMVP\scripts\apim-security-map.json' | ConvertFrom-Json

function Get-RequiresJwt {
    param($method, $route)
    $testStr = "$([string]$method.ToString().ToUpper()):$route"
    foreach ($rule in $jsonRules) {
        if ($rule.pattern -and $rule.access) {
            $pattern = "^" + [regex]::Escape($rule.pattern).Replace("\*", ".*") + "$"
            if ($testStr -match $pattern) {
                return $rule.access -eq 'requires-jwt'
            }
        }
    }
    return $null
}

$map = @{
    'AuthService' = 'auth_api'
    'CustomerService' = 'customer'
    'PropertyOwnerService' = 'propertyowner'
    'PropertyService' = 'property'
    'StaticDataService' = 'staticdata'
    'AiAgentService' = 'aiagent'
    'PaymentsService' = 'payments'
    'LoggingService' = 'logging'
}

$files = Get-ChildItem -Path "d:\samples\AG\repos\StayHereMVP\src\FunctionApps" -Recurse -Filter "*.cs"

foreach ($app in $map.Keys) {
    $apiName = $map[$app]
    $policyName = if ($apiName -eq 'auth_api') { 'auth' } else { $apiName }
    $tfLines = @()
    $tfLines += "# Auto-generated Operations for $app"
    $tfLines += ""
    
    $appFiles = $files | Where-Object { $_.FullName -like "*\$app\*" }
    
    foreach ($f in $appFiles) {
        $content = Get-Content $f.FullName -Raw
        $funcMatches = [regex]::Matches($content, '\[Function\("([^"]+)"\)\]')
        
        foreach ($m in $funcMatches) {
            $funcName = $m.Groups[1].Value
            $startIndex = $m.Index
            
            $httpRegex = '\[HttpTrigger\([^,]*,((?:\s*"[^"]+"\s*,?)+)(?:\s*Route\s*=\s*"([^"]+)")?[^\]]*\)\]'
            $httpMatch = [regex]::Match($content.Substring($startIndex), $httpRegex)
            
            if ($httpMatch.Success -and $httpMatch.Index -lt 2000) {
                $methodsStr = $httpMatch.Groups[1].Value
                $methods = @([regex]::Matches($methodsStr, '"([^"]+)"') | ForEach-Object { $_.Groups[1].Value.ToUpper() })
                $routeRaw = $httpMatch.Groups[2].Value
                if ([string]::IsNullOrEmpty($routeRaw)) { $routeRaw = $funcName.ToLower() }
                
                $backendTemplate = "/" + ($routeRaw -replace '\{(\w+):[^}]+\}', '{$1}')
                $frontendTemplate = $backendTemplate
                
                # $apiName maps to API paths like 'auth', 'customers', etc.
                # But actual API paths are defined in main.tf
                $apiPaths = @{
                    'auth_api' = 'auth'
                    'customer' = 'customers'
                    'propertyowner' = 'propertyowner'
                    'property' = 'property'
                    'staticdata' = 'staticdata'
                    'aiagent' = 'aiagent'
                    'payments' = 'payments'
                    'logging' = 'logging'
                }
                $apiPath = $apiPaths[$apiName]
                
                if ($frontendTemplate.StartsWith("/$apiPath/")) {
                    $frontendTemplate = $frontendTemplate.Substring($apiPath.Length + 1)
                } elseif ($frontendTemplate -eq "/$apiPath") {
                    $frontendTemplate = "/"
                }
                
                $req1 = Get-RequiresJwt $methods[0] $routeRaw
                $req2 = Get-RequiresJwt $methods[0] ($frontendTemplate.TrimStart('/'))
                
                $requiresJwt = $true
                if ($null -ne $req1) { $requiresJwt = $req1 }
                elseif ($null -ne $req2) { $requiresJwt = $req2 }
                
                $tfLines += "resource `"azurerm_api_management_api_operation`" `"op_$($apiName)_$($funcName.ToLower())`" {"
                $tfLines += "  operation_id        = `"$funcName`""
                $tfLines += "  api_name            = azurerm_api_management_api.$apiName.name"
                $tfLines += "  api_management_name = azurerm_api_management.main.name"
                $tfLines += "  resource_group_name = var.rg_name"
                $tfLines += "  display_name        = `"$funcName`""
                $tfLines += "  method              = `"$($methods[0])`""
                $tfLines += "  url_template        = `"$frontendTemplate`""
                $tfLines += "  depends_on          = [azurerm_api_management_api_policy.$policyName]"
                
                $paramMatches = [regex]::Matches($frontendTemplate, '\{([^}]+)\}')
                if ($paramMatches.Count -gt 0) {
                    $tfLines += ""
                    foreach ($p in $paramMatches) {
                        $tfLines += "  template_parameter {"
                        $tfLines += "    name     = `"$($p.Groups[1].Value)`""
                        $tfLines += "    required = true"
                        $tfLines += "    type     = `"string`""
                        $tfLines += "  }"
                    }
                }
                $tfLines += "}"
                $tfLines += ""
                
                if ($requiresJwt -or ($frontendTemplate -ne $backendTemplate)) {
                    $tfLines += "resource `"azurerm_api_management_api_operation_policy`" `"pol_$($apiName)_$($funcName.ToLower())`" {"
                    $tfLines += "  api_name            = azurerm_api_management_api_operation.op_$($apiName)_$($funcName.ToLower()).api_name"
                    $tfLines += "  api_management_name = azurerm_api_management_api_operation.op_$($apiName)_$($funcName.ToLower()).api_management_name"
                    $tfLines += "  resource_group_name = azurerm_api_management_api_operation.op_$($apiName)_$($funcName.ToLower()).resource_group_name"
                    $tfLines += "  operation_id        = azurerm_api_management_api_operation.op_$($apiName)_$($funcName.ToLower()).operation_id"
                    $tfLines += "  xml_content         = <<XML"
                    $tfLines += "<policies>`n    <inbound>`n        <base />"
                    
                    if ($frontendTemplate -ne $backendTemplate) {
                        $tfLines += "        <rewrite-uri template=`"$backendTemplate`" />"
                    }
                    if ($requiresJwt) {
                        $tfLines += "        <validate-jwt header-name=`"Authorization`" failed-validation-httpcode=`"401`" failed-validation-error-message=`"Unauthorized. Access token is missing or invalid.`">"
                        $tfLines += "            <issuer-signing-keys>`n                <key>{{jwt-secret}}</key>`n            </issuer-signing-keys>"
                        $tfLines += "            <audiences>`n                <audience>stayhere-mvp</audience>`n            </audiences>"
                        $tfLines += "            <issuers>`n                <issuer>stayhere-auth-service</issuer>`n            </issuers>"
                        $tfLines += "        </validate-jwt>"
                    }
                    
                    $tfLines += "    </inbound>`n    <backend>`n        <base />`n    </backend>`n    <outbound>`n        <base />`n    </outbound>`n    <on-error>`n        <base />`n    </on-error>`n</policies>"
                    $tfLines += "XML"
                    $tfLines += "}"
                    $tfLines += ""
                }
            }
        }
    }
    
    $outPath = "d:\samples\AG\repos\StayHereMVP\infrastructure\terraform\modules\apim\operations_$($apiName).tf"
    $tfLines | Out-File -FilePath $outPath -Encoding utf8
}
