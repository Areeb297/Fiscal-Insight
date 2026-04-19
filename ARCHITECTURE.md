# Architecture — Fiscal Insight AI

> Always read this file at the start of any session. Referenced by CLAUDE.md.

## Monorepo Package Graph

```mermaid
graph TD
    subgraph artifacts
        API["@workspace/api-server<br/>Express 5 · Node.js · PORT 8080"]
        APP["@workspace/projection-app<br/>React 19 · Vite 7 · Browser"]
        SANDBOX["@workspace/mockup-sandbox<br/>Component sandbox · PORT 8081"]
    end

    subgraph lib
        DB["@workspace/db<br/>Drizzle ORM schema + migrations"]
        ZOD["@workspace/api-zod<br/>Zod validation schemas"]
        CLIENT["@workspace/api-client-react<br/>React Query hooks"]
        SPEC["@workspace/api-spec<br/>OpenAPI 3.1 + Orval codegen"]
    end

    API --> DB
    API --> ZOD
    APP --> CLIENT
    APP --> ZOD
    CLIENT --> ZOD
    SPEC -- "codegen →" --> CLIENT
    SANDBOX --> APP
```

## Request Flow

```mermaid
sequenceDiagram
    participant Browser as Browser (projection-app)
    participant Clerk as Clerk Auth
    participant API as api-server
    participant PG as PostgreSQL (Neon)

    Browser->>Clerk: Authenticate (ClerkProvider)
    Clerk-->>Browser: JWT session token
    Browser->>API: HTTP /api/* + Bearer token
    API->>Clerk: Verify token (middleware)
    Clerk-->>API: User context
    API->>PG: Drizzle ORM query
    PG-->>API: Result rows
    API-->>Browser: JSON response
```

## Database Schema Relationships

```mermaid
erDiagram
    projections ||--o{ employees : "has"
    projections ||--o{ subscriptions : "has"
    projections ||--o{ salesSupportResources : "has"
    projections ||--o{ vendorSetupFees : "has"
    projections ||--o{ infrastructureCosts : "has"
    projections ||--o{ quotations : "generates"
    quotations ||--o{ invoices : "produces"
    systemSettings ||--|| projections : "configures"
    ctcRules }o--|| employees : "applies to"
    currencies }o--|| projections : "used by"
```

## Frontend Page → Component → Hook Tree

```mermaid
graph TD
    App["App.tsx<br/>ClerkProvider · QueryClientProvider · WouterRouter"]

    App --> Layout["Layout<br/>Sidebar + Topbar"]
    Layout --> Dashboard["Dashboard<br/>/dashboard"]
    Layout --> Projection["Projection Editor<br/>/projections/:id"]
    Layout --> ProjList["Projections List<br/>/projections"]
    Layout --> Quotations["Quotations<br/>/quotations"]
    Layout --> Invoices["Invoices<br/>/invoices"]
    Layout --> PayCal["Payment Calendar<br/>/payment-calendar"]
    Layout --> Admin["Admin<br/>/admin"]

    Projection --> useQuery["useQuery (React Query)"]
    useQuery --> APIClient["@workspace/api-client-react hooks"]
    APIClient --> ZodSchemas["@workspace/api-zod"]
```

## API Route Map

```mermaid
graph LR
    APP["Express app.ts"] --> MW["Middleware<br/>Pino · Clerk · CORS · Body Parser"]
    MW --> R1["/api/healthz"]
    MW --> R2["/api/projections"]
    MW --> R3["/api/employees"]
    MW --> R4["/api/subscriptions"]
    MW --> R5["/api/sales-support"]
    MW --> R6["/api/vendor-setup-fees"]
    MW --> R7["/api/infrastructure-costs"]
    MW --> R8["/api/quotations"]
    MW --> R9["/api/invoices"]
    MW --> R10["/api/admin"]
    MW --> R11["/api/dashboard"]
    MW --> R12["/api/auth"]

    R2 & R3 & R4 & R5 & R6 & R7 & R8 & R9 --> DB["@workspace/db<br/>Drizzle ORM"]
    R10 --> DB
    R11 --> DB
```

## Build Pipeline

```mermaid
graph LR
    subgraph "pnpm build"
        TC["typecheck:libs<br/>tsc --build (project refs)"]
        TC --> ATC["artifacts typecheck<br/>per-package tsc"]
        ATC --> ABUILD["artifacts build<br/>-r --if-present"]
    end

    subgraph "api-server build"
        ABUILD --> ESB["esbuild (build.mjs)<br/>src/index.ts → dist/index.mjs<br/>ESM · source maps"]
    end

    subgraph "projection-app build"
        ABUILD --> VITE["vite build<br/>React · Tailwind 4<br/>→ dist/"]
    end
```

## Key File Locations

| Concern | Path |
|---|---|
| API entry | `artifacts/api-server/src/index.ts` |
| API app setup | `artifacts/api-server/src/app.ts` |
| API routes dir | `artifacts/api-server/src/routes/` |
| Frontend entry | `artifacts/projection-app/src/main.tsx` |
| Frontend router | `artifacts/projection-app/src/App.tsx` |
| DB schema index | `lib/db/src/schema/index.ts` |
| Drizzle config | `lib/db/drizzle.config.ts` |
| Zod schemas | `lib/api-zod/src/` |
| OpenAPI spec | `lib/api-spec/openapi.yaml` |
| API client hooks | `lib/api-client-react/src/` |
| Shared tsconfig | `tsconfig.base.json` |
| API esbuild | `artifacts/api-server/build.mjs` |
| Vite config | `artifacts/projection-app/vite.config.ts` |
