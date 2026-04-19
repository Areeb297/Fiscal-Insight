# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Always read [`ARCHITECTURE.md`](./ARCHITECTURE.md) at the start of every session.** It contains Mermaid diagrams of all package relationships, request flows, DB schema, and key file locations.

---

## What This Project Is

Fiscal Insight AI is a financial projection and cost management web app for a department operating across Saudi Arabia and Pakistan. It replaces Excel with live calculations for employee CTC projections, client profitability, overhead/subscription management, quotation generation, and invoice tracking. Primary currency is SAR.

---

## Commands

```bash
# Full dev (API + frontend concurrently)
pnpm dev

# Individual services
pnpm dev:api        # api-server on PORT 8080
pnpm dev:app        # projection-app on Vite default port

# Type checking
pnpm typecheck      # all packages
pnpm typecheck:libs # lib packages only (faster)

# Build (runs typecheck first)
pnpm build

# Database
pnpm --filter @workspace/db run push        # apply schema changes
pnpm --filter @workspace/db run push-force  # force push

# Regenerate API client from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Component sandbox
pnpm --filter @workspace/mockup-sandbox run dev   # PORT 8081

# Tests (api-server only, Vitest)
pnpm --filter @workspace/api-server run test
```

---

## Monorepo Layout

```
artifacts/
  api-server/       Express 5 REST API (Node.js)
  projection-app/   React 19 frontend (Vite 7)
  mockup-sandbox/   Component design sandbox
lib/
  db/               Drizzle ORM schema + migrations (PostgreSQL)
  api-zod/          Zod schemas shared by API and frontend
  api-client-react/ React Query hooks (generated via Orval from api-spec)
  api-spec/         OpenAPI 3.1 spec + Orval codegen config
scripts/            Utility scripts (tsx)
```

---

## Architecture in Brief

- **api-server** depends on `@workspace/db` and `@workspace/api-zod`
- **projection-app** depends on `@workspace/api-client-react` and `@workspace/api-zod`
- **api-client-react** is generated from **api-spec** via `pnpm codegen` — never hand-edit those generated files
- All packages share `tsconfig.base.json` (ES2022, bundler resolution, strict)
- Dependency versions are pinned in the pnpm workspace `catalog` in `pnpm-workspace.yaml` — add new deps there, not in individual `package.json` files

### Authentication
Clerk handles auth. The API verifies JWTs via `@clerk/express` middleware in `app.ts`. The frontend wraps everything in `ClerkProvider`. Required env vars: `CLERK_SECRET_KEY` (server) and `VITE_CLERK_PUBLISHABLE_KEY` (browser).

### Database
Drizzle ORM with PostgreSQL (Neon hosted). Schema lives in `lib/db/src/schema/index.ts`. After changing schema, run `pnpm --filter @workspace/db run push`. The `DATABASE_URL` env var must be set at the root `.env`.

### API Client Codegen
`lib/api-spec/openapi.yaml` is the source of truth for the API contract. Run `pnpm --filter @workspace/api-spec run codegen` after changing the spec to regenerate the React Query hooks in `lib/api-client-react`.

### Frontend Routing
Wouter (not React Router). Routes are defined in `artifacts/projection-app/src/App.tsx`.

### Styling
TailwindCSS v4 with `@tailwindcss/vite` plugin. Path alias `@/` maps to `artifacts/projection-app/src/`.

---

## Environment Variables

| Variable | Where used |
|---|---|
| `DATABASE_URL` | api-server, lib/db |
| `CLERK_SECRET_KEY` | api-server |
| `VITE_CLERK_PUBLISHABLE_KEY` | projection-app (browser) |
| `PORT` | api-server (default 8080) |
| `SESSION_SECRET` | api-server |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | api-server (optional, chatbot) |

`VITE_*` variables are bundled into the browser — never put secrets there.

---

## Pre-Commit Build Rule

**Always verify the build passes before committing and pushing.** Run:
```bash
node artifacts/api-server/build.mjs   # must complete with ⚡ Done
```
Only commit after this succeeds. Do not rely on TypeScript type-check passing — esbuild is the build tool and is the source of truth for whether the server will run.

**Git author rule:** Always commit as `Areeb297 <areeb.shafqat@gmail.com>`. Never commit with `areeb-cloudtech` or `areeb.s@cloudtech.com.sa` — Vercel blocks deployments from that author on the Hobby plan.

---

## Deployment

| Service | Platform | Notes |
|---|---|---|
| `artifacts/api-server` | Railway | Root dir: `/`, build: `pnpm --filter @workspace/api-server run build`, start: `pnpm --filter @workspace/api-server run start` |
| `artifacts/projection-app` | Vercel | Root dir: `artifacts/projection-app`, Vite auto-detected |

Railway needs: `DATABASE_URL`, `CLERK_SECRET_KEY`, `SESSION_SECRET`, `NODE_ENV=production`  
Vercel needs: `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_BASE_URL` (Railway URL)

---

## Adding a New API Endpoint

1. Add the route to `lib/api-spec/openapi.yaml`
2. Run `pnpm --filter @workspace/api-spec run codegen`
3. Add Zod schema to `lib/api-zod/src/`
4. Implement route handler in `artifacts/api-server/src/routes/`
5. Register route in `artifacts/api-server/src/app.ts`
