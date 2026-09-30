# Planify

Multi-tenant SaaS for nutritionists: patient records, consultations, and **AI-generated meal plans that a professional reviews and approves before they reach the patient**.

> The UI, routes and AI-generated content are in Spanish (target market: Mexico). The code, database schema and comments are in English.

## Why it's built this way

The AI never has the last word. Every plan goes through a human-in-the-loop flow:

```
consultation data ──► LLM (structured output) ──► Zod validation ──► clinical checks ──► nutritionist edits ──► approve ──► PDF
                          OpenAI | Anthropic        same schema      Mifflin-St Jeor       (draft until          (export only
                                                                     arithmetic warnings    approved)             if approved)
```

- **Provider-agnostic AI layer.** `lib/ai/generarPlan.ts` dispatches to `lib/ai/providers/{openai,anthropic}.ts` based on `AI_PROVIDER`. Both use the same prompt and are validated against the **same Zod schema** (`lib/ai/planSchema.ts`), so switching providers is a config change, not a code change.
- **Versioned prompts with few-shot examples.** `lib/ai/prompts/plan-v3.ts` + `lib/ai/prompts/examples/`. The examples are validated against the schema at import time: if the schema drifts, the build fails instead of silently degrading the prompt. The static prefix (system + few-shots) is kept stable for prompt caching.
- **Auditability.** Each consultation stores `promptVersion`, `modeloIA`, `inputTokens`, and `outputTokens`.
- **Clinical guardrails.** On approval, `lib/calculations.ts` checks the plan's energy and macros against Mifflin-St Jeor BMR and the activity factor; warnings require explicit confirmation.
- **Cost control.** A hard cap of 3 AI generations per consultation plus monthly per-tier quotas, cut over in Mexico City time even though the server runs in UTC (`lib/limits.ts`).
- **Data minimization.** Only clinical data is sent to the model, never the patient's identity.
- **Multi-tenancy.** Every Prisma query is scoped by `userId` (`requireUser()` in `lib/auth.ts`).

Also included: patient progress charts, an appointment calendar with WhatsApp reminder links, password recovery, an admin area (accounts, tiers), and a feature-request inbox where `scripts/analyze-feature-requests.mjs` (`npm run requests:analyze`) runs Claude Code headless (read-only) over this repo to draft a feasibility verdict. Drafts are reviewed in `/admin/solicitudes` before anything is sent.

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · Tailwind 4 · Prisma 6 + PostgreSQL · Auth.js v5 (email + password; Google OAuth and magic link enabled by env) · OpenAI / Anthropic SDKs · Zod 4 · Resend.

## Running locally

Requires Node 22+ and Docker (or any local Postgres).

```bash
npm install
docker compose up -d                 # Postgres 16 on :5432
cp .env.example .env                 # then set AUTH_SECRET and OPENAI_API_KEY (or ANTHROPIC_API_KEY)
touch .env.local                     # optional overrides; the npm scripts expect the file to exist
npx prisma migrate dev
npm run db:seed                      # demo account: demo@planify.health / planify123
npm run dev                          # http://localhost:3000
```

See `.env.example` for every variable and its default.

### Main flow

Sign up (`/registro`) → add a patient (with data-consent) → new consultation (anthropometrics, goals, restrictions) → **Generate plan with AI** → review/edit → **Approve** (runs clinical checks) → export PDF (`/consultas/[id]/imprimir`).

## Project layout

```
app/(app)/           authenticated pages; route names are Spanish: pacientes, consultas, agenda, planes, admin, ajustes
app/actions/         server actions (all tenant-scoped)
lib/ai/              provider dispatch, providers, Zod plan schema, versioned prompts + few-shot examples
lib/calculations.ts  BMI / BMR (Mifflin-St Jeor) and plan validation
lib/dates.ts         appointment dates, always in America/Mexico_City
lib/limits.ts        tiers, monthly quotas, per-consultation generation cap
prisma/              schema, migrations, demo seed
scripts/             feature-request export and AI feasibility analysis
```
