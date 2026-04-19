# Department Projection Manager

## Overview

Financial projection and cost management application for the Ebttikar department operating across Saudi Arabia and Pakistan. Tracks employee costs with CTC rules based on work location, projects per-client economics, manages subscriptions/overheads, generates quotations, includes an AI chatbot, and has an admin panel.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite, shadcn/ui, Tailwind CSS, wouter routing
- **Backend**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Clerk (managed by Replit)
- **AI**: Anthropic Claude via Replit AI Integrations proxy
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Architecture

### Artifacts
- `artifacts/api-server` — Express API server (port 8080)
- `artifacts/projection-app` — React + Vite frontend (root path `/`)
- `artifacts/mockup-sandbox` — Design preview server

### Shared Libraries
- `lib/db` — Drizzle ORM schema and database connection
- `lib/api-spec` — OpenAPI spec (source of truth for API contract)
- `lib/api-zod` — Generated Zod schemas from OpenAPI
- `lib/api-client-react` — Generated TanStack Query hooks from OpenAPI

## Database Schema

- `projections` — Year projections with SAR rate, # clients, margin %
- `employees` — Team members with name, title, country (work location), salary, months, allocation %
- `subscriptions` — Monthly subscriptions/overheads with multi-currency support
- `sales_support_resources` — Post-deployment managed services resources (with allocation %)
- `quotations` — Client quotations with status tracking
- `quotation_line_items` — Individual line items for quotations
- `currencies` — Exchange rates (base: SAR)
- `ctc_rules` — CTC multipliers per country (SA = 1.5x, PK = 1.0x)
- `system_settings` — Global settings (VAT, margin, company name, etc.)

## Key Business Rules

- CTC is based on WORK LOCATION (country field), not nationality
- Saudi Arabia (SA) = salary x 1.5 CTC multiplier
- Pakistan (PK) = salary x 1.0 (no markup)
- Default currency is SAR; all amounts auto-converted using admin exchange rates
- VAT is fixed at 15% on quotations
- Selling price = total cost / (1 - margin%)
- Resource cost model (DURATION model — adopted Apr 2026):
  - **Monthly run-rate** per employee = `salary × CTC × (allocation% / 100)` — what the team costs each month they are engaged.
  - **Engagement total** per employee = `salary × CTC × months × (allocation% / 100)` — what is committed for the whole engagement.
  - `engagementMonths` for a projection = max `monthsFte` across all its employees (defaults to 12 when there are no employees). Used to amortize one-time overheads and to compute "engagement total" rollups.
  - Per-client monthly cost = total monthly dept cost / numClients; selling price (monthly) = per-client monthly / (1 − margin%).
  - Per-client engagement cost = total engagement dept cost / numClients; selling price (engagement) = per-client engagement / (1 − margin%).
  - Sales support resources use the same allocation rule for their own line totals, but `months` here is the resource's own contract length, independent of the dept engagement.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `npx tsx lib/db/src/seed.ts` — seed database with initial data

## API Routes

All routes prefixed with `/api`:
- `GET/POST /projections`, `GET/PUT /projections/:id`
- `GET /projections/:id/summary` — computed financial summary
- `GET/POST /projections/:projectionId/employees`, `PUT/DELETE .../employees/:id`
- `GET/POST /projections/:projectionId/subscriptions`, `PUT/DELETE .../subscriptions/:id`
- `GET/POST /projections/:projectionId/sales-support`, `PUT/DELETE .../sales-support/:id`
- `GET/POST /projections/:projectionId/vendor-setup-fees`, `PUT/DELETE .../vendor-setup-fees/:id`
- `GET/POST /projections/:projectionId/infrastructure-costs`, `PUT/DELETE .../infrastructure-costs/:id`
- `GET/POST /quotations`, `GET/PUT/DELETE /quotations/:id`
- `POST /quotations/:quotationId/line-items`, `PUT/DELETE .../line-items/:id`
- `GET/POST /admin/currencies`, `PUT/DELETE /admin/currencies/:id`
- `GET/POST /admin/ctc-rules`, `PUT/DELETE /admin/ctc-rules/:id`
- `GET/PUT /admin/settings`
- `POST /chat` — AI chatbot
- `GET /dashboard` — dashboard summary

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — Session secret
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk publishable key
- `CLERK_SECRET_KEY` — Clerk secret key
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` — Anthropic proxy URL (auto-set)
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` — Anthropic proxy key (auto-set)
