# StayHere Azure Deployment Guide

This guide provides step-by-step instructions to deploy the StayHereMVP project to Azure using Azure DevOps Pipelines and Terraform.

## 1. Microsoft Entra ID (Azure AD) Setup

Terraform requires a Service Principal to authenticate and manage Azure resources.

### Create a Service Principal
1. Sign in to the [Azure Portal](https://portal.azure.com).
2. Navigate to **Microsoft Entra ID** > **App registrations**.
3. Select **New registration**.
   - **Name**: `StayHere-Terraform-SP`
   - **Supported account types**: Accounts in this organizational directory only.
4. Click **Register**.

### Configure Authentication
1. Go to **Certificates & secrets** > **Client secrets**.
2. Create a **New client secret**.
3. Copy the **Value** immediately. You will need it later for Azure DevOps (it won't be visible again).

### Assign Permissions
1. Navigate to your **Subscription** in the Azure Portal.
2. Select **Access control (IAM)** > **Add** > **Add role assignment**.
3. Assign the **Contributor** role (and **User Access Administrator** if managing IAM) to the `StayHere-Terraform-SP` Service Principal.

---

## 2. Azure Infrastructure Setup

### Terraform State Storage
Since Terraform needs to store its state file in a central location:
1. Create a Storage Account in Azure (e.g., `ststayheretfstate`).
2. Create a Container named `tfstate`.
3. Note the storage account name and container name.

---

## 3. Azure DevOps Setup

### Create a Project
1. Go to [Azure DevOps](https://dev.azure.com).
2. Create a new Project named `StayHere`.

### Service Connections
1. Go to **Project Settings** > **Service connections**.
2. Select **New service connection** > **Azure Resource Manager**.
3. Choose **Service principal (manual)**.
4. Fill in:
   - **Subscription ID** & **Subscription Name**.
   - **Service Principal ID** (Application ID from Entra).
   - **Service Principal Key** (The Client Secret value from Entra).
   - **Tenant ID** (from Entra).
   - **Service connection name**: `Azure-StayHere-Conn`.

### Variable Groups
1. Go to **Pipelines** > **Library**.
2. Create a Variable Group named `StayHere-Variables`.
3. Add the following variables:
   - `ARM_CLIENT_ID`
   - `ARM_CLIENT_SECRET` (Mark as secret)
   - `ARM_TENANT_ID`
   - `ARM_SUBSCRIPTION_ID`
   - `MONGODB_ATLAS_PUBLIC_KEY`
   - `MONGODB_ATLAS_PRIVATE_KEY` (Mark as secret)
   - `MONGODB_ATLAS_ORG_ID`

---

## 4. CI/CD Pipelines

### Infrastructure Pipeline (`azure-pipelines-infra.yml`)
Add this file to your root directory to automate Terraform deployments.

```yaml
trigger:
  branches:
    include: [main]
  paths:
    include: [infrastructure/terraform/*]

variables:
- group: StayHere-Variables

stages:
- stage: TerraformPlan
  jobs:
  - job: Plan
    pool: { vmImage: 'ubuntu-latest' }
    steps:
    - task: TerraformTaskV4@4
      inputs:
        provider: 'azurerm'
        command: 'init'
        backendServiceArm: 'Azure-StayHere-Conn'
        backendAzureRmResourceGroupName: 'rg-terraform-mgmt'
        backendAzureRmStorageAccountName: 'ststayheretfstate'
        backendAzureRmContainerName: 'tfstate'
        backendAzureRmKey: 'terraform.tfstate'
    - task: TerraformTaskV4@4
      inputs:
        provider: 'azurerm'
        command: 'plan'
        environmentServiceNameAzureRM: 'Azure-StayHere-Conn'
```

### Application Pipeline (`azure-pipelines-app.yml`)
Add this file to build and deploy the .NET Function Apps.

```yaml
trigger:
  branches:
    include: [main]
  paths:
    include: [src/*]

pool:
  vmImage: 'ubuntu-latest'

steps:
- task: UseDotNet@2
  inputs:
    version: '8.x'

- script: dotnet build src/StayHere.sln --configuration Release
  displayName: 'Build Solution'

- task: DotNetCoreCLI@2
  inputs:
    command: 'publish'
    publishWebProjects: false
    projects: 'src/FunctionApps/**/*.csproj'
    arguments: '--configuration Release --output $(Build.ArtifactStagingDirectory)'
    zipAfterPublish: true

- task: AzureFunctionApp@2
  inputs:
    azureSubscription: 'Azure-StayHere-Conn'
    appType: 'functionAppLinux'
    appName: 'func-dev-auth' # Dynamicize if possible
    package: '$(Build.ArtifactStagingDirectory)/**/*.zip'
```
