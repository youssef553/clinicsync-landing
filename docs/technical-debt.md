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

## TD-002 — Expiry scheduler execution is not yet reliable

- **Status:** No recurring ClinicSync job exists. The restricted runner and an idempotent schedule design are documented, but no job was created by this task.
- **Historical target evidence:** `pg_cron` 1.6.4 was installed. The exact named scheduler overload was `cron.schedule(text, text, text)`. `cron.database_name` was `postgres`, `cron.launch_active_jobs` was `on`, `cron.use_background_workers` was `off`, and `cron.timezone` was `GMT` (the five-minute expression is timezone-independent).
- **Historical behavior verified:** A temporary job stored as `clinicsync_cron_runner` was recorded with that username, but both scheduled attempts returned `connection failed`; the expired request remained unchanged. A temporary `postgres` `SELECT 1` probe succeeded. Both temporary jobs were unscheduled. The small `cron.job_run_details` audit records remain and contain no patient data. This is prior read-only/preflight context; it was not repeated for this implementation.
- **Security posture:** `clinicsync_cron_runner` remains `NOLOGIN` and has only `EXECUTE` on `private.expire_pending_appointments()`—no appointment table privileges. Do not change it to a login role or run the periodic job as `postgres` or `service_role` without a separate explicit decision.
- **Scheduling design:** After verifying the platform can execute as the existing NOLOGIN runner, have an operator schedule `SELECT private.expire_pending_appointments();` every five minutes in GMT, with the job's recorded execution identity set to `clinicsync_cron_runner` (never `postgres` or `service_role`). The function is idempotent: it only changes still-`requested` rows whose `expires_at` is due, uses `FOR UPDATE SKIP LOCKED`, and caps each run at 500 rows. Repeated runs safely drain a backlog; the function returns only a count. Before enabling the recurring job, test one synthetic expired request as the runner, verify the status transition and a successful `cron.job_run_details` entry, then remove the synthetic row. Alert on failed runs and a persistent count of overdue requested rows; monitoring must not select or log patient values.
- **Next action:** Evaluate pg_cron background-worker capacity and the controlled restart required by the `postmaster` setting, then verify execution under `clinicsync_cron_runner`. If the platform cannot honor that identity, stop and request an approved least-privilege alternative. Do not create a job until that test passes.

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

## TD-006 — Booking and availability edits need one serialized database boundary

- **Status:** Implemented locally in the still-unapplied tenant migration; database behavior is not yet concurrency-tested.
- **Design:** `private.book_public_appointment` takes a transaction-scoped shared advisory lock keyed by clinic, doctor, and Cairo-local weekday **before** reading availability. Availability create/update/delete go through restricted security-definer RPCs and take the matching exclusive schedule lock. Update/delete first take a separate row-scoped advisory lock; updates take the old/new schedule locks in ascending hash-key order. No table tuple lock is taken before the schedule lock, avoiding a lock cycle with inserts that must check the active-window exclusion constraint. Authenticated direct availability DML is revoked.
- **Doctor eligibility:** Doctor creation and profile/activity updates go through restricted RPCs; direct authenticated doctor INSERT/UPDATE are revoked (the existing admin-only DELETE remains subject to same-clinic foreign-key restrictions). The RPC serializes the clinic-admin authorization check, then takes all seven weekday schedule locks in ascending hash-key order before writing. Booking rechecks the doctor and clinic active flags after acquiring its shared weekday lock. Deactivation prevents new public bookings but deliberately leaves future `requested` and `confirmed` appointments unchanged; admins must explicitly cancel, resolve, or otherwise manage them.
- **Existing appointments:** If an availability edit or deletion would change a window used by any future `requested` or `confirmed` appointment, the transaction returns a conflict and leaves the schedule and appointments untouched. The admin must explicitly cancel or otherwise resolve the affected appointment using the normal appointment-status action, then retry. The migration retains the GiST appointment-overlap exclusion constraint; no booking is silently cancelled or rescheduled.
- **Verification still needed:** Run two-session booking-vs-availability-edit, doctor-deactivation-vs-booking, and edit-vs-edit concurrency tests, including rollback/error cases, against a verified disposable PostgreSQL/Supabase database. The current workspace has no disposable database, so static contract tests cannot establish lock or RLS behavior.

## TD-007 — Last-active-admin invariant and bootstrap procedure

- **Status:** Implemented locally in the still-unapplied tenant migration; no clinic was provisioned.
- **Invariant:** `public.set_clinic_member` is the only app-role membership write boundary. It checks the verified caller is an active clinic admin, obtains a transaction-scoped advisory lock for that clinic, rechecks authorization after waiting, and serializes the target update with the active-admin count. Demoting or deactivating the last active admin raises a constraint-style error. Direct `authenticated` membership insert/update grants are absent; function-owner RLS policies scope writes to other members in the caller's clinic. The per-clinic key permits unrelated clinics to change memberships concurrently.
- **Initial administrator:** Creation of the first active admin is operator-only because there is no existing admin who could authorize an RPC. During a separately approved clinic bootstrap, an operator must verify the clinic and Auth user IDs, insert exactly one active `admin` membership through a controlled database-owner procedure, and verify the row before enabling staff access. This task does not build a provisioning workflow; all later membership changes must use `set_clinic_member`.
- **Auth-user deletion:** The tenant migration changes `staff_members.user_id → auth.users.id` from `ON DELETE CASCADE` to `ON DELETE RESTRICT`. Any membership row, including inactive memberships, blocks Auth-user deletion; a privileged Auth/API delete cannot cascade around the database constraint. There is currently no app membership-delete/offboarding RPC, so linked accounts cannot be deleted until a separately designed offboarding flow removes memberships under the per-clinic lock and last-admin check. Do not manually delete membership rows or bypass the constraint; a database owner can still deliberately override database protections.
- **Verification still needed:** Concurrently demote two different admins in a disposable database and prove at least one active admin remains; also test cross-clinic isolation, unauthorized/self-target attempts, and that privileged Auth-user deletion is blocked while any membership exists. Static/source checks do not validate Auth-trigger/database behavior.

## TD-008 — Patient phone access is restricted to masked, clinic-scoped RPCs

- **Status:** Implemented locally in the still-unapplied tenant migration and dashboard data layer; database grants/RLS remain unverified at runtime.
- **Access decision:** Both `staff` and `admin` may search patients and view a masked number. Neither role may read `patients.phone_e164` through direct PostgREST table access. The authenticated table grant includes only `id`, `clinic_id`, `full_name`, and `created_at`; the security-definer `search_clinic_patients` and `get_clinic_patient` RPCs verify clinic membership and return only `masked_phone`. Search is clinic-scoped, escaped, bounded, and returns at most 100 rows. The restricted function owner is the only dashboard-side role with phone-column `SELECT`.
- **Application boundary:** Patient search/detail and appointment-detail DTOs use only the RPC's masked value. Appointment list/detail joins no longer select the raw phone. Server errors remain generic and no application code logs patient values.
- **Verification still needed:** In a disposable database, prove direct `authenticated` selection of `phone_e164` is denied, both allowed roles can search only their own clinic, and unauthorized roles cannot invoke the RPC successfully. Static/source tests do not prove these RLS and privilege outcomes.

## Local verification — 2026-11-04

- **Passed:** `npm test` (41 tests), `npm run lint`, `npx next typegen`, `npx tsc --noEmit`, and `npm run build`.
- **Not established:** These are code/static checks only. No PostgreSQL concurrency, RLS, privilege, or migration-application test ran because there is no verified disposable database in this workspace. No Supabase project was contacted, no SQL was executed, no migration was applied, and no expiry job was created.
