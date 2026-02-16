# StayHere Property & Spaces Solution
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

## 7. Key Implementation Patterns

### 7.1 Repository Pattern

### 7.2 Cache-Aside Pattern

## 8. Security Best Practices

### 8.1 Authentication & Authorization

### 8.2 Connection String Management (Azure KeyVault)


## 9. Monitoring & Observability

### 9.1 Application Insights Configuration

### 9.2 Structured Logging


## 10. Deployment Strategy

### 10.1 CI/CD Pipeline (GitHub Actions/Azure DevOps)

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


**Document Version**: 1.0  
**Last Updated**: January 2026  

        