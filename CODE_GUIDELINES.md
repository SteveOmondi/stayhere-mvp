# StayHereMVP Project Rules

## 1. Principles
- **Clean Architecture**: Strict separation of Domain, Application, Infrastructure, and API/Function layers.
- **Domain-Driven Design (DDD)**: Focus on the core domain logic. Avoid "Anemic Domain Models".
- **Security First**: 
    - JWT validation on all external endpoints.
    - No hardcoded secrets; use Managed Identities and Key Vault.
- **Observability**: Structured logging (JSON format) and distributed tracing (OpenTelemetry).

## 2. Tech Stack
- **Languages**: C# (.NET 8/9).
- **Compute**: Azure Functions (Isolated Worker).
- **Database**: PostgreSQL (Flexible Server), Redis.
- **Messaging**: Azure Service Bus, SignalR (Serverless).
- **Infrastructure**: Terraform/Bicep.

## 3. Layering & Dependencies
- **Domain**: Entities, Value Objects, Domain Events, Repository Interfaces. No dependencies.
- **Application**: CQRS (Commands/Queries), DTOs, Service Interfaces, Mappings.
- **Infrastructure**: Data Persistence (EF Core/Dapper), External Integrations (Twilio, SendGrid), File Storage.
- **API (Functions)**: Triggers, Middleware, Dependency Injection setup.

## 4. Naming Conventions
- **Folders**: PascalCase for project directories, lowercase for infrastructure/docs.
- **Classes/Interfaces**: `I[Name]` for interfaces, `[Name]Repository` for repositories, `[Name]Service` for services.
- **Variables**: `_camelCase` for private fields, `camelCase` for local variables.

## 5. Security Rules
- Validate `Authorization: Bearer <token>` in every function middleware.
- Only Entra ID or Verified OTP tokens are accepted.
- Use `ActionResult` or `HttpResponseData` with proper status codes (401, 403) for auth failures.
