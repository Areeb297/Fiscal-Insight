# Project Projection Web Application
## Product Requirements Document (PRD) & Scope of Work

**Version:** 1.1  
**Date:** April 2026  
**Status:** Draft — Pending Review  

---

## 1. Overview

### 1.1 What Is This?

A web-based financial projection and cost management tool for a department that operates across Saudi Arabia and Pakistan. It replaces the current Excel-based workflow with a live, collaborative, always-accurate web application that allows the department to:

- Track employee costs with country-specific CTC (Cost to Company) rules
- Project costs across multiple clients and see per-client profitability
- Manage post-deployment / managed services resourcing with margin calculations
- Generate professional client-facing quotations

### 1.2 Who Uses It?

- **Department Managers** — review costs, adjust margins, approve quotations
- **Finance / Operations** — manage employee data, overhead subscriptions, SAR exchange rates
- **Sales Team** — build quotations for clients, configure sales support resources

### 1.3 Core Philosophy

- **Default currency is Saudi Riyals (SAR)** — all values displayed in SAR unless explicitly noted
- **Live calculations** — every figure reacts immediately when inputs change (no save-to-recalculate)
- **Editable defaults** — margin %, number of clients, exchange rates are all globally editable
- **Multi-year support** — each projection is scoped to a financial year (e.g. 2025–2026)
- **Flexibility first** — the app is designed to grow; adding new currencies, countries, CTC rules, or modules should be straightforward without touching core logic
- **AI-assisted** — a built-in chatbot lets users manage data and ask questions in plain language, reducing reliance on manual form-filling

---

## 2. Modules

### Module 1 — Department Cost

This module captures all team members, their salaries, CTC, and how many months they are involved in the project year.

#### 2.1 Employee Table

| Field | Description |
|---|---|
| Employee # | Auto-incremented row number |
| Name | Free-text employee name |
| Title / Role | e.g. Solution Architect, PM, Engineer 1 |
| Country | `Saudi` or `Pakistan` — drives CTC rule |
| Salary (SAR/month) | Monthly gross salary in SAR |
| CTC | Calculated: Saudi → Salary × 1.5 \| Pakistan → Salary × 1.0 |
| Months (FTE) | How many months this person is engaged in the project year (1–12) |
| Total Yearly Cost | CTC × Months |

#### 2.2 Summary Row

- **Grand Total (Gross)** = SUM of all employees' Total Yearly Cost
- Displayed prominently below the table

#### 2.3 Business Rules

- CTC is auto-calculated; user cannot manually override it
- If Country = Saudi → CTC = Salary × 1.5 (covers GOSI, housing, transport, etc.)
- If Country = Pakistan → CTC = Salary × 1.0 (no markup)
- Months can be set between 1 and 12; default is 12
- Rows can be added, edited, and deleted
- Department cost data is scoped to a **projection year** (e.g. 2025-2026)

---

### Module 2 — Client Projection

This module calculates per-client economics based on the department cost grand total, overheads, and a configurable margin.

#### 2.4 Global Inputs (editable, displayed prominently)

| Input | Default | Description |
|---|---|---|
| $ to SAR Rate | 3.75 | USD to Saudi Riyal exchange rate |
| # of Clients | 5 | Number of clients the cost is spread across |
| Margin % | 30% | Applied globally to calculate selling price |
| Financial Year | 2025–2026 | Year label, for context only |

#### 2.5 Department Cost Summary (auto-pulled from Module 1)

| Field | Formula |
|---|---|
| Total Dept Cost (Yearly) | = Grand Total from Module 1 |
| Cost per Client (Yearly) | = Total Dept Cost ÷ # of Clients |
| Cost per Client (Monthly) | = Cost per Client ÷ 12 |

#### 2.6 Overheads & Subscriptions

A table of recurring subscriptions/overhead costs:

| Column | Description |
|---|---|
| # | Row number |
| Subscription / Overhead | Name (e.g. Claude, GPT, ElevenLabs) |
| Currency | USD or SAR |
| Price (Original) | Amount in original currency |
| SAR Equivalent | Auto-converted: if USD → Price × SAR rate; if SAR → as-is |
| Yearly (SAR) | SAR Equivalent × 12 |
| Monthly (SAR) | SAR Equivalent |

**Pre-populated rows:** Claude, GPT, ElevenLabs, Hosting + Integration + ZATCA  
**Extra blank rows** available for the user to add new subscriptions  
**Totals row:** Total Overheads Yearly (SAR) and Total Overheads Monthly (SAR)

#### 2.7 Per-Client Economics

All values shown both Monthly and Yearly:

| Metric | Formula |
|---|---|
| Cost per Client per Month | From §2.5 |
| Overhead (Monthly) | = Total Overheads Monthly ÷ # of Clients |
| **Total Monthly Cost per Client** | = Cost per Client per Month + Overhead (Monthly) |
| Margin % | Configurable global input (default 30%) |
| Selling Price (without VAT) | = Total Monthly Cost ÷ (1 − Margin%) |
| Margin (SAR) Monthly | = Selling Price − Total Monthly Cost |
| Margin (SAR) Yearly | = Margin Monthly × 12 |
| Selling Price with VAT (Monthly) | = Selling Price × 1.15 |
| Selling Price with VAT (Yearly) | = Selling Price with VAT Monthly × 12 |

---

### Module 3 — Sales Support (After Deployment / Managed Services)

A separate resource costing module for post-deployment managed services, displayed alongside or after the main projection.

#### 2.8 Resource Table

| Field | Description |
|---|---|
| # | Row number |
| Title / Role | e.g. ASP.NET Dev L2 Resource, Database Admin |
| Country | Saudi or Pakistan |
| Salary (SAR/month) | Monthly gross salary |
| CTC | Same CTC rule as Module 1 |
| Months | Months of involvement |
| Total Salary Cost | CTC × Months |

#### 2.9 Sales Support Summary

| Metric | Value |
|---|---|
| Total Cost | SUM of Total Salary Cost |
| Margin % | Editable (default 30%) — can differ from main projection margin |
| Selling Price | = Total Cost ÷ (1 − Margin%) |

---

### Module 4 — Quotation

A professional, client-facing quotation document generated from the live projection data.

#### 2.10 Quotation Header

| Field | Description |
|---|---|
| Company Name | Editable text input |
| Client Name | Editable text input |
| Date | Date picker (defaults to today) |
| Quotation # | Auto-generated (e.g. Q-001) with manual override option |
| Currency | SAR (Saudi Riyal) — fixed |

#### 2.11 Line Items Table

| Column | Description |
|---|---|
| S/N | Serial number |
| Line Item Description | Free-text or auto-pulled from projection (e.g. "Licenses and Services") |
| Quantity | Editable number |
| Unit | e.g. Package, License Annual, Resources |
| Price (Monthly) | Unit monthly price |
| Total Months | Number of months |
| Total Price (without VAT) | = Price × Quantity × Total Months |
| VAT (15%) | = Total Price × 0.15 |
| Total Price (with VAT) | = Total Price + VAT |

**Pre-filled rows (pulled from projection):**
1. Licenses and Services (from Client Projection selling price)
2. Odoo Licenses (if applicable)
3. Managed Services (from Sales Support selling price)

User can add/remove rows manually.

#### 2.12 Quotation Summary

| Row | Value |
|---|---|
| Total Price (without VAT) | SUM of all line items |
| VAT (15%) | = Total × 0.15 |
| **Total Price (with VAT)** | = Total + VAT |

#### 2.13 Quotation Actions

- **Preview as PDF** — render quotation in a print-ready layout
- **Download as PDF** — export to PDF file
- **Duplicate Quotation** — copy current quotation as a new draft
- **Save Quotation** — persisted to database
- **List of Quotations** — view/reopen past quotations

---

### Module 5 — AI Chatbot Assistant

A persistent chat panel (accessible from any page) that lets users interact with their projection data using plain language — no need to navigate forms to make quick changes.

#### 2.14 What the Chatbot Can Do

**Data Management (write actions)**
- Add an employee: *"Add Ahmed as a Solution Architect, Saudi, 18,000 SAR, 12 months"*
- Update an employee: *"Change Imran's salary to 20,000"*
- Remove an employee: *"Remove Engineer 3 from the projection"*
- Add a subscription: *"Add Notion at 50 USD per month"*
- Add a sales support resource: *"Add a Database Admin, Pakistan, 7,000 SAR, 6 months"*
- Update global settings: *"Set the margin to 35%"* or *"Change USD rate to 3.80"*

**Data Questions (read/analysis)**
- *"What is our total department cost this year?"*
- *"What is the selling price per client including VAT?"*
- *"How much margin are we making per month?"*
- *"Which employee costs the most?"*
- *"What is our total overhead per month?"*
- *"If I add one more engineer at 12,000 SAR, what happens to the client cost?"*

**Quotation Help**
- *"Create a new quotation for Client ABC"*
- *"Show me all quotations in draft status"*

#### 2.15 Chatbot Behavior

| Behavior | Detail |
|---|---|
| Confirmation before write actions | Bot always shows what it is about to do and asks to confirm before saving |
| Context-aware | Bot knows the current projection and can reference existing employees/subscriptions by name |
| Fallback | If a request is unclear, bot asks a clarifying question rather than guessing |
| Tone | Professional and concise — this is an internal business tool, not a consumer chatbot |
| AI Provider | Powered by Claude (Anthropic) via Replit AI integrations |
| Persistent history | Chat history visible per session; can be cleared |

#### 2.16 Chat Panel UX

- Fixed side panel (collapsible) or floating button that opens a modal chat
- Available on all pages
- Shows a short typing indicator while the AI is thinking
- Actions performed by the bot are reflected immediately in the live data on the page (real-time update)

---

### Module 6 — Admin Panel

A dedicated settings and configuration area for managing system-wide defaults, currencies, CTC rules, and other reference data. Designed for a finance/operations admin.

#### 2.17 Currency Management

Users can define and manage all currencies used across the system:

| Field | Description |
|---|---|
| Currency Code | e.g. USD, EUR, GBP, PKR, AED |
| Currency Name | e.g. US Dollar, Euro |
| Symbol | e.g. $, €, £, ₨ |
| Exchange Rate to SAR | Live editable rate — used for all conversions |
| Active | Toggle on/off — inactive currencies won't appear in dropdowns |

**Default currencies (pre-loaded):**
- SAR (Saudi Riyal) — base currency, rate always 1.0
- USD (US Dollar) — default rate 3.75
- PKR (Pakistani Rupee)
- AED (UAE Dirham)
- EUR (Euro)
- GBP (British Pound)

Users can add any additional currency at any time. Exchange rates are manually updated (no automatic feed in Phase 1; auto-feed can be added in Phase 2).

#### 2.18 CTC Rules Management

The admin can view and manage CTC multiplier rules per country:

| Country | CTC Multiplier | Notes |
|---|---|---|
| Saudi Arabia | 1.5× | GOSI, housing, transport |
| Pakistan | 1.0× | No markup |
| (Add new) | editable | e.g. UAE at 1.3× |

Adding a new country/rule is available without code changes.

#### 2.19 VAT & Tax Settings

| Setting | Default | Description |
|---|---|---|
| VAT Rate | 15% | Applied to all quotations |
| VAT Label | VAT | Displayed on quotation documents |

#### 2.20 System Defaults

| Setting | Default | Description |
|---|---|---|
| Default Margin % | 30% | Applied to new projections |
| Default # of Clients | 5 | Applied to new projections |
| Default Base Currency | SAR | Used as the display currency |
| Default Financial Year | Current year | Pre-fills on new projection creation |
| Quotation Number Prefix | Q- | e.g. Q-001, Q-002 |
| Company Name | (editable) | Pre-fills on all quotations |
| Company Logo | Upload | Appears on PDF quotations |

---

## 3. Technical Architecture

### 3.1 Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React + Vite | Hosted as a static artifact |
| UI Components | shadcn/ui + Tailwind CSS | Professional design system |
| Backend / API | Express (Node.js) | Existing API server in monorepo |
| Database | PostgreSQL + Drizzle ORM | Already provisioned in monorepo |
| AI / Chatbot | Claude (Anthropic) via Replit AI integrations | No API key needed from user |
| PDF Generation | `@react-pdf/renderer` or browser print | Client-side PDF for quotations |
| State Management | React Query + context | Real-time calculated values |
| Validation | Zod | Shared between frontend and backend |
| API Contract | OpenAPI spec → codegen | Typed hooks for all endpoints |

### 3.2 Data Models

#### Projection (top-level record)

```
projection {
  id
  year_label         (e.g. "2025-2026")
  sar_rate           (default: 3.75)
  num_clients        (default: 5)
  margin_percent     (default: 0.30)
  created_at
  updated_at
}
```

#### Employee

```
employee {
  id
  projection_id      → FK to projection
  name
  title
  country            ("saudi" | "pakistan")
  salary_sar         (monthly)
  months_fte         (1–12, default 12)
  -- computed fields (returned by API) --
  ctc
  total_yearly_cost
}
```

#### Subscription / Overhead

```
subscription {
  id
  projection_id      → FK to projection
  name
  currency           ("USD" | "SAR")
  original_price
  -- computed (returned by API) --
  sar_equivalent
  yearly_sar
  monthly_sar
}
```

#### Sales Support Resource

```
sales_support_resource {
  id
  projection_id      → FK to projection
  title
  country            ("saudi" | "pakistan")
  salary_sar
  months
  margin_percent     (default: 0.30, editable per projection)
  -- computed --
  ctc
  total_salary_cost
}
```

#### Quotation

```
quotation {
  id
  projection_id      → FK to projection (optional)
  quotation_number   (e.g. "Q-001")
  company_name
  client_name
  date
  status             ("draft" | "sent" | "accepted")
  created_at
  updated_at
}

quotation_line_item {
  id
  quotation_id       → FK to quotation
  sort_order
  description
  quantity
  unit
  price_monthly
  total_months
}
```

#### Currency (Admin-managed reference data)

```
currency {
  id
  code               (e.g. "USD", "EUR", "PKR")
  name               (e.g. "US Dollar")
  symbol             (e.g. "$")
  rate_to_sar        (exchange rate; SAR is always 1.0)
  is_active          (boolean — inactive currencies hidden from dropdowns)
  is_base            (boolean — SAR is base, cannot be deleted)
  updated_at
}
```

#### CTC Rule (Admin-managed reference data)

```
ctc_rule {
  id
  country_name       (e.g. "Saudi Arabia", "Pakistan", "UAE")
  country_code       (e.g. "SA", "PK", "AE")
  ctc_multiplier     (e.g. 1.5, 1.0, 1.3)
  notes              (free-text, e.g. "Covers GOSI, housing, transport")
  is_active          (boolean)
}
```

#### System Settings (Admin-managed, single row)

```
system_settings {
  id                 (always 1)
  default_margin     (0.30)
  default_num_clients (5)
  vat_rate           (0.15)
  quotation_prefix   ("Q-")
  company_name
  company_logo_url
  base_currency_code ("SAR")
  updated_at
}
```

#### Chat Message (for chatbot history)

```
chat_message {
  id
  session_id         (browser session identifier)
  role               ("user" | "assistant")
  content            (message text)
  actions_taken      (JSON array of API calls the bot made)
  created_at
}
```

### 3.3 API Endpoints (Summary)

```
GET    /api/projections                          — list all projections
POST   /api/projections                          — create projection
GET    /api/projections/:id                      — get projection with computed totals
PUT    /api/projections/:id                      — update global settings (rate, clients, margin)

GET    /api/projections/:id/employees            — list employees
POST   /api/projections/:id/employees            — add employee
PUT    /api/projections/:id/employees/:eid       — update employee
DELETE /api/projections/:id/employees/:eid       — remove employee

GET    /api/projections/:id/subscriptions        — list overheads
POST   /api/projections/:id/subscriptions        — add subscription
PUT    /api/projections/:id/subscriptions/:sid   — update
DELETE /api/projections/:id/subscriptions/:sid   — remove

GET    /api/projections/:id/sales-support        — list sales support resources
POST   /api/projections/:id/sales-support        — add resource
PUT    /api/projections/:id/sales-support/:rid   — update
DELETE /api/projections/:id/sales-support/:rid   — remove

GET    /api/quotations                           — list all quotations
POST   /api/quotations                           — create quotation
GET    /api/quotations/:id                       — get with line items
PUT    /api/quotations/:id                       — update header
DELETE /api/quotations/:id                       — delete

POST   /api/quotations/:id/line-items            — add line item
PUT    /api/quotations/:id/line-items/:lid       — update
DELETE /api/quotations/:id/line-items/:lid       — remove

GET    /api/projections/:id/summary              — full computed summary (wow endpoint)

# Admin — Currencies
GET    /api/admin/currencies                     — list all currencies
POST   /api/admin/currencies                     — add a currency
PUT    /api/admin/currencies/:code               — update rate, name, symbol, active status
DELETE /api/admin/currencies/:code               — remove (not allowed for SAR base)

# Admin — CTC Rules
GET    /api/admin/ctc-rules                      — list all country CTC rules
POST   /api/admin/ctc-rules                      — add a country rule
PUT    /api/admin/ctc-rules/:id                  — update multiplier
DELETE /api/admin/ctc-rules/:id                  — remove

# Admin — System Settings
GET    /api/admin/settings                       — get system settings
PUT    /api/admin/settings                       — update system settings

# AI Chatbot
POST   /api/chat                                 — send a message, get AI response + any actions taken
GET    /api/chat/history                         — retrieve chat history for session
DELETE /api/chat/history                         — clear chat history
```

---

## 4. Pages / Navigation

| Route | Page | Purpose |
|---|---|---|
| `/` | Dashboard | Overview of current projection year, key metrics at a glance |
| `/projection` | Projection | Department Cost + Client Projection + Sales Support all in one scrollable view (matches original Excel layout) |
| `/quotations` | Quotations List | All saved quotations with status |
| `/quotations/new` | New Quotation | Build a quotation, preview, download PDF |
| `/quotations/:id` | View/Edit Quotation | Reopen and modify existing quotation |
| `/admin` | Admin Panel | System-wide settings hub |
| `/admin/currencies` | Currency Management | Add/edit currencies and exchange rates |
| `/admin/ctc-rules` | CTC Rules | Manage country-level CTC multipliers |
| `/admin/settings` | System Settings | Company name, logo, VAT rate, quotation prefix, defaults |

**Chatbot:** Persistent floating panel — no dedicated route; accessible from all pages.

---

## 5. Visual Design Direction

### 5.1 Color Scheme (matching Excel template)

| Element | Color |
|---|---|
| Header / Nav background | Dark Navy `#0E2841` |
| Section headers | Teal `#156082` |
| Alternating table rows | Light Blue `#C0E6F5` |
| Editable input values | Blue `#0000FF` or accent |
| White background | `#FFFFFF` |
| Key outputs | Amber / Gold highlight |

### 5.2 Component Guidelines

- shadcn/ui for all UI components (tables, inputs, dialogs, badges)
- Inline editing for table cells — click to edit, Enter/blur to save
- Real-time computed values update immediately as user types
- Clear visual distinction between **input fields** (editable) and **calculated fields** (read-only)
- Compact, information-dense layout — similar to a spreadsheet feel, but with polished UI
- Responsive for desktop use (primary use case); tablets acceptable

---

## 6. Key Features — Phased Rollout

### Phase 1 (Initial Build — MVP)
- [x] Projection management (create, view, edit)
- [x] Employee table with CTC logic
- [x] Subscription/overhead table with multi-currency conversion
- [x] Per-client economics with live margin calculations
- [x] Sales support resource table
- [x] Quotation builder with line items
- [x] PDF preview and download for quotations
- [x] Dashboard with key summary metrics
- [x] **AI Chatbot** — ask questions and add/update data in plain language
- [x] **Admin Panel** — manage currencies, CTC rules, VAT, system defaults
- [x] **Multi-currency support** — manage any number of currencies with SAR conversion rates

### Phase 2 (Future Enhancements — Flexible)
- [ ] Multiple projection scenarios side-by-side comparison
- [ ] Historical projection archive (browse past years)
- [ ] Per-client customization (different margin per client)
- [ ] Role-based access control (Manager vs. Viewer vs. Finance)
- [ ] Audit log — who changed what and when
- [ ] Email quotation directly to client
- [ ] Live exchange rate feed (auto-sync from a public API)
- [ ] Scenario planning ("what if I hire 2 more engineers?")
- [ ] Budget vs. actuals tracking
- [ ] Dashboard charts — cost breakdown by role, country, client
- [ ] Chatbot can generate and export quotation PDFs directly
- [ ] Chatbot memory across sessions (remembers past conversations)

---

## 7. Assumptions & Constraints

| Item | Detail |
|---|---|
| VAT Rate | Fixed at 15% (Saudi VAT) |
| Default Margin | 30% — editable |
| Default Clients | 5 — editable |
| Default USD→SAR Rate | 3.75 — editable |
| CTC Multiplier Saudi | 1.5× salary |
| CTC Multiplier Pakistan | 1.0× (no markup) |
| Financial Year | Displayed as label only (e.g. 2025–2026); no date filtering needed in Phase 1 |
| PDF Generation | Client-side (browser print or react-pdf); no server-side rendering needed in Phase 1 |
| Authentication | Not required in Phase 1 — can be added in Phase 2 |
| Base Currency | SAR is always the display/base currency; all other currencies are converted to SAR |
| Exchange Rates | Manually managed in admin panel; no auto-feed in Phase 1 |
| AI Chatbot | Write actions always require user confirmation before executing |
| Chatbot Provider | Claude (Anthropic) — accessed via Replit's managed AI integration, no user API key needed |

---

## 8. Out of Scope (Phase 1)

- Payroll processing or GOSI calculations
- Integration with HR or accounting software
- Multi-currency quotation output (quotations always display in SAR)
- Approval workflows
- Mobile-native app
- User authentication and team access control
- Automatic/live exchange rate syncing (rates are manually entered)
- Chatbot memory persisting across browser sessions

---

## 9. Success Metrics

The app is successful when:
1. Department managers can update employee data and see live cost projections in under 30 seconds
2. A new quotation can be generated from projection data in under 5 minutes
3. PDF quotations can be downloaded and sent to clients without manual reformatting
4. All calculated values match the Excel model formulas exactly

---

## 10. Open Questions (for review)

1. **Overhead per client vs. total overhead** — Should overhead be split equally across all clients, or should there be an option to assign specific overheads to specific clients?
2. **Sales support margin** — Should the Sales Support margin be linked to the global margin setting, or always independent?
3. **Quotation numbering** — Should quotation numbers be auto-sequential (Q-001, Q-002…) or editable/prefixed by client?
4. **Multiple projections** — Should the app support multiple active projections (e.g. different teams or departments), or is one active projection per year the model?
5. **Who can edit** — Is authentication needed from day one, or is Phase 1 acceptable as an internal-only open tool?
6. **Chatbot scope** — Should the chatbot only work within the current active projection, or should it be able to switch between projections ("show me last year's numbers")?
7. **Admin access** — Is the Admin Panel open to all users, or should it require a separate password/PIN even without full auth?
8. **Subscription currency input** — With multi-currency, when adding a subscription should users pick from the managed currency list only, or also be able to type a custom currency code?

---

*This document will be updated as requirements are clarified during review.*
