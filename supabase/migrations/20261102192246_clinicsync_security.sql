-- ClinicSync least-privilege roles, grants, authorization helper, and RLS policies.
-- No first staff/admin member is provisioned by this migration.

CREATE ROLE clinicsync_fn_owner
  NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
CREATE ROLE clinicsync_cron_runner
  NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
CREATE ROLE booking_api
  LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;

COMMENT ON ROLE clinicsync_fn_owner IS
  'Restricted owner for ClinicSync SECURITY DEFINER functions; no login, no table ownership, no BYPASSRLS.';
COMMENT ON ROLE clinicsync_cron_runner IS
  'Restricted pg_cron job identity; receives function EXECUTE only, never direct appointment table rights.';
COMMENT ON ROLE booking_api IS
  'Server-only Vercel Node.js connection identity; password intentionally not set in migration; no direct table rights.';

GRANT CONNECT ON DATABASE postgres TO booking_api;

GRANT USAGE ON SCHEMA public TO anon, authenticated, clinicsync_fn_owner;
GRANT USAGE, CREATE ON SCHEMA private TO clinicsync_fn_owner;
GRANT USAGE ON SCHEMA private TO authenticated, booking_api, clinicsync_cron_runner;
GRANT USAGE ON SCHEMA auth TO authenticated, clinicsync_fn_owner;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, clinicsync_fn_owner;

-- Keep newly created private routines and tables closed by default as well.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA private
  REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC, anon, authenticated, service_role, booking_api, clinicsync_cron_runner;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA private
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role, booking_api, clinicsync_cron_runner;

-- Remove all broad/default grants from the five application tables before
-- granting only the permissions listed below.
REVOKE ALL PRIVILEGES ON TABLE
  public.doctors,
  public.patients,
  public.availability,
  public.appointments,
  public.staff_members
FROM PUBLIC, anon, authenticated, service_role, booking_api, clinicsync_fn_owner, clinicsync_cron_runner;

-- Caller-scoped role lookup. The function owner has SELECT only on the three
-- membership columns and is allowed to read staff_members through an RLS policy
-- scoped to this NOLOGIN, non-BYPASSRLS role. The function returns only the
-- active role for auth.uid(); it does not trust user-editable JWT metadata.
CREATE OR REPLACE FUNCTION private.current_staff_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT sm.role
  FROM public.staff_members AS sm
  WHERE sm.user_id = auth.uid()
    AND sm.is_active
  LIMIT 1
$function$;
REVOKE ALL PRIVILEGES ON FUNCTION private.current_staff_role() FROM PUBLIC, anon, authenticated, service_role, booking_api, clinicsync_cron_runner;
GRANT EXECUTE ON FUNCTION private.current_staff_role() TO authenticated;
COMMENT ON FUNCTION private.current_staff_role() IS
  'SECURITY DEFINER: authenticated callers only; owner clinicsync_fn_owner; reads user_id/role/is_active under staff_members_fn_owner_read RLS; returns only the active role for auth.uid().';
-- The Supabase migration session runs as postgres but is not a member of this
-- freshly-created NOLOGIN role. Grant temporary membership only for ownership
-- transfer, then remove it before the migration ends.
GRANT clinicsync_fn_owner TO postgres;
ALTER FUNCTION private.current_staff_role() OWNER TO clinicsync_fn_owner;
REVOKE clinicsync_fn_owner FROM postgres;

-- RLS policies for public doctors and recurring availability.
CREATE POLICY doctors_public_active_read
  ON public.doctors FOR SELECT TO anon, authenticated
  USING (is_active);
CREATE POLICY doctors_admin_manage
  ON public.doctors FOR ALL TO authenticated
  USING ((SELECT private.current_staff_role()) = 'admin')
  WITH CHECK ((SELECT private.current_staff_role()) = 'admin');

CREATE POLICY availability_public_active_read
  ON public.availability FOR SELECT TO anon, authenticated
  USING (
    is_active
    AND EXISTS (
      SELECT 1
      FROM public.doctors AS d
      WHERE d.id = availability.doctor_id
        AND d.is_active
    )
  );
CREATE POLICY availability_admin_manage
  ON public.availability FOR ALL TO authenticated
  USING ((SELECT private.current_staff_role()) = 'admin')
  WITH CHECK ((SELECT private.current_staff_role()) = 'admin');

-- Staff/admin can read patient and appointment data for clinic operations.
CREATE POLICY patients_staff_read
  ON public.patients FOR SELECT TO authenticated
  USING ((SELECT private.current_staff_role()) IN ('staff', 'admin'));
CREATE POLICY appointments_staff_read
  ON public.appointments FOR SELECT TO authenticated
  USING ((SELECT private.current_staff_role()) IN ('staff', 'admin'));
CREATE POLICY appointments_staff_status_update
  ON public.appointments FOR UPDATE TO authenticated
  USING ((SELECT private.current_staff_role()) IN ('staff', 'admin'))
  WITH CHECK ((SELECT private.current_staff_role()) IN ('staff', 'admin'));

-- A caller can read only their own membership unless they are already an admin.
-- Admins can add/update other members but cannot update their own role/status.
-- No policy or grant permits a public user to self-promote.
CREATE POLICY staff_members_read_self_or_admin
  ON public.staff_members FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT private.current_staff_role()) = 'admin'
  );
CREATE POLICY staff_members_admin_insert
  ON public.staff_members FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.current_staff_role()) = 'admin');
CREATE POLICY staff_members_admin_update_others
  ON public.staff_members FOR UPDATE TO authenticated
  USING (
    (SELECT private.current_staff_role()) = 'admin'
    AND user_id <> (SELECT auth.uid())
  )
  WITH CHECK (
    (SELECT private.current_staff_role()) = 'admin'
    AND user_id <> (SELECT auth.uid())
  );

-- RLS policies for the restricted SECURITY DEFINER function owner. This role is
-- neither a table owner nor BYPASSRLS, so each function operation remains subject
-- to these narrow policies even when called with elevated function privileges.
CREATE POLICY doctors_fn_owner_read_active
  ON public.doctors FOR SELECT TO clinicsync_fn_owner
  USING (is_active);
CREATE POLICY availability_fn_owner_read_active
  ON public.availability FOR SELECT TO clinicsync_fn_owner
  USING (is_active);
CREATE POLICY patients_fn_owner_insert
  ON public.patients FOR INSERT TO clinicsync_fn_owner
  WITH CHECK (true);
CREATE POLICY appointments_fn_owner_insert_web_request
  ON public.appointments FOR INSERT TO clinicsync_fn_owner
  WITH CHECK (
    status = 'requested'
    AND booking_channel = 'web'
    AND expires_at IS NOT NULL
    AND expires_at > pg_catalog.clock_timestamp()
  );
CREATE POLICY appointments_fn_owner_read_expired_requests
  ON public.appointments FOR SELECT TO clinicsync_fn_owner
  USING (
    status = 'requested'
    AND expires_at IS NOT NULL
    AND expires_at <= pg_catalog.clock_timestamp()
  );
CREATE POLICY appointments_fn_owner_cancel_expired_requests
  ON public.appointments FOR UPDATE TO clinicsync_fn_owner
  USING (
    status = 'requested'
    AND expires_at IS NOT NULL
    AND expires_at <= pg_catalog.clock_timestamp()
  )
  WITH CHECK (status = 'cancelled');
CREATE POLICY staff_members_fn_owner_read
  ON public.staff_members FOR SELECT TO clinicsync_fn_owner
  USING (true);

-- Public read access is limited by RLS to active doctors and availability.
GRANT SELECT ON TABLE public.doctors, public.availability TO anon, authenticated;

-- Admins can manage doctor and availability fields, but cannot overwrite IDs or timestamps.
GRANT INSERT (name, specialty, is_active), UPDATE (name, specialty, is_active), DELETE
  ON TABLE public.doctors TO authenticated;
GRANT INSERT (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active),
      UPDATE (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active),
      DELETE
  ON TABLE public.availability TO authenticated;

-- Authenticated users receive no direct patient/appointment writes except a
-- column-limited status update; the status trigger added in the next migration
-- will enforce the transition graph.
GRANT SELECT ON TABLE public.patients, public.appointments TO authenticated;
GRANT UPDATE (status) ON TABLE public.appointments TO authenticated;
GRANT SELECT ON TABLE public.staff_members TO authenticated;
GRANT INSERT (user_id, role, is_active) ON TABLE public.staff_members TO authenticated;
GRANT UPDATE (role, is_active) ON TABLE public.staff_members TO authenticated;

-- The function owner can inspect only the required doctor/schedule columns,
-- create a patient+web request, and see/cancel expired requested rows only.
GRANT SELECT (id, is_active) ON TABLE public.doctors TO clinicsync_fn_owner;
GRANT SELECT (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
  ON TABLE public.availability TO clinicsync_fn_owner;
GRANT INSERT (id, full_name, phone_e164) ON TABLE public.patients TO clinicsync_fn_owner;
GRANT SELECT (id, doctor_id, starts_at, ends_at, status, expires_at)
  ON TABLE public.appointments TO clinicsync_fn_owner;
GRANT INSERT (id, patient_id, doctor_id, starts_at, ends_at, status, booking_channel, expires_at)
  ON TABLE public.appointments TO clinicsync_fn_owner;
GRANT UPDATE (status) ON TABLE public.appointments TO clinicsync_fn_owner;
GRANT SELECT (user_id, role, is_active) ON TABLE public.staff_members TO clinicsync_fn_owner;
