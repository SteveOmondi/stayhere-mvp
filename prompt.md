# StayHere: Architecture & Infrastructure Implementation Prompt

## **1. Role & Context**

**Role:** Principal Azure Platform Architect & Senior DevOps Engineer.

**Project:** **StayHere** (A high-scale property leasing and purchase platform).

**Guiding Principle:** "Antigravity Architecture"—No technical debt, zero-trust security, and maximum modularity through Clean Architecture and DDD.

---

## **2. Core Infrastructure Requirements (Terraform)**

Generate the Terraform modules for the **StayHere** backbone, adhering to the following:

* **Networking:** VNET with dedicated subnets for **API Management (APIM)** and **Azure Functions** (Regional VNET Integration).
* **Identity (Entra ID):**
* Create an **App Registration** for the `StayHere-Gateway`.
* Define **App Roles** (`Property.Manager`, `Tenant.User`) and **Scopes** (`API.ReadWrite`).
* Configure **Managed Identities** for all Azure Functions to eliminate connection strings/secrets.


* **APIM Setup:** * Initialize APIM with a `validate-jwt` policy.
* Policy must verify the `openid-configuration` from Entra ID and validate the `aud` (Audience) and `iss` (Issuer).



---

## **3. Module Architecture (Azure Functions Isolated Worker)**

Every individual module (Microservice) must follow this **Clean Architecture** structure:

### **Project Structure**

1. **StayHere.[Module].Domain:** Entities, Value Objects, Domain Exceptions, and Repository Interfaces. (No external dependencies).
2. **StayHere.[Module].Application:** CQRS Commands/Queries, DTOs, FluentValidation, and Application Logic.
3. **StayHere.[Module].Infrastructure:** Data Persistence (EF Core/SQL or MongoDB), External Clients, and OpenTelemetry configuration.
4. **StayHere.[Module].Api:** Azure Function Triggers, Middleware, and `Program.cs` DI setup.

### **Mandatory Patterns**

* **CQRS:** Separate read and write paths.
* **Repository Pattern:** Abstract all data access.
* **Middleware-Based Auth:** Implement a `TokenValidationMiddleware` in the API layer to verify claims (`roles`/`scp`) after the APIM handoff.

---

## **4. Specific Implementation Task**

> **Current Task:** Setup the **Identity & Authentication Module**.
> **Deliverables:**
> 1. **Terraform:** `.tf` files for Entra ID App Registrations and the APIM `validate-jwt` XML policy.
> 2. **C# Code:** The `TokenValidationMiddleware.cs` for the Azure Function Isolated Worker.
> 3. **DI Setup:** `Program.cs` configuration showing how to register the authentication handler and domain services.
> 
> 

---

## **5. Quality Gates**

* No logic in Function Triggers (they should only invoke the Mediator).
* All infrastructure must be managed by Managed Identity (Zero-Secrets).
* Code must support **Distributed Tracing** via OpenTelemetry.
