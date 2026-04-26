# StayHere Function Apps — default ports and start commands

Requires **[Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local)** (`func` on your PATH) and **.NET 9**.

## Default ports (7100–7105)

| Port | Function app | API base URL |
|------|----------------|--------------|
| **7100** | `StayHere.AuthService` | `http://localhost:7100/api` |
| **7101** | `StayHere.PropertyService` | `http://localhost:7101/api` |
| **7102** | `StayHere.CustomerService` | `http://localhost:7102/api` |
| **7103** | `StayHere.PropertyOwnerService` | `http://localhost:7103/api` |
| **7104** | `StayHere.StaticDataService` | `http://localhost:7104/api` |
| **7105** | `StayHere.AiAgentService` | `http://localhost:7105/api` |

Each app’s `Properties/launchSettings.json` uses the same `--port` value so **Visual Studio / `dotnet run`** matches the CLI.

---

## Start all apps at once (six PowerShell windows)

From the **repository root**:

```powershell
.\scripts\Start-AllStayHereFunctionApps.ps1
```

Each host runs in its own window with `func start --port …`.

---

## Start one app

```powershell
.\scripts\Start-StayHereFunctionApp.ps1 -Name AuthService
.\scripts\Start-StayHereFunctionApp.ps1 -Name PropertyService
.\scripts\Start-StayHereFunctionApp.ps1 -Name CustomerService
.\scripts\Start-StayHereFunctionApp.ps1 -Name PropertyOwnerService
.\scripts\Start-StayHereFunctionApp.ps1 -Name StaticDataService
.\scripts\Start-StayHereFunctionApp.ps1 -Name AiAgentService
```

Run in the **current** window (blocking, no new process):

```powershell
.\scripts\Start-StayHereFunctionApp.ps1 -Name PropertyService -NoNewWindow
```

---

## Manual commands (same ports)

Run from **repo root**; use `;` on PowerShell or separate lines on bash.

```powershell
cd src/FunctionApps/AuthService;           func start --port 7100
cd src/FunctionApps/PropertyService;      func start --port 7101
cd src/FunctionApps/CustomerService;      func start --port 7102
cd src/FunctionApps/PropertyOwnerService; func start --port 7103
cd src/FunctionApps/StaticDataService;    func start --port 7104
cd src/FunctionApps/AiAgentService;       func start --port 7105
```

Or with `dotnet run` (uses `launchSettings.json`):

```powershell
cd src/FunctionApps/PropertyService; dotnet run
```

---

## After changing ports

1. Update `scripts/stayhere-function-ports.ps1` (source of truth for the start scripts).
2. Update each app’s `Properties/launchSettings.json` `commandLineArgs`.
3. Regenerate Postman defaults: `python postman/generate_stayhere_collection.py`
4. Update each app’s `local.settings.json` (e.g. `ListingPortalBaseUrl`, cross-service URLs).

---

## Single source of truth

Port numbers are defined in **`stayhere-function-ports.ps1`**. `Start-StayHereFunctionApp.ps1` and `Start-AllStayHereFunctionApps.ps1` read that list—edit only the `.ps1` array if you want a different port block.
