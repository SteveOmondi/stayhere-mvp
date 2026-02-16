# StayHere: Trust Infrastructure for African Real Estate

**Design Document: Stakeholders & Strategic Pillars**
**Version:** 1.1
**Target Market:** Africa (Local & Diaspora)
**Mission:** To bridge the "Trust Deficit" in African Real Estate through automation, transparency, and statutory compliance.

---

## 1. Executive Summary

StayHere is a **Trust-as-a-Service** platform. In the African real estate context, the primary hurdle isn't just managing properties—it's managing the relationships between Diaspora owners, local managers, and tenants. StayHere solves this by integrating **FinTech (M-Pesa)**, **GovTech (KRA/eTIMS)**, and **IoT (Smart Meters)** into a single source of truth.

---

## 2. The 4-Pillar Architecture

### Pillar 1:  FinTech & Statutory Engine
*Where money meets the Law.*

| Feature | Description | The "Wow" Factor |
| :--- | :--- | :--- |
| **M-Pesa Split 2.0** | Automated payment matching via Merchant APIs. | **Instant Liquidity:** Rent is auto-split (e.g., 90% Owner, 5% Manager, 5% Sinking Fund) the second the M-Pesa SMS arrives. |
| **Chama Mode** | Support for group/family ownership. | **Fractional Payouts:** Rent is split across multiple stakeholders based on equity percentage automatically. |
| **The Tax Robot** | Automated KRA compliance. | **eTIMS/iTax Integration:** Auto-generates KRA-compliant invoices and pre-fills MRI (Monthly Rental Income) returns. |
| **Legal Guard** | Statutory obligation tracking. | **Smart Eviction Logic:** Auto-drafts legally compliant notices citing specific chapters of the Landlord & Tenant Act. |

### Pillar 2: Ops & IoT Center
*The building's "Physical" digital twin.*

| Feature | Description | The "Wow" Factor |
| :--- | :--- | :--- |
| **IoT Smart Meters** | Real-time water/power monitoring. | **Leak Detection:** Alerts the manager to "phantom usage" at 3 AM. Tenants can buy power tokens directly in-app. |
| **Fundi Marketplace** | A vetted network of technicians. | **"The Proof of Work":** Fundis must upload a timestamped video of the fix before the "Split-Payment" is released to them. |
| **Digital Gatekeeper** | Physical security integration. | **Clearance QR:** The gate won't open for moving trucks unless a "Digital Clearance Certificate" is issued. |

### Pillar 3: The Harmony Layer
*Conflict resolution & Community building.*

| Feature | Description | The "Wow" Factor |
| :--- | :--- | :--- |
| **Evidence Vault** | Immutable, tamper-proof logs. | **"Judge-Ready" Reports:** One-click export of communication and payment history for the Business Premises Rent Tribunal. |
| **Tenant Passport** | Behavioral credit tracking. | **Verified Screening:** Connects to credit bureaus and criminal records to score tenants before lease signing. |
| **Community Pulse** | Democratic building management. | **Project Polling:** Owners poll tenants on upgrades (e.g., "Do we install Fiber or a Gym?") ensuring high retention. |

### Pillar 4: The "Commander" Portals
*Tailored experiences for every stakeholder.*

### Pillar 5: The Trust Shield (Legal & Compliance)
*Building institutional trust through technology.*

| Feature | Description | The "Wow" Factor |
| :--- | :--- | :--- |
| **Title Guard** | Integration with Ministry of Lands (e.g., Ardhisasa). | **Scam Prevention:** System verifies property ownership before onboarding, preventing "ghost listings." |
| **AML/KYC Engine** | Anti-Money Laundering & KYC checks. | **Compliance Auto-Pilot:** Automatically flags suspicious large cash transactions to meet Central Bank and Financial Reporting Centre requirements. |
| **ODPC Vault** | Data privacy as per the Data Protection Act 2019. | **Privacy First:** End-to-end encryption for sensitive tenant/owner data, ensuring full legal compliance with the Data Commissioner. |

---

## 3. Persona Profiles & Module Deep-Dives

### A. Property Owner Module (The "Visionary" Portal)
*Designed for Diaspora and local high-net-worth individuals.*

#### Pain Points (The Trust Deficit)
- **"The Hidden Tax":** Managers inflating repair costs (e.g., claiming a KES 5,000 fix cost KES 15,000).
- **"Revenue Ghosting":** Units reported as vacant when they are actually occupied and paying cash.
- **"Currency Erosion":** Difficulty tracking actual ROI when rent is collected in KES but they live in a USD/GBP economy.

#### User Journey:
1. **Insight:** Owner logs in and sees a **Live Yield Dashboard** showing ROI across their portfolio.
2. **Verification:** They receive a notification: *“Maintenance: Leak fixed in Unit 4B.”* They tap to view the **OCR-scanned receipt** and the **“Fixed” video** uploaded by the Fundi.
3. **Liquidity:** They view their **Multi-Currency Wallet**. They see that KES 100,000 has been collected and can see the instant conversion to $750 USD.
4. **Transparency:** They drill down into the **Vacancy Heatmap** to see exactly which units are active vs. transitioning.

#### StayHere Resolution
- **Immutable Receipts:** OCR technology scans every hardware store receipt; if the price is 20% above the "StayHere Market Average," the system flags it.
- **Real-Time Auditing:** Financials are locked; managers cannot retroactively edit "Paid" statuses or repair costs without an audit trail.

---

### B. Property Manager Module.
*Designed for Agencies and Organization Managers managing 500+ units.*

#### Pain Points (The Operational Nightmare)
- **"Reconciliation Headache":** Spending 3 days every month matching M-Pesa transaction codes to tenant names.
- **"The Maintenance Gap":** Losing track of repair requests, leading to tenant churn and building decay.
- **"Compliance Fatigue":** Manually calculating MRI taxes and filing KRA eTIMS invoices for hundreds of units.

#### User Journey:
1. **Automation:** The manager starts the day with **Zero Reconciliation**. The system has already matched all 500 rent payments via the M-Pesa API.
2. **Action:** The dashboard shows **3 Overdue Maintenance Tickets**. With one click, they assign a vetted Fundi.
3. **Communication:** They notice a scheduled water outage. They use **Bulk Blaster** to send a WhatsApp/SMS alert to all 200 tenants in "Plum Residency."
4. **Compliance:** At the end of the month, they click **"Generate Tax Pack"**. StayHere pre-fills the KRA iTax templates and sends eTIMS invoices to everyone.

#### StayHere Resolution
- **M-Pesa Auto-Match:** Eliminates human error in bookkeeping. Rent is instantly allocated to the correct ledger.
- **Maintenance Escrow:** The system ensures managers don't "forget" to pay Fundis, as the money is already locked in a Sinking Fund, reducing friction with technicians.

---

### C.   The Vetted Fundi (The Pro)
*Plumbers, Electricians, and Painters.*

#### Pain Points
- **Payment Delay:** Chasing managers for KES 2,000 for weeks.
- **Low Visibility:** Relying on word-of-mouth for work.

#### StayHere Resolution
- **Instant Payouts:** Funds are released the moment the "Video Verification" is approved.
- **Digital Portfolio:** StayHere tracks their "On-Time" and "Fix-Rate" statistics, making them a "Top Rated" pro.

- **Work Management:** A module for Fundis where they can be vetted and rated by owners and managers, creating a trust system where the best Fundis get more work. They can also receive jobs and manage their work through the app.
---

## 4. Role-Based Access: The "Relative vs. Professional" Dynamic
*Recognizing the Diaspora reality of local family involvement.*

To prevent family friction while maintaining professional standards, StayHere implements a dual-tier management system:

### The Professional Manager (The Admin)
- Full access to FinTech splits and M-Pesa reconciliation.
- Responsible for KRA tax filings and legal compliance.
- Views the overall portfolio performance.

### The Local Caretaker / Relative (The Observer/Operative)
- **Role-Based Access (RBAC):** Limited to "Maintenance Request" viewing and "Fundi Assignment."
- **The "Audit Mirror":** The owner can see exactly what the relative is approving vs. what the professional manager is reporting.
- **Resolution:** Allows family members to feel involved in "looking after the house" without having their hands on the financial controls.

---

## 5. The "Trust Loop" (User Journey)

1. **Verification:** System checks property title via **Title Guard** before listing.
2. **Payment:** Tenant pays **KES 50,000** via M-Pesa.
3. **Reconciliation:** StayHere intercepts the API hook; updates the Ledger.
4. **The Split:** 
   - **45k** goes to the **Owner's Wallet**.
   - **2.5k** goes to the **Manager's Commission**.
   - **2.5k** goes to the **Building Sinking Fund**.
5. **Compliance:** An **eTIMS invoice** is generated and emailed to the tenant.
6. **Transparency:** The Owner in Toronto receives a notification: *"Unit 12 Paid. Your wallet balance is now $350 USD (equivalent)."*
7. **Maintenance:** A sensor detects a leak. The **Caretaker (Relative)** assigns a Fundi.
8. **Resolution:** Fundi uploads a video. Manager approves. Payment is released.

---


