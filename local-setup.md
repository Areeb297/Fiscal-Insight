# Local Setup — Fiscal Insight AI

> One-stop guide to running the Department Projection app on your Windows machine.

---

## Services at a glance

| Service | Path | Port |
|---|---|---|
| API server (Express 5) | `artifacts/api-server` | `8080` |
| Web app (React + Vite) | `artifacts/projection-app` | `5173` (Vite assigns) |
| Mockup sandbox (optional) | `artifacts/mockup-sandbox` | `8081` |

---

## Step 1 — Install prerequisites (once)

### Node.js 20+
Download from https://nodejs.org (choose Node 22 LTS).  
Verify: `node --version`

### pnpm 9+
```bash
npm install -g pnpm
```
Verify: `pnpm --version`

### PostgreSQL 14+
**Option A — Local install:**  
Download from https://www.postgresql.org/download/windows/  
Default port `5432`. Remember the `postgres` superuser password you set.

**Option B — Use hosted Neon (recommended for quick start):**  
Go to https://neon.tech → New project → copy the connection string.  
Format: `postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require`

---

## Step 2 — Install packages

From the repo root (`Fiscal-Insight/`):
```bash
pnpm install
```
This installs all workspace packages in one shot.

---

## Step 3 — Set up Clerk (authentication)

1. Go to https://clerk.com → Create application
2. Name it anything (e.g. "Fiscal Insight Local")
3. Copy from the Clerk dashboard:
   - **Publishable key** — starts with `pk_test_`
   - **Secret key** — starts with `sk_test_`
4. In Clerk dashboard → **Configure → Domains** → add `http://localhost:5173` as an allowed origin

---

## Step 4 — Create the `.env` file

Create `.env` in the repo root (`Fiscal-Insight/.env`):

```env
# ── Database ──────────────────────────────────────────────
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/fiscal_insight
# or for Neon:
# DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require

# ── Session ───────────────────────────────────────────────
SESSION_SECRET=replace-with-a-long-random-string-at-least-32-chars

# ── Clerk ─────────────────────────────────────────────────
VITE_CLERK_PUBLISHABLE_KEY=pk_test_XXXX
CLERK_SECRET_KEY=sk_test_XXXX

# ── AI chatbot (optional) ─────────────────────────────────
# Leave blank if you don't need the chatbot
AI_INTEGRATIONS_ANTHROPIC_API_KEY=sk-ant-XXXX

# ── Ports (optional) ──────────────────────────────────────
PORT=8080
```

> `VITE_*` variables are exposed to the browser bundle — this is intentional for Clerk's publishable key.

---

## Step 5 — Create the local database (if using local Postgres)

Open **PowerShell** or **psql** and run:
```bash
createdb -U postgres fiscal_insight
```

Test the connection:
```bash
psql "postgres://postgres:YOUR_PASSWORD@localhost:5432/fiscal_insight"
```

---

## Step 6 — Push the Drizzle schema

This creates all tables in the database (runs from repo root):
```bash
DATABASE_URL="postgres://postgres:YOUR_PASSWORD@localhost:5432/fiscal_insight" pnpm --filter @workspace/db run push
```

For Neon, use the full Neon connection string instead.

If it warns about destructive changes, force it:
```bash
DATABASE_URL="..." pnpm --filter @workspace/db run push-force
```

---

## Step 7 — Run the app

Open **two terminals** from the repo root:

**Terminal 1 — API server**
```bash
pnpm --filter @workspace/api-server run dev
```
Expected output: `Server listening port: 8080`

**Terminal 2 — Web app**
```bash
pnpm --filter @workspace/projection-app run dev
```
Expected output: `Local: http://localhost:5173/`

Open http://localhost:5173 in your browser, sign in with the Clerk user you created, and the app loads.

### Or start everything at once
```bash
pnpm -r --parallel --filter "./artifacts/*" run dev
```

---

## Step 8 — First-run checklist inside the app

After you can sign in:

- [ ] **Admin → Currencies** — confirm SAR and USD exist. Add them if missing.
- [ ] **Admin → CTC Rules** — add at least one rule (e.g. KSA × 1.20, Pakistan × 1.10).
- [ ] **Projections → New** — create your first projection. Set fiscal year, duration, VAT.
- [ ] Add employees, subscriptions, vendor fees, and infrastructure costs to see the dashboard populate.

> Reference: open the Excel files in `raw/assets/` to get the actual Ebttikar figures to seed.

---

## Step 9 — Seed data from the Excel files

The projection data lives in:
- `raw/assets/Ebttikar_projection sheet.xlsx` — main company model
- `raw/assets/Atif Ahsan - Projection sheet-profit calculations_for replit.xlsx` — profit variant

Open these in Excel, read the employee list, subscriptions, and cost lines, then enter them into the app via the UI.

---

## Useful commands

```bash
# Type-check the whole monorepo
pnpm run typecheck

# Build everything for production
pnpm run build

# Regenerate API client + Zod schemas after editing openapi.yaml
pnpm --filter @workspace/api-spec run codegen

# Push schema changes after editing lib/db/src/schema/
pnpm --filter @workspace/db run push
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Cannot connect to database` | Run `psql "$DATABASE_URL"` to verify connectivity. Check `DATABASE_URL` in `.env`. |
| `Clerk failed to load` | Verify `VITE_CLERK_PUBLISHABLE_KEY` starts with `pk_`. Add `http://localhost:5173` to Clerk allowed origins. |
| Blank dashboard / empty charts | Create a projection first. Dashboard shows roll-up of all projections you own. |
| Schema drift after pulling new code | Re-run `pnpm --filter @workspace/db run push`. |
| Codegen errors | Edit `openapi.yaml`, then run `pnpm --filter @workspace/api-spec run codegen`. |
| `Use pnpm instead` error | You ran `npm install` or `yarn install`. Use `pnpm install` only. |

---

## Environment variable reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string |
| `SESSION_SECRET` | Yes | Random secret for session signing |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk browser key (`pk_test_…`) |
| `CLERK_SECRET_KEY` | Yes | Clerk server key (`sk_test_…`) |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | No | Anthropic key for AI chatbot |
| `PORT` | No | API server port (default 8080) |
| `VITE_API_BASE_URL` | No | Override API base URL (default `http://localhost:8080`) |
