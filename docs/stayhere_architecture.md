# Azure Serverless Property Management System
## Complete Architecture Document

---

## 1. Monorepo Folder Structure

```
property-management-system/
├── .github/
│   └── workflows/
│       ├── deploy-property-service.yml
│       ├── deploy-billing-service.yml
│       ├── deploy-contract-service.yml
│       └── deploy-maintenance-service.yml
├── src/
│   ├── FunctionApps/
│   │   ├── PropertyService/
│   │   │   ├── PropertyService.csproj
│   │   │   ├── host.json
│   │   │   ├── local.settings.json
│   │   │   ├── Functions/
│   │   │   │   ├── CreateProperty.cs
│   │   │   │   ├── GetProperties.cs
│   │   │   │   ├── UpdateProperty.cs
│   │   │   │   ├── DeleteProperty.cs
│   │   │   │   └── SearchProperties.cs
│   │   │   ├── Models/
│   │   │   │   ├── PropertyDto.cs
│   │   │   │   └── PropertySearchRequest.cs
│   │   │   └── Services/
│   │   │       ├── IPropertyRepository.cs
│   │   │       ├── PropertyRepository.cs
│   │   │       └── PropertyCacheService.cs
│   │   │
│   │   ├── BillingService/
│   │   │   ├── BillingService.csproj
│   │   │   ├── host.json
│   │   │   ├── local.settings.json
│   │   │   ├── Functions/
│   │   │   │   ├── CreatePayment.cs
│   │   │   │   ├── GetPaymentHistory.cs
│   │   │   │   ├── ProcessRecurringBilling.cs (Timer)
│   │   │   │   ├── GenerateInvoice.cs
│   │   │   │   └── SendPaymentReminder.cs
│   │   │   ├── Models/
│   │   │   │   ├── PaymentDto.cs
│   │   │   │   └── InvoiceDto.cs
│   │   │   └── Services/
│   │   │       ├── IPaymentRepository.cs
│   │   │       ├── PaymentRepository.cs
│   │   │       └── InvoiceGenerator.cs
│   │   │
│   │   ├── ContractService/
│   │   │   ├── ContractService.csproj
│   │   │   ├── host.json
│   │   │   ├── local.settings.json
│   │   │   ├── Functions/
│   │   │   │   ├── CreateLease.cs
│   │   │   │   ├── GetLeases.cs
│   │   │   │   ├── UpdateLease.cs
│   │   │   │   ├── TerminateLease.cs
│   │   │   │   └── CheckLeaseExpiration.cs (Timer)
│   │   │   ├── Models/
│   │   │   │   ├── LeaseDto.cs
│   │   │   │   └── LeaseTerminationRequest.cs
│   │   │   └── Services/
│   │   │       ├── ILeaseRepository.cs
│   │   │       ├── LeaseRepository.cs
│   │   │       └── ContractDocumentService.cs
│   │   │
│   │   └── MaintenanceService/
│   │       ├── MaintenanceService.csproj
│   │       ├── host.json
│   │       ├── local.settings.json
│   │       ├── Functions/
│   │       │   ├── CreateMaintenanceRequest.cs
│   │       │   ├── GetMaintenanceRequests.cs
│   │       │   ├── UpdateRequestStatus.cs
│   │       │   ├── AssignTechnician.cs
│   │       │   └── SendStatusNotification.cs
│   │       ├── Models/
│   │       │   ├── MaintenanceRequestDto.cs
│   │       │   └── TechnicianAssignment.cs
│   │       └── Services/
│   │           ├── IMaintenanceRepository.cs
│   │           ├── MaintenanceRepository.cs
│   │           └── NotificationService.cs
│   │
│   ├── Shared/
│   │   ├── PropertyManagement.Shared/
│   │   │   ├── PropertyManagement.Shared.csproj
│   │   │   ├── Database/
│   │   │   │   ├── DbContext/
│   │   │   │   │   └── PropertyManagementDbContext.cs
│   │   │   │   └── Entities/
│   │   │   │       ├── User.cs
│   │   │   │       ├── Property.cs
│   │   │   │       ├── Lease.cs
│   │   │   │       ├── Payment.cs
│   │   │   │       └── MaintenanceRequest.cs
│   │   │   ├── Middleware/
│   │   │   │   ├── AuthenticationMiddleware.cs
│   │   │   │   └── ExceptionHandlingMiddleware.cs
│   │   │   ├── Extensions/
│   │   │   │   ├── ServiceCollectionExtensions.cs
│   │   │   │   └── ConfigurationExtensions.cs
│   │   │   └── Constants/
│   │   │       ├── CacheKeys.cs
│   │   │       └── QueueNames.cs
│   │
│   └── Infrastructure/
│       ├── bicep/
│       │   ├── main.bicep
│       │   ├── modules/
│       │   │   ├── function-app.bicep
│       │   │   ├── postgresql.bicep
│       │   │   ├── redis.bicep
│       │   │   ├── signalr.bicep
│       │   │   ├── storage.bicep
│       │   │   └── apim.bicep
│       │   └── parameters/
│       │       ├── dev.parameters.json
│       │       └── prod.parameters.json
│       │
│       └── terraform/ (alternative to Bicep)
│           ├── main.tf
│           ├── variables.tf
│           └── modules/
│
├── tests/
│   ├── PropertyService.Tests/
│   ├── BillingService.Tests/
│   ├── ContractService.Tests/
│   └── MaintenanceService.Tests/
│
├── docs/
│   ├── api/
│   │   └── openapi.yaml
│   └── architecture/
│       └── ADRs/
│
├── .gitignore
├── README.md
└── global.json
```

## 2. Architecture Diagram

![System Architecture](./images/azure-stayhere.svg)

## 3. Cost Breakdown Analysis

### 3.1 Monthly Cost Estimates (Low Usage Scenario)

| Service | SKU/Tier | Monthly Cost | Free Tier | Notes |
|---------|----------|--------------|-----------|-------|
| **Azure Functions (4 apps)** | Consumption Plan | $0 - $20 | 1M executions, 400K GB-s free | Pay only for actual executions |
| **PostgreSQL Flexible Server** | Burstable B1ms (1vCore, 2GB) | ~$13 | None | Can stop when not in use |
| **Azure Cache for Redis** | Basic C0 (250MB) | ~$16 | None | Sufficient for caching patterns |
| **Azure SignalR Service** | Free Tier | $0 | 20 concurrent, 20K msg/day | Serverless mode |
| **Azure Blob Storage** | Standard LRS | ~$5 | First 5GB free | With lifecycle management |
| **API Management** | Consumption Tier | $0 - $5 | 1M calls free | Pay per call after |
| **Cloudflare** | Free Plan | $0 | Unlimited bandwidth | CDN + WAF included |
| **Application Insights** | Pay-as-you-go | $0 - $10 | 5GB free/month | Log sampling enabled |
| **Azure Monitor** | Included | $0 | Basic metrics free | Essential monitoring |

**Total Monthly Cost: $34 - $69**

### 4.2 Cost Optimization Strategies

#### 4.2.1 Compute Optimization
- **Consumption Plan**: Pay only for actual executions (0.2M free/month)
- **Cold Start Mitigation**: Keep function warm with health check pings (minimal cost)
- **Execution Time**: Optimize code to complete in <1 second where possible
- **Memory Allocation**: Use 512MB default (lower costs than 1GB+)

#### 4.2.2 Database Optimization
- **Burstable SKU**: Auto-scales from 0-100% of vCore when needed
- **Stop/Start**: Stop database during non-business hours (development)
- **Connection Pooling**: Reuse connections to minimize overhead
- **Read Replicas**: Not needed for low traffic; use Redis cache instead

#### 4.2.3 Caching Strategy
- **Redis C0**: 250MB sufficient for property listings and user sessions
- **Cache Duration**: 5-15 minutes for frequently accessed data
- **Cache Keys**: Use hierarchical keys for efficient invalidation
- **Eviction Policy**: LRU (Least Recently Used)

#### 4.2.4 Storage Optimization
- **Lifecycle Management**:
  - Hot tier: Active property images (0-30 days)
  - Cool tier: Older property images (30-90 days)
  - Archive tier: Historical documents (90+ days)
- **Compression**: Use WebP for images (30-50% smaller than JPEG)
- **CDN Offloading**: Serve 95%+ of static content via Cloudflare

#### 4.2.5 SignalR Optimization
- **Free Tier Limits**: 20 concurrent connections, 20K messages/day
- **Serverless Mode**: Pay only for messages sent
- **Connection Management**: Auto-disconnect idle clients after 5 minutes
- **Message Batching**: Combine notifications where possible

#### 4.2.6 APIM Optimization
- **Consumption Tier**: No upfront cost, $0.035 per 10K calls
- **Caching**: Enable APIM response caching for GET endpoints
- **Rate Limiting**: Prevent abuse and unnecessary backend calls

### 4.3 Scaling Cost Estimates

#### Medium Traffic (1000 active users)
| Service | Estimated Cost |
|---------|----------------|
| Functions | $50 - $80 |
| PostgreSQL (B2s) | $25 |
| Redis (C1 1GB) | $55 |
| SignalR (Standard 1 Unit) | $50 |
| Storage | $15 |
| APIM | $15 |
| **Total** | **$210 - $240/month** |

#### High Traffic (10,000+ active users)
| Service | Estimated Cost |
|---------|----------------|
| Functions (Premium Plan EP1) | $150 |
| PostgreSQL (GP 2vCore) | $150 |
| Redis (P1 6GB) | $250 |
| SignalR (Standard 5 Units) | $250 |
| Storage | $50 |
| APIM (Standard) | $750 |
| **Total** | **$1,600/month** |

---

## 5. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE EDGE                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │   CDN    │  │   WAF    │  │   DNS    │  │  DDoS Protection │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘    │
└───────┼─────────────┼─────────────┼─────────────────┼──────────────┘
        │             │             │                 │
        └─────────────┴─────────────┴─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AZURE API MANAGEMENT                              │
│                     (Consumption Tier)                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  • Rate Limiting  • Authentication  • Response Caching       │   │
│  │  • Request Transformation  • Logging & Analytics             │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────┬────────────┬────────────┬─────────────┬───────────────────┘
         │            │            │             │
    ┌────▼────┐  ┌───▼────┐  ┌───▼─────┐  ┌────▼────────┐
    │Property │  │Billing │  │Contract │  │ Maintenance │
    │ Service │  │Service │  │ Service │  │   Service   │
    └────┬────┘  └───┬────┘  └───┬─────┘  └────┬────────┘
         │           │           │             │
         └───────────┴───────────┴─────────────┘
                      │
         ┌────────────┼────────────┬──────────────┐
         │            │            │              │
    ┌────▼─────┐ ┌───▼──────┐ ┌──▼────────┐ ┌───▼────────┐
    │PostgreSQL│ │  Redis   │ │  SignalR  │ │Blob Storage│
    │ Flexible │ │  Cache   │ │  Service  │ │ (Hot/Cool/ │
    │  Server  │ │  (C0)    │ │(Serverless)│ │  Archive)  │
    └──────────┘ └──────────┘ └───────────┘ └────────────┘
```

### 5.1 Detailed Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       CLIENT APPLICATIONS                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Web App    │  │  Mobile App  │  │  Admin Panel │          │
│  │  (React/Vue) │  │(React Native)│  │   (Blazor)   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                   ┌─────────▼──────────┐
                   │   Cloudflare CDN   │
                   │   • Static Assets   │
                   │   • Image Optimization│
                   │   • WAF Protection  │
                   └─────────┬──────────┘
                             │
                   ┌─────────▼──────────┐
                   │  Azure APIM        │
                   │  Gateway           │
                   └─────────┬──────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼──────┐    ┌─────▼──────┐    ┌─────▼──────┐
    │  Property  │    │  Billing   │    │  Contract  │
    │  Function  │    │  Function  │    │  Function  │
    │    App     │    │    App     │    │    App     │
    │            │    │            │    │            │
    │ •Create    │    │ •Payment   │    │ •Create    │
    │ •Read      │    │ •Invoice   │    │ •Renew     │
    │ •Update    │    │ •Recurring │    │ •Terminate │
    │ •Delete    │    │ •Reminder  │    │ •Document  │
    │ •Search    │    │            │    │            │
    └─────┬──────┘    └─────┬──────┘    └─────┬──────┘
          │                 │                  │
          └─────────────────┼──────────────────┘
                           │
    ┌────────────────────┬─┴──┬────────────────────┐
    │                    │    │                    │
┌───▼────────┐   ┌──────▼───────┐   ┌────▼──────────┐
│ PostgreSQL │   │ Redis Cache  │   │  SignalR      │
│            │   │              │   │  Service      │
│ •Users     │   │ •Property    │   │               │
│ •Properties│   │  Listings    │   │ •Real-time    │
│ •Leases    │   │ •User        │   │  Notifications│
│ •Payments  │   │  Sessions    │   │ •Chat         │
│ •Maintenance│  │ •Search      │   │ •Updates      │
│            │   │  Results     │   │               │
└────────────┘   └──────────────┘   └───────────────┘

                   ┌──────────────────┐
                   │  Blob Storage    │
                   │                  │
                   │ Hot:  Images     │
                   │ Cool: Documents  │
                   │ Archive: History │
                   └──────────────────┘
```

---

## 6. Infrastructure as Code - Bicep Module Example

### 6.1 main.bicep

```bicep
targetScope = 'resourceGroup'

@description('Environment name')
param environment string = 'dev'

@description('Location for all resources')
param location string = resourceGroup().location

@description('Base name for all resources')
param baseName string = 'propmgmt'

// Variables
var storageAccountName = '${baseName}${environment}sa'
var functionAppNames = [
  '${baseName}-property-${environment}'
  '${baseName}-billing-${environment}'
  '${baseName}-contract-${environment}'
  '${baseName}-maintenance-${environment}'
]

// Storage Account for Functions
module storage 'modules/storage.bicep' = {
  name: 'storage-deployment'
  params: {
    storageAccountName: storageAccountName
    location: location
  }
}

// PostgreSQL Database
module database 'modules/postgresql.bicep' = {
  name: 'database-deployment'
  params: {
    serverName: '${baseName}-${environment}-pg'
    location: location
    administratorLogin: 'pgadmin'
    administratorLoginPassword: 'P@ssw0rd123!' // Use Key Vault in production
    skuName: 'Standard_B1ms'
    skuTier: 'Burstable'
  }
}

// Redis Cache
module redis 'modules/redis.bicep' = {
  name: 'redis-deployment'
  params: {
    redisCacheName: '${baseName}-${environment}-redis'
    location: location
    sku: {
      name: 'Basic'
      family: 'C'
      capacity: 0
    }
  }
}

// SignalR Service
module signalr 'modules/signalr.bicep' = {
  name: 'signalr-deployment'
  params: {
    signalRName: '${baseName}-${environment}-signalr'
    location: location
    sku: 'Free_F1'
    serviceMode: 'Serverless'
  }
}

// Function Apps
module propertyFunction 'modules/function-app.bicep' = {
  name: 'property-function-deployment'
  params: {
    functionAppName: functionAppNames[0]
    location: location
    storageAccountName: storage.outputs.storageAccountName
    runtime: 'dotnet-isolated'
    runtimeVersion: '8.0'
  }
}

module billingFunction 'modules/function-app.bicep' = {
  name: 'billing-function-deployment'
  params: {
    functionAppName: functionAppNames[1]
    location: location
    storageAccountName: storage.outputs.storageAccountName
    runtime: 'dotnet-isolated'
    runtimeVersion: '8.0'
  }
}

module contractFunction 'modules/function-app.bicep' = {
  name: 'contract-function-deployment'
  params: {
    functionAppName: functionAppNames[2]
    location: location
    storageAccountName: storage.outputs.storageAccountName
    runtime: 'dotnet-isolated'
    runtimeVersion: '8.0'
  }
}

module maintenanceFunction 'modules/function-app.bicep' = {
  name: 'maintenance-function-deployment'
  params: {
    functionAppName: functionAppNames[3]
    location: location
    storageAccountName: storage.outputs.storageAccountName
    runtime: 'dotnet-isolated'
    runtimeVersion: '8.0'
  }
}

// API Management
module apim 'modules/apim.bicep' = {
  name: 'apim-deployment'
  params: {
    apimName: '${baseName}-${environment}-apim'
    location: location
    publisherEmail: 'admin@propertymgmt.com'
    publisherName: 'Property Management'
    sku: 'Consumption'
  }
}
```

### 6.2 modules/function-app.bicep

```bicep
param functionAppName string
param location string
param storageAccountName string
param runtime string
param runtimeVersion string

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' existing = {
  name: storageAccountName
}

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${functionAppName}-plan'
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {
    reserved: true
  }
}

resource functionApp 'Microsoft.Web/sites@2023-01-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: '${runtime}|${runtimeVersion}'
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: runtime
        }
      ]
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
    }
    httpsOnly: true
  }
}

output functionAppId string = functionApp.id
output functionAppName string = functionApp.name
```

---

## 7. Key Implementation Patterns

### 7.1 Repository Pattern

```csharp
public interface IPropertyRepository
{
    Task<Property> GetByIdAsync(Guid id);
    Task<IEnumerable<Property>> GetAllAsync();
    Task<Property> CreateAsync(PropertyDto dto);
    Task<Property> UpdateAsync(Guid id, PropertyDto dto);
    Task<bool> DeleteAsync(Guid id);
    Task<IEnumerable<Property>> SearchAsync(PropertySearchRequest request);
}

public class PropertyRepository : IPropertyRepository
{
    private readonly NpgsqlConnection _connection;
    private readonly ILogger<PropertyRepository> _logger;

    public PropertyRepository(NpgsqlConnection connection, ILogger<PropertyRepository> logger)
    {
        _connection = connection;
        _logger = logger;
    }

    public async Task<Property> CreateAsync(PropertyDto dto)
    {
        await _connection.OpenAsync();
        
        using var cmd = new NpgsqlCommand(@"
            INSERT INTO properties (owner_id, property_type, status, street_address, 
                city, state, postal_code, country, bedrooms, bathrooms, 
                square_feet, monthly_rent, security_deposit, title, description)
            VALUES (@OwnerId, @PropertyType, @Status, @StreetAddress, @City, 
                @State, @PostalCode, @Country, @Bedrooms, @Bathrooms, 
                @SquareFeet, @MonthlyRent, @SecurityDeposit, @Title, @Description)
            RETURNING property_id, created_at", _connection);

        // Add parameters
        cmd.Parameters.AddWithValue("@OwnerId", dto.OwnerId);
        cmd.Parameters.AddWithValue("@PropertyType", dto.PropertyType);
        // ... add other parameters

        using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            dto.PropertyId = reader.GetGuid(0);
            dto.CreatedAt = reader.GetDateTime(1);
        }

        return MapToEntity(dto);
    }

    public async Task<IEnumerable<Property>> SearchAsync(PropertySearchRequest request)
    {
        await _connection.OpenAsync();
        
        var query = @"
            SELECT * FROM properties 
            WHERE is_published = true
            AND (@City IS NULL OR city ILIKE @City)
            AND (@MinRent IS NULL OR monthly_rent >= @MinRent)
            AND (@MaxRent IS NULL OR monthly_rent <= @MaxRent)
            AND (@Bedrooms IS NULL OR bedrooms >= @Bedrooms)
            ORDER BY created_at DESC
            LIMIT @Limit OFFSET @Offset";

        using var cmd = new NpgsqlCommand(query, _connection);
        cmd.Parameters.AddWithValue("@City", (object)request.City ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@MinRent", (object)request.MinRent ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@MaxRent", (object)request.MaxRent ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Bedrooms", (object)request.Bedrooms ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@Limit", request.PageSize);
        cmd.Parameters.AddWithValue("@Offset", (request.Page - 1) * request.PageSize);

        var properties = new List<Property>();
        using var reader = await cmd.ExecuteReaderAsync();
        
        while (await reader.ReadAsync())
        {
            properties.Add(MapReaderToEntity(reader));
        }

        return properties;
    }
}
```

### 7.2 Cache-Aside Pattern

```csharp
public class PropertyCacheService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly IPropertyRepository _repository;
    private readonly ILogger<PropertyCacheService> _logger;
    private readonly IDatabase _cache;

    public PropertyCacheService(
        IConnectionMultiplexer redis,
        IPropertyRepository repository,
        ILogger<PropertyCacheService> logger)
    {
        _redis = redis;
        _repository = repository;
        _logger = logger;
        _cache = _redis.GetDatabase();
    }

    public async Task<Property> GetPropertyAsync(Guid propertyId)
    {
        var cacheKey = $"property:{propertyId}";
        
        // Try cache first
        var cachedData = await _cache.StringGetAsync(cacheKey);
        if (cachedData.HasValue)
        {
            _logger.LogInformation($"Cache hit for property {propertyId}");
            return JsonSerializer.Deserialize<Property>(cachedData);
        }

        // Cache miss - get from database
        _logger.LogInformation($"Cache miss for property {propertyId}");
        var property = await _repository.GetByIdAsync(propertyId);
        
        if (property != null)
        {
            // Cache for 10 minutes
            var json = JsonSerializer.Serialize(property);
            await _cache.StringSetAsync(cacheKey, json, TimeSpan.FromMinutes(10));
        }

        return property;
    }

    public async Task InvalidatePropertyCacheAsync(Guid propertyId)
    {
        await _cache.KeyDeleteAsync($"property:{propertyId}");
        await _cache.KeyDeleteAsync("properties:all");
    }
}
```

---

## 8. Security Best Practices

### 8.1 Authentication & Authorization

```csharp
public class AuthenticationMiddleware
{
    private readonly RequestDelegate _next;

    public AuthenticationMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Extract JWT token from header
        var token = context.Request.Headers["Authorization"]
            .FirstOrDefault()?.Split(" ").Last();

        if (token != null)
        {
            AttachUserToContext(context, token);
        }

        await _next(context);
    }

    private void AttachUserToContext(HttpContext context, string token)
    {
        // Validate JWT and attach user claims
        // Implementation depends on your auth provider (Azure AD B2C, Auth0, etc.)
    }
}
```

### 8.2 Connection String Management

```csharp
// Use Azure Key Vault for secrets
public static class ConfigurationExtensions
{
    public static void AddAzureKeyVault(this IConfigurationBuilder builder)
    {
        var keyVaultEndpoint = Environment.GetEnvironmentVariable("KeyVaultEndpoint");
        if (!string.IsNullOrEmpty(keyVaultEndpoint))
        {
            builder.AddAzureKeyVault(
                new Uri(keyVaultEndpoint),
                new DefaultAzureCredential());
        }
    }
}
```

---

## 9. Monitoring & Observability

### 9.1 Application Insights Configuration

```csharp
public class TelemetryConfiguration
{
    public static void Configure(IServiceCollection services)
    {
        services.AddApplicationInsightsTelemetry(options =>
        {
            options.EnableAdaptiveSampling = true;
            options.EnableQuickPulseMetricStream = true;
        });

        services.AddSingleton<ITelemetryInitializer, CustomTelemetryInitializer>();
    }
}

public class CustomTelemetryInitializer : ITelemetryInitializer
{
    public void Initialize(ITelemetry telemetry)
    {
        telemetry.Context.Cloud.RoleName = "PropertyService";
        telemetry.Context.Component.Version = "1.0.0";
    }
}
```

### 9.2 Structured Logging

```csharp
_logger.LogInformation(
    "Property created: {PropertyId} by Owner: {OwnerId}",
    property.PropertyId,
    property.OwnerId);

_logger.LogWarning(
    "Failed to send notification for Payment: {PaymentId}. Retry attempt: {RetryCount}",
    paymentId,
    retryCount);
```

---

## 10. Deployment Strategy

### 10.1 CI/CD Pipeline (GitHub Actions)

```yaml
name: Deploy Property Service

on:
  push:
    branches: [ main ]
    paths:
      - 'src/FunctionApps/PropertyService/**'

env:
  AZURE_FUNCTIONAPP_NAME: propmgmt-property-prod
  DOTNET_VERSION: '8.0.x'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup .NET
      uses: actions/setup-dotnet@v4
      with:
        dotnet-version: ${{ env.DOTNET_VERSION }}
    
    - name: Restore dependencies
      run: dotnet restore src/FunctionApps/PropertyService
    
    - name: Build
      run: dotnet build src/FunctionApps/PropertyService --configuration Release
    
    - name: Test
      run: dotnet test tests/PropertyService.Tests
    
    - name: Publish
      run: dotnet publish src/FunctionApps/PropertyService -c Release -o ./output
    
    - name: Deploy to Azure Functions
      uses: Azure/functions-action@v1
      with:
        app-name: ${{ env.AZURE_FUNCTIONAPP_NAME }}
        package: ./output
        publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}
```

---

## 11. Performance Optimization Checklist

- ✅ Use Connection Pooling for PostgreSQL
- ✅ Implement Cache-Aside pattern with Redis
- ✅ Enable APIM response caching for GET endpoints
- ✅ Use async/await throughout
- ✅ Implement pagination for large result sets
- ✅ Use Cloudflare CDN for static assets
- ✅ Compress images (WebP format)
- ✅ Enable Application Insights sampling
- ✅ Use indexed columns for frequently queried fields
- ✅ Implement database query optimization
- ✅ Use SignalR serverless mode for real-time features
- ✅ Implement proper retry logic with exponential backoff

---

## 12. Next Steps

1. **Week 1**: Set up Azure infrastructure using Bicep
2. **Week 2**: Implement Property Service with basic CRUD
3. **Week 3**: Implement Billing Service with recurring billing
4. **Week 4**: Implement Contract Service and document generation
5. **Week 5**: Implement Maintenance Service with SignalR notifications
6. **Week 6**: Integration testing and performance optimization
7. **Week 7**: Security hardening and penetration testing
8. **Week 8**: Production deployment and monitoring setup

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Author**: Senior Cloud Architect

        