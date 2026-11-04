# Temporary Technical Debt and Deployment Blockers

## TD-001 — `minimatch` glob-pattern denial-of-service advisory

- **Status:** Temporarily deferred; must be revisited before production deployment.
- **Accepted:** 2026-11-02.
- **Advisory:** [GHSA-g3hv-75wg-m249 / CVE-2026-118764](https://github.com/advisories/GHSA-g3hv-75wg-m249).
- **Affected area:** Development and linting dependencies. The audit reported 16 moderate package entries that trace to this one advisory. The dependency tree currently contains `minimatch` 3.1.5 and 10.2.6; the advisory lists versions below 11.0.1 as affected.
- **Impact:** A specially crafted glob pattern can cause excessive CPU and memory use while the affected library processes the pattern. The impact is denial of service (availability), not data disclosure or modification.
- **Why temporarily deferred:** The current Next.js 16 / ESLint / TypeScript-ESLint dependency ranges request `minimatch` 3.x or 10.x. The patched 11.x release is outside those declared ranges, and the available automatic audit suggestions include incompatible major downgrades. The production-only audit previously reported no affected dependencies. The current API does not accept glob patterns.
- **Decision and safeguards:** Do not run `npm audit fix --force` or force a `minimatch` 11.x override without a compatibility review. Do not pass untrusted, user-supplied glob patterns to lint/build tooling.
- **Required revisit before production:** Recheck the advisory and upstream releases; choose a compatible fix for the Next.js 16 toolchain; then verify with `npm audit`, `npm audit --omit=dev`, `npm run lint`, and `npm run build`. Record the resolution or explicitly reassess the risk before deployment.

## TD-002 — pg_cron cannot connect as the restricted NOLOGIN runner

- **Status:** No recurring cleanup job is scheduled; an architecture/configuration decision is required before scheduling.
- **Target evidence:** `pg_cron` 1.6.4 is installed. The exact named scheduler overload is `cron.schedule(text, text, text)`. `cron.database_name` is `postgres`, `cron.launch_active_jobs` is `on`, `cron.use_background_workers` is `off`, and the `cron.timezone` is `GMT` (the five-minute expression is timezone-independent).
- **Behavior verified:** A temporary job stored as `clinicsync_cron_runner` was recorded with that username but both scheduled attempts returned `connection failed`; the expired request remained unchanged. A temporary `postgres` `SELECT 1` probe succeeded. Both temporary jobs were unscheduled. No recurring ClinicSync job exists. The small `cron.job_run_details` audit records remain and contain no patient data.
- **Security posture:** `clinicsync_cron_runner` remains `NOLOGIN` and has only `EXECUTE` on `private.expire_pending_appointments()`—no appointment table privileges. Do not change it to a login role or run the periodic job as `postgres` without an explicit decision.
- **Possible path:** Evaluate enabling pg_cron background workers for this project, including worker capacity and the controlled restart required by the `postmaster` setting; then retest a synthetic expiry as the NOLOGIN runner. This change was not attempted. Alternative job identities require explicit approval.

## TD-003 — Distributed booking rate limiting is not provisioned

- **Status:** The API currently has a small in-memory per-instance IP/phone throttle, suitable only as defense-in-depth during development.
- **Limitation:** Vercel serverless instances do not share this map; it is not a global or durable abuse-control system.
- **Required before public production traffic:** Configure Vercel WAF or a shared rate-limit store such as managed Redis/Upstash, store its credentials privately, and test limits across multiple instances.

## TD-004 — Local database connection and hosted API integration are pending

- **Status:** The user confirmed the `booking_api` password was set privately in Supabase, and supplied the Session Pooler host/port. No `.env.local` exists in the Arena workspace, the CA has not been configured here, and no successful connection or DB-backed API request has been verified.
- **Required next:** Set `CLINICSYNC_POOLER_HOST`, `CLINICSYNC_DB_PASSWORD`, and `CLINICSYNC_DB_SSL_CA` privately in a local `.env.local`. Then run a read-only connection check and synthetic HTTP booking/conflict test. Never paste the password or CA into chat or Git.

## TD-005 — Supabase Dashboard security-advisor review is pending

- **Status:** The available Supabase connector supports SQL/catalog audits but does not expose the Security Advisor operation. Catalog, grants, RLS, function ACLs, role attributes, and synthetic runtime boundaries were reviewed directly; the Dashboard advisors were not run.
- **Required next:** Run Database Security Advisor for `clinicsync-dev` after the final DB configuration, inspect every finding, and record resolved/accepted items before production.
