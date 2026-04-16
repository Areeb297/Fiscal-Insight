# Project Projection Web Application
## Product Requirements Document (PRD) & Scope of Work

**Version:** 1.0  
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
- **Editable defaults** — margin %, number of clients, USD→SAR rate are all globally editable
- **Multi-year support** — each projection is scoped to a financial year (e.g. 2025–2026)

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

## 3. Technical Architecture

### 3.1 Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React + Vite | Hosted as a static artifact |
| UI Components | shadcn/ui + Tailwind CSS | Professional design system |
| Backend / API | Express (Node.js) | Existing API server in monorepo |
| Database | PostgreSQL + Drizzle ORM | Already provisioned in monorepo |
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
| `/settings` | Settings | Manage global defaults (SAR rate, margin, # clients, year label) |

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
- [x] Subscription/overhead table with USD→SAR conversion
- [x] Per-client economics with live margin calculations
- [x] Sales support resource table
- [x] Quotation builder with line items
- [x] PDF preview and download for quotations
- [x] Dashboard with key summary metrics

### Phase 2 (Future Enhancements — Flexible)
- [ ] Multiple projection scenarios side-by-side comparison
- [ ] Historical projection archive (browse past years)
- [ ] Per-client customization (different margin per client)
- [ ] Role-based access control (Manager vs. Viewer vs. Finance)
- [ ] Audit log — who changed what and when
- [ ] Email quotation directly to client
- [ ] Currency support beyond SAR/USD (e.g. PKR)
- [ ] Scenario planning ("what if I hire 2 more engineers?")
- [ ] Budget vs. actuals tracking
- [ ] Dashboard charts — cost breakdown by role, country, client

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
| Currency | SAR is the display currency always; USD subscriptions are auto-converted |

---

## 8. Out of Scope (Phase 1)

- Payroll processing or GOSI calculations
- Integration with HR or accounting software
- Multi-currency quotations
- Approval workflows
- Mobile-native app
- User authentication and team access control

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

---

*This document will be updated as requirements are clarified during review.*
