---
name: verify
description: How to run and verify Planify end-to-end over HTTP (login, server actions, admin panel)
---

# Verify Planify end-to-end

## Start

Postgres runs locally via Homebrew (`brew services list` → `postgresql@17`), on :5432.

```bash
npx prisma migrate deploy   # apply pending migrations
npm run build
AUTH_TRUST_HOST=true npx next start -p 3100   # AUTH_TRUST_HOST is required: without it Auth.js returns UntrustedHost/500 in local prod
```

`prisma migrate dev` is interactive and fails in non-interactive shells. Use `prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<ts>_<name>/migration.sql` and then `prisma migrate deploy`. For renames, write the SQL by hand (`ALTER … RENAME`): `migrate diff` emits DROP/CREATE and loses data. Check for drift afterwards: `migrate diff` against the migrated DB must be empty.

To test migrations or destructive flows without touching the dev DB, work on a copy: `createdb planify_mig -T planify` and start the server with `DATABASE_URL=…/planify_mig`.

## Accounts

- Seed: `demo@planify.health` / `planify123` (`npm run db:seed`).
- The email in `ADMIN_EMAIL` is auto-promoted to ADMIN on login (override the env var when starting the server for tests).

## Login with curl (Auth.js Credentials)

```bash
CSRF=$(curl -s -c s.jar localhost:3100/api/auth/csrf | jq -r .csrfToken)
curl -s -b s.jar -c s.jar -X POST localhost:3100/api/auth/callback/credentials \
  -d "csrfToken=$CSRF" -d "email=..." -d "password=..."   # 302 = ok
curl -s -b s.jar localhost:3100/api/auth/session           # confirms session and role
```

## Calling server actions with curl

Every action can be called with the `Next-Action` header, whether its form is server- or client-rendered.

1. Action ids: `.next/server/server-reference-manifest.json` (`node` → id → `exportedName`, and `workers` lists which pages use it). They change on every build.
   ```bash
   node -e 'const m=require("./.next/server/server-reference-manifest.json");for(const[id,v] of Object.entries(m.node))if(v.exportedName&&!v.exportedName.startsWith("$$"))console.log(v.exportedName,id)'
   ```
2. **FormData actions**: multipart POST to the page, data fields prefixed with `_1_`, and the root field `0` LAST (decoding is streaming: if `0` comes first, FormData arrives empty and zod says "expected string, received undefined"):
   ```bash
   curl -b s.jar -X POST localhost:3100/<page> -H 'Next-Action: <id>' \
     -F '_1_field1=value' -F '_1_field2=value' -F '0=["$K1"]'
   ```
3. **Actions with plain arguments** (e.g. `generatePlanAction(consultationId)`, `approveConsultation(id, { confirm })`): send the JSON array of arguments as the body:
   ```bash
   curl -b s.jar -X POST localhost:3100/consultas/<id> -H 'Next-Action: <id>' \
     -H 'Content-Type: text/plain;charset=UTF-8' --data-raw '["<consultationId>",{"confirm":true}]'
   ```
4. Responses: a redirect is 303 with an `x-action-redirect` header; a returned value (`{ok:…}`) is on the `1:{…}` line of the flight stream; an error thrown in prod is a 500 with a masked message (check the effect in the DB with psql, not the message).

Server-rendered forms (`<form action={serverAction}>` in a server component) also embed `$ACTION_ID_<hash>` in the HTML; the hash that shows up on EVERY page is the layout's signOut.

## Gotchas

- Code is in English; the UI, routes and URL query params are in Spanish (`/consultas/nueva?paciente=<id>`, `/agenda?mes=2026-10&dia=2026-10-02`, `/pacientes?filtro=pendiente`, `/consultas?estado=aprobadas`).
- `/consultas/nueva` without `?paciente=<id>` redirects to `/pacientes`.
- Generating a plan makes a real (paid) call to the AI provider; `promptVersion` should be the current one (`plan-v3`).
- Flows worth checking: the `/admin` guard (admin 200 / non-admin 307 to dashboard), suspension (a live session goes to `/login?error=suspendida` on the next navigation; logging in again gives CredentialsSignin), the quota (createConsultation blocks once the tier's calendar-month limit is reached), tenant isolation (another account's patient/consultation → 404, actions → "no encontrado").
