# Intern Dashboard

A lightweight internal web app for tracking intern progress — a stripped-down Slack focused on **weekly intern check-ins with supervisor/admin visibility**.

- **Interns** fill a weekly update form and use channels + DMs.
- **Supervisors** see a dashboard of their department's interns and set a status (On track / At risk / Behind).
- **Admins/Coordinators** see all departments and manage users, channels, departments, and reminder settings.

## Tech stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) + TypeScript | Server Components enforce RBAC before render |
| Database | **Neon Postgres** (dev + prod) via Prisma 6 | Serverless Postgres; works on Vercel where SQLite can't |
| Auth | **Auth.js v5** + Google OAuth | Low-friction login; JWT sessions (edge-readable, no DB call) |
| Styling | Tailwind CSS v4 | Clean, minimal |
| Validation | zod | Validates API/form input before it hits the DB |
| Reminders | Vercel Cron → API route | Serverless-friendly scheduled job |

**Extra libraries beyond the base stack** (all small, standard): `next-auth`, `@auth/prisma-adapter`, `zod`, and `tsx` (dev-only, runs the TypeScript seed).

## Roles & access (RBAC)

Access is gated in **two layers**:
1. **`src/proxy.ts`** (edge middleware) — is there a session at all? Redirects to `/login` (or 401 for `/api/*`).
2. **`src/lib/rbac.ts`** (`requireUser` / `requireRole` / `requireApiRole`) — called at the top of every protected page and API route. Data queries are also **scoped** (e.g. a supervisor's dashboard filters to their `departmentId`, and the status API re-checks the intern is in their department server-side).

| Page / route | INTERN | SUPERVISOR | ADMIN |
|---|:-:|:-:|:-:|
| `/form` (weekly form) | ✅ | — | — |
| `/channels`, `/dm` | ✅ | ✅ | ✅ |
| `/dashboard` | — | ✅ (own dept) | ✅ (all) |
| `/admin` | — | — | ✅ |

## Local setup

```bash
# 1. Install deps
npm install

# 2. Environment — .env is already created for this project with the Neon
#    connection strings + an AUTH_SECRET. To recreate it, copy .env.example
#    and fill in the values.

# 3. Create the database schema (already applied for this project)
npx prisma migrate dev

# 4. Seed sample data (4 departments, 15 interns, 4 supervisors, 1 admin)
npm run db:seed

# 5. Run
npm run dev        # http://localhost:3000
```

Handy scripts: `npm run db:studio` (browse data), `npm run db:reset` (drop + re-migrate + re-seed).

## How to test immediately

Because login is **Google OAuth**, the 15 seeded interns (fake emails) can't log in via Google. So in **development only**, the login page shows a **"Sign in as…" switcher** — pick any seeded user (admin, supervisor, or intern) and jump straight in. This is hard-gated off when `NODE_ENV !== "development"`.

- The **admin** is seeded as `claude15@leptonmaps.com` — that real email can also sign in via Google in production.
- Try it: sign in as an **intern** → land on the form; as a **supervisor** → see only your department; as **admin** → see everything + `/admin`.

**Note on overdue highlighting:** the form is due Friday; an intern is "overdue" 3 days later (Monday). So mid-week you'll see "Pending", not "Overdue" — that's correct. To see the overdue/reminder behavior now, an admin can lower **Overdue after (days)** to `0` and set an earlier due day in `/admin`, then click **Run reminders now**.

## Reminders

`src/lib/reminders.ts` finds interns who haven't submitted the current week's form once past the overdue threshold, and creates an in-app notification (the bell in the sidebar). It's deduped (one reminder per intern per week) and the interval + due day are **configurable in `/admin`** (stored in the `AppSetting` table).

- **Scheduled:** `vercel.json` runs `GET /api/cron/reminders` daily at 09:00 UTC.
- **Manual:** admins can hit **Run reminders now** in `/admin`.
- **Email (later):** delivery is in-app for now. The drop-in point is marked in `src/lib/reminders.ts` — add e.g. `nodemailer` there and send to each `toRemind` user.

## Deploying to Vercel

1. **Push to a Git repo** and import it into Vercel.
2. **Environment variables** (Vercel → Project → Settings → Environment Variables):
   - `DATABASE_URL` — Neon **pooled** connection string (host has `-pooler`).
   - `DIRECT_URL` — Neon **direct** connection string (no `-pooler`), for migrations.
   - `AUTH_SECRET` — `openssl rand -base64 33`.
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — from Google Cloud Console (see below).
   - `ALLOWED_EMAIL_DOMAINS` — e.g. `leptonmaps.com` (who may sign in with Google).
   - `CRON_SECRET` — any random string; Vercel sends it as a bearer token to the cron route.
3. **Google OAuth** (https://console.cloud.google.com/apis/credentials → Create OAuth client → Web application):
   - Authorized redirect URI: `https://YOUR-DOMAIN.vercel.app/api/auth/callback/google`
   - (For local dev: `http://localhost:3000/api/auth/callback/google`)
4. **Run migrations on deploy.** Set the build command to apply migrations first:
   `prisma migrate deploy && next build` (or run `npx prisma migrate deploy` once against prod).
5. **Seed prod (optional):** run `npm run db:seed` against the prod `DATABASE_URL` once if you want sample data.

## Project structure

```
src/
  proxy.ts                 Edge auth gate (was middleware.ts)
  auth.ts / auth.config.ts Auth.js config (node / edge-safe split)
  lib/
    prisma.ts   rbac.ts    DB client + role guards
    week.ts     settings.ts Weekly cadence math + configurable settings
    reminders.ts dashboard.ts access.ts validation.ts
  components/               Sidebar, MessagePanel, WeeklyForm, StatusEditor, ...
  app/
    login/                  Login (Google + dev switcher)
    (app)/                  Authenticated shell (sidebar) + pages
      channels/  dm/  form/  dashboard/  admin/
    api/                    Route handlers (messages, form, status, notifications, cron)
prisma/
  schema.prisma  seed.ts
```

## Notes

- **Real-time:** messages + notifications use **polling** (3s / 20s). Vercel serverless can't hold WebSocket connections; polling is the right trade-off here.
- **Portability:** the schema is standard Postgres; moving Neon → another Postgres is just a connection-string change.
