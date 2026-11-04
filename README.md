# ClinicSync

ClinicSync is a Next.js application backed by a least-privilege Supabase booking database. The current work targets only the development project `clinicsync-dev` (`xqwdvjceelmzoxuuqyhm`, region `eu-west-1`). No production data or real patient data has been used.

## Implemented

- Five database tables: `doctors`, `patients`, recurring weekly `availability`, `appointments`, and `staff_members` linked to `auth.users`.
- RLS and column grants for public doctor/schedule reads, staff clinic operations, and admin configuration. Public users cannot read patients or appointments; the booking DB role has no direct patient/appointment table access.
- `btree_gist` exclusion protection for overlapping active appointments, plus DB-enforced status transitions.
- Restricted `SECURITY DEFINER` functions for atomic web booking and expiry. Booking validates active doctor, active weekly schedule, slot alignment/duration, future time, E.164, and `Africa/Cairo`; an exclusion conflict rolls back the inserted patient. The request expires at `LEAST(now + 24 hours, starts_at - 1 hour)`; no extra two-hour notice is applied.
- `POST /api/appointments`, a Node.js Route Handler backed by `pg`, a one-connection-per-warm-instance pool, TLS certificate and hostname verification, bounded JSON parsing, safe responses, and best-effort per-instance throttling.
- Automated synthetic API/validation/rate-limit tests. Database behavior was exercised against the development project with synthetic records.

The booking page UI is not part of this API integration. API success returns only the appointment ID and timing/status; it never returns the patient name or phone.

## Local checks

```bash
npm ci
npm test
npm run lint
npm run build
```

Do not use `npm audit fix --force` or force a `minimatch@11` override. The accepted temporary minimatch advisory deferral is recorded in [`docs/technical-debt.md`](docs/technical-debt.md); revisit it before production.

## Booking API

`POST /api/appointments` accepts JSON with exactly these fields:

```json
{
  "doctorId": "<active-doctor-uuid>",
  "fullName": "<patient name>",
  "phoneE164": "<E.164 phone>",
  "startsAt": "2026-11-04T10:00:00+02:00"
}
```

`startsAt` must be an ISO timestamp with an explicit offset whose written wall time matches `Africa/Cairo`; seconds must be zero. The database is authoritative for schedule, DST ambiguity, the one-hour expiry cutoff, and concurrency.

- `201`: safe appointment ID, status, UTC timestamps, and `timeZone: "Africa/Cairo"`.
- `409`: slot conflict.
- `400`, `404`, or `422`: invalid request, unavailable doctor, or invalid/closed slot.
- `429`: throttled request.
- `503`: configuration or database failure; internal details are not returned or logged.

## Local database connection setup

The API reads local secrets from `.env.local`; the committed `.env.example` contains safe placeholders only. The `booking_api` password was configured privately in Supabase, but no `.env.local` or successful local connection exists in this workspace.

1. In the **`clinicsync-dev` Supabase Dashboard**, open the project’s **Connect** panel and copy the **Shared Pooler / Session** hostname exactly. Do not substitute the direct database host or infer a pooler hostname. The app uses port `5432`, database `postgres`, and role `booking_api.xqwdvjceelmzoxuuqyhm`.
2. The `booking_api` role has `LOGIN` and no direct patient/appointment privileges; its password was configured privately and is not stored in this repository. Do not put the password in this repository or send it in chat.
3. On your local computer, copy `.env.example` to `.env.local` and set:
   - `CLINICSYNC_POOLER_HOST` — exact hostname copied in step 1, without scheme/port.
   - `CLINICSYNC_DB_PASSWORD` — the private `booking_api` role password.
   - `CLINICSYNC_DB_SSL_CA` — the Supabase database CA PEM from Database Settings. Preserve the PEM newlines.
4. Restart the local development server after saving `.env.local`. Never put these values in `NEXT_PUBLIC_*`, browser code, Git, logs, or chat. The CA is required for TLS verification; do not disable certificate or hostname checks.

The DB client verifies the TLS certificate chain and pooler hostname, has pool max 1, uses transaction-scoped timeouts, and sends no named prepared statements. `server-only` guards the DB module. No Edge Runtime workaround is used; this Next.js 16 app uses the default Node runtime (Cache Components disallows an explicit runtime segment export).

## Expiration scheduler status — decision required

The target has pg_cron `1.6.4`, `cron.database_name = 'postgres'`, `cron.use_background_workers = off`, and `cron.timezone = 'GMT'`. The installed catalog includes `cron.schedule(text, text, text)`; the production job name is unused. A temporary job stored under `clinicsync_cron_runner` (which is `NOLOGIN` and has no direct appointment `UPDATE`) failed with `connection failed`; a temporary `postgres` job succeeded. Both jobs were unscheduled, and **no recurring ClinicSync cleanup job is active**. Their small `cron.job_run_details` audit records remain; they contain no patient data.

This is a Supabase run-as/configuration boundary, not a booking-function failure. Keep the restricted `NOLOGIN` runner by enabling/testing pg_cron background-worker execution (a postmaster setting requiring a controlled project restart and resource review), or explicitly approve a different scheduled identity. Do not silently replace the runner with `postgres` or change its login/password. Lazy cleanup during booking remains active while the recurring job is paused.

The extension-owned `cron` schema has no `USAGE` for `anon`, `authenticated`, `service_role`, `booking_api`, or either ClinicSync restricted role. Supabase owns the extension objects and their explicit default `PUBLIC` ACLs; the attempted revocations from the project’s `postgres` role did not change those owner-granted ACL entries. The effective schema boundary was rechecked after installation. Re-audit this if the extension schema is ever exposed or its ownership changes.

## Known operational limit

The API’s small in-memory limiter allows 12 requests per client address per minute and 3 per phone per 10 minutes. It hashes keys in a per-warm-instance map and is not a distributed abuse-control system. Before public production traffic, put a shared limiter (for example, managed Redis/Upstash) or Vercel WAF rule in front of this endpoint and configure its private credentials outside this repository.

## Database migrations

The ordered migrations are under `supabase/migrations/` and are recorded in the target project’s migration history. They create the schema, security roles/policies/functions, booking/expiry logic, pg_cron extension, and extension ACL review. The first admin is intentionally not provisioned by a migration; bootstrap an admin only through a trusted process. The current development data tables are empty (zero doctors, availability rows, patients, appointments, and staff members); all synthetic booking fixtures were cleaned up.
