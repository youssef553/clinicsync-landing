# ClinicSync admin dashboard

## What is implemented

The app adds an email/password staff sign-in page with no public sign-up UI, sign-out, a verified-membership clinic chooser, and protected clinic workspaces at `/admin/[clinicSlug]`. Every workspace request verifies Supabase JWT claims server-side and loads active clinic memberships from the authenticated Supabase Data API client. A clinic slug is only a selector: the server must match it to the verified user's active membership, and the database RLS policies independently enforce the same `clinic_id` boundary.

Supported clinic workflows:

- Overview totals for today, pending, confirmed, cancelled, and active doctors; today's schedule and later upcoming appointments are separated and computed using the clinic-local day.
- Appointment search/filter by date and status; search by patient name/phone, doctor, or appointment ID. Patient search terms are submitted in POST bodies, not placed in URLs; appointment list responses omit phone values.
- Supported status changes only: requested → confirmed/cancelled and confirmed → cancelled/completed. Server-side validation, status compare-and-set, existing database transition trigger, and RLS all apply.
- Doctor list/detail with local name/specialty search and admin-only create/edit/activate/deactivate.
- Weekly availability list and admin-only add/edit/pause/remove through database RPCs. Transaction-scoped advisory locks serialize booking with schedule edits; active-window overlap constraints remain enforced by PostgreSQL. Edits that would affect a future requested/confirmed appointment are rejected without cancelling it; staff must resolve that appointment explicitly.
- Patient search and appointment history. Both staff and admins may search by name/phone and see a masked number through clinic-scoped RPCs; direct PostgREST reads of `patients.phone_e164` are revoked. Clinical notes/history are not part of the inspected schema.

Appointment creation, rescheduling, and reassignment are deliberately not implemented. The current staff permission model allows status-only appointment updates and has no authenticated staff insert or schedule-edit path. The public `/api/appointments` flow is not used by the dashboard. A staff-facing booking capability requires a separately approved database/API design.

## Tenant migration — not applied

The existing schema had no clinic identifier, so its previous staff RLS model could not isolate multiple clinics in one project. The new local migration is `supabase/migrations/20261103100000_add_clinic_tenancy.sql`. It introduces:

- `clinics` with an identifier, public slug, and `Africa/Cairo` timezone (the only supported timezone in this release).
- A composite `(user_id, clinic_id)` staff membership key so one account can belong to multiple clinics.
- `clinic_id` on staff, doctors, patients, availability, and appointments, including same-clinic composite foreign keys and clinic-aware overlap constraints.
- A `private.current_staff_role(clinic_id)` helper and replacement clinic-scoped RLS/grants, including an operator-only first-admin bootstrap and a per-clinic serialized membership RPC that rejects removal of the last active admin.
- Slug-scoped public doctor/availability lookup functions. Anonymous clients cannot scan all clinic rows or the doctor/schedule tables directly.
- A replacement of the existing public booking function that derives the clinic from the active doctor and writes patient and appointment rows into that same clinic. The public `POST /api/appointments` path and payload are retained; the dashboard never calls its privileged `booking_api` database connection.
- Schedule-edit RPCs coordinated with booking by transaction advisory locks, plus an explicit future-appointment conflict check. Patient phone search/detail is exposed only as a masked value from clinic-scoped RPCs; authenticated table grants omit `phone_e164`.
- The expiry function remains execute-only for `clinicsync_cron_runner`; this migration does not create a recurring job.

The migration does **not** create a clinic, user, or first admin. It deliberately aborts if any legacy staff, doctor, patient, availability, or appointment rows exist, rather than assigning them to a guessed tenant. A trusted operator must prepare and review an explicit row-to-clinic mapping for any non-empty environment before using a migration adapted for that data.

The migration was **not applied** to Supabase. No patient/appointment rows were queried, inserted, or changed. The database policies, function behavior, and public booking path have not been live-tested against the new tenant schema.

## Setup and access provisioning

1. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the deployment environment. Do not use a service-role or secret key for dashboard access. `.env.local` was not created or read.
2. Review and apply the tenant migration only after establishing the required legacy-data mapping. Do not apply the migration to a populated project as written; it fails closed.
3. Through a trusted, separately controlled operator procedure, create each clinic and its first active admin membership; the initial admin cannot be created through the admin RPC because no admin exists yet. No provisioning workflow is built here. After bootstrap, route membership changes through `set_clinic_member`; do not permit self-service role changes.
4. Use existing confirmed email/password staff accounts. Project auth settings were not changed; email autoconfirm is disabled and the app has no sign-up screen.
5. Verify staff membership, cross-clinic RLS denial, status transitions, doctor/availability writes, patient search, and public booking in a disposable test environment before a pilot.

## Checks and readiness

Unit tests cover input validation, status transitions, active/mismatched membership parsing, phone masking, safe navigation, booking validation, and Cairo day boundaries including the skipped-midnight daylight-saving transition. Static migration-contract tests also inspect booking/schedule lock ordering, future-appointment guards, last-admin serialization, phone-column grants/RPCs, and the expiry-runner design; they do not execute PostgreSQL or prove RLS/concurrency behavior. TypeScript, lint, tests, and a production build are code-level checks only. They do not demonstrate live Supabase sign-in, tenant RLS, PostgREST relationship names, or migration correctness on a real database.

The current workspace is **not ready for an internal demo or pilot against Supabase** until the tenant migration is reviewed/applied, a clinic and trusted staff membership are provisioned, public environment values are configured, and live RLS/booking integration tests pass. It is not production-ready. No live deployment settings or database state were changed.
