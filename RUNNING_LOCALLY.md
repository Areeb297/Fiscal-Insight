# Running the Department Projection app locally

This is a pnpm monorepo with three live services:

| Service | Path | Default port |
|---|---|---|
| **API server** (Express) | `artifacts/api-server` | `8080` (uses `PORT` env) |
| **Projection web app** (React + Vite) | `artifacts/projection-app` | random Vite port |
| **Mockup sandbox** (component preview, optional) | `artifacts/mockup-sandbox` | `8081` |

The two services that matter for normal use are the **API server** and the **projection web app**.

---

## 1. Prerequisites

Install these once on your machine:

- **Node.js 20+** (Node 22 recommended) — https://nodejs.org
- **pnpm 9+** — `npm install -g pnpm`
- **PostgreSQL 14+** running locally, OR a hosted Postgres URL (Neon, Supabase, Replit DB, RDS, etc.)
- A **Clerk** account (free) for authentication — https://clerk.com
- (Optional) An **Anthropic** API key if you want the AI chatbot to work

---

## 2. Clone and install

```bash
git clone <your-repo-url> projection-app
cd projection-app
pnpm install
```

`pnpm install` will install every package in the monorepo in one shot.

---

## 3. Set up the database

### Option A — Use a local Postgres
```bash
# create a database
createdb projection_dev
```
Your connection string will look like:
```
postgres://<user>:<password>@localhost:5432/projection_dev
```

### Option B — Use a hosted Postgres
Grab the connection string from Neon / Supabase / Replit / etc. It must look like:
```
postgresql://USER:PASSWORD@HOST:PORT/DBNAME
```

### Push the schema
The schema lives in `lib/db/src/schema/` and is managed by Drizzle.

```bash
# from the repo root
DATABASE_URL="postgres://..." pnpm --filter @workspace/db run push
```

If Drizzle complains about destructive changes (e.g. when you change a column), you can force it:
```bash
DATABASE_URL="postgres://..." pnpm --filter @workspace/db run push-force
```

That single command creates every table the app needs (`projections`, `employees`, `subscriptions`, `sales_support_resources`, `vendor_setup_fees`, `infrastructure_costs`, `quotations`, `currencies`, `ctc_rules`, etc.).

---

## 4. Set up Clerk (authentication)

1. Create a Clerk application at https://clerk.com.
2. In the Clerk dashboard, copy:
   - **Publishable key** (starts with `pk_test_…`)
   - **Secret key** (starts with `sk_test_…`)
3. Add at least one user (the app uses Clerk's sign-in screens out of the box).

---

## 5. Configure environment variables

Create a single file at the repo root called `.env` containing:

```bash
# --- database ---
DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/projection_dev

# --- session ---
SESSION_SECRET=replace-with-a-long-random-string

# --- Clerk (used by both server and frontend) ---
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# --- AI chatbot (optional) ---
# Only needed if you want the in-app chatbot to answer questions.
AI_INTEGRATIONS_ANTHROPIC_BASE_URL=https://api.anthropic.com
AI_INTEGRATIONS_ANTHROPIC_API_KEY=sk-ant-xxx

# --- ports (optional, defaults shown) ---
PORT=8080
```

> The `VITE_*` variables must be prefixed with `VITE_` so they're exposed to the browser bundle. The others stay server-side.

You can also set the same variables in your shell or via `direnv` if you prefer not to commit a `.env`.

---

## 6. Run it

In **two terminals** from the repo root:

**Terminal 1 — API server**
```bash
pnpm --filter @workspace/api-server run dev
```
You should see:
```
Server listening port: 8080
```

**Terminal 2 — Web app**
```bash
pnpm --filter @workspace/projection-app run dev
```
Vite will print a local URL such as `http://localhost:5173/`. Open it in your browser, sign in with the Clerk user you created, and the app loads.

The web app calls the API on `http://localhost:8080` by default. If you change `PORT`, also update `VITE_API_BASE_URL` in `.env` (or your local Vite config) to match.

### Optional — start everything at once
```bash
pnpm -r --parallel --filter "./artifacts/*" run dev
```

### Optional — component preview sandbox
Only needed when iterating on UI mockups:
```bash
pnpm --filter @workspace/mockup-sandbox run dev
```

---

## 7. Useful commands

```bash
# Type-check the whole monorepo
pnpm run typecheck

# Build everything for production
pnpm run build

# Regenerate the API client + zod schemas from openapi.yaml
pnpm --filter @workspace/api-spec run codegen

# Push schema changes after editing files in lib/db/src/schema/
pnpm --filter @workspace/db run push
```

---

## 8. First-run checklist inside the app

Once you can sign in:

1. Open **Admin → Currencies** and confirm SAR + USD exist (seed them if not).
2. Open **Admin → CTC Rules** and add at least one country rule (e.g. KSA × 1.20, Pakistan × 1.10) so employee CTC math works.
3. Go to **Projections → New** and create your first projection. Set fiscal year, duration, and VAT in the new top header bar.
4. Add employees, subscriptions, sales support, vendor setup fees, and infrastructure costs as needed — each section auto-recomputes the summary KPIs and dashboard charts.

---

## 9. Troubleshooting

- **"Cannot connect to database"** — verify `DATABASE_URL` works with `psql "$DATABASE_URL"`.
- **"Clerk failed to load"** — double-check `VITE_CLERK_PUBLISHABLE_KEY` (it must start with `pk_`) and that the Clerk app's allowed origins include your local URL.
- **Blank dashboard / empty charts** — you probably haven't created a projection yet, or the projection has no employees/subscriptions. The dashboard is a roll-up of all projections you own.
- **Schema drift after pulling new code** — re-run `pnpm --filter @workspace/db run push`.
- **Codegen errors after editing `openapi.yaml`** — run `pnpm --filter @workspace/api-spec run codegen` to regenerate clients and zod schemas.

That's it — you should now have the full app running locally end to end.
