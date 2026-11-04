-- ClinicSync multi-clinic tenancy.
--
-- This migration intentionally refuses to guess a clinic assignment for legacy
-- rows. If any old rows exist, stop and prepare an explicit reviewed mapping
-- migration before applying this one. The historical development preflight
-- observed zero legacy rows; no patient values were retrieved or changed.

BEGIN;

DO $tenant_data_guard$
BEGIN
  IF EXISTS (SELECT 1 FROM public.staff_members LIMIT 1)
     OR EXISTS (SELECT 1 FROM public.doctors LIMIT 1)
     OR EXISTS (SELECT 1 FROM public.patients LIMIT 1)
     OR EXISTS (SELECT 1 FROM public.availability LIMIT 1)
     OR EXISTS (SELECT 1 FROM public.appointments LIMIT 1) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'ClinicSync tenant migration requires an explicit clinic mapping for existing rows; no rows were reassigned.';
  END IF;
END;
$tenant_data_guard$;

CREATE TABLE public.clinics (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  time_zone text NOT NULL DEFAULT 'Africa/Cairo',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamp with time zone NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT clinics_name_nonempty CHECK (
    pg_catalog.char_length(pg_catalog.btrim(name)) BETWEEN 1 AND 120
  ),
  CONSTRAINT clinics_slug_format CHECK (
    slug ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'
  ),
  -- All current booking validation and schedule rules use Cairo local time.
  -- Expand this check only together with end-to-end timezone-aware booking tests.
  CONSTRAINT clinics_time_zone_currently_supported CHECK (time_zone = 'Africa/Cairo')
);

ALTER TABLE public.staff_members
  ADD COLUMN clinic_id uuid NOT NULL;
ALTER TABLE public.staff_members
  DROP CONSTRAINT staff_members_pkey;
ALTER TABLE public.staff_members
  ADD CONSTRAINT staff_members_pkey PRIMARY KEY (user_id, clinic_id);
-- A privileged Auth delete still executes the database foreign key action, so
-- do not let it cascade around set_clinic_member's serialized last-admin check.
-- Any membership row (active or not) blocks user deletion until a separately
-- controlled offboarding flow removes it under the clinic membership lock.
ALTER TABLE public.staff_members
  DROP CONSTRAINT staff_members_user_id_fkey;
ALTER TABLE public.staff_members
  ADD CONSTRAINT staff_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public.staff_members
  ADD CONSTRAINT staff_members_clinic_id_fkey
    FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE public.doctors
  ADD COLUMN clinic_id uuid NOT NULL;
ALTER TABLE public.doctors
  ADD CONSTRAINT doctors_clinic_id_fkey
    FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public.doctors
  ADD CONSTRAINT doctors_clinic_id_id_key UNIQUE (clinic_id, id);

ALTER TABLE public.patients
  ADD COLUMN clinic_id uuid NOT NULL;
ALTER TABLE public.patients
  ADD CONSTRAINT patients_clinic_id_fkey
    FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public.patients
  ADD CONSTRAINT patients_clinic_id_id_key UNIQUE (clinic_id, id);

ALTER TABLE public.availability
  DROP CONSTRAINT availability_doctor_id_fkey;
ALTER TABLE public.availability
  ADD COLUMN clinic_id uuid NOT NULL;
ALTER TABLE public.availability
  ADD CONSTRAINT availability_clinic_id_fkey
    FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public.availability
  ADD CONSTRAINT availability_clinic_doctor_fkey
    FOREIGN KEY (clinic_id, doctor_id) REFERENCES public.doctors(clinic_id, id)
    ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public.availability
  DROP CONSTRAINT availability_no_overlapping_active_windows;
ALTER TABLE public.availability
  ADD CONSTRAINT availability_no_overlapping_active_windows
    EXCLUDE USING gist (
      clinic_id extensions.gist_uuid_ops WITH =,
      doctor_id extensions.gist_uuid_ops WITH =,
      day_of_week extensions.gist_int2_ops WITH =,
      (pg_catalog.tsrange(
        DATE '2000-01-03' + start_time,
        DATE '2000-01-03' + end_time,
        '[)'
      )) WITH &&
    ) WHERE (is_active);

ALTER TABLE public.appointments
  DROP CONSTRAINT appointments_patient_id_fkey;
ALTER TABLE public.appointments
  DROP CONSTRAINT appointments_doctor_id_fkey;
ALTER TABLE public.appointments
  ADD COLUMN clinic_id uuid NOT NULL;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_clinic_id_fkey
    FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_clinic_patient_fkey
    FOREIGN KEY (clinic_id, patient_id) REFERENCES public.patients(clinic_id, id)
    ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_clinic_doctor_fkey
    FOREIGN KEY (clinic_id, doctor_id) REFERENCES public.doctors(clinic_id, id)
    ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public.appointments
  DROP CONSTRAINT appointments_no_overlapping_active_times;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_overlapping_active_times
    EXCLUDE USING gist (
      clinic_id extensions.gist_uuid_ops WITH =,
      doctor_id extensions.gist_uuid_ops WITH =,
      (pg_catalog.tstzrange(starts_at, ends_at, '[)')) WITH &&
    ) WHERE (status IN ('requested', 'confirmed'));

DROP INDEX public.availability_doctor_day_active_idx;
DROP INDEX public.appointments_patient_created_idx;
DROP INDEX public.appointments_doctor_starts_active_idx;
DROP INDEX public.appointments_requested_expiry_idx;
CREATE INDEX availability_clinic_doctor_day_active_idx
  ON public.availability (clinic_id, doctor_id, day_of_week)
  WHERE is_active;
CREATE INDEX doctors_clinic_name_idx
  ON public.doctors (clinic_id, name);
CREATE INDEX patients_clinic_name_idx
  ON public.patients (clinic_id, full_name);
CREATE INDEX appointments_clinic_patient_created_idx
  ON public.appointments (clinic_id, patient_id, created_at DESC);
CREATE INDEX appointments_clinic_doctor_starts_active_idx
  ON public.appointments (clinic_id, doctor_id, starts_at)
  WHERE status IN ('requested', 'confirmed');
CREATE INDEX appointments_clinic_expiry_idx
  ON public.appointments (expires_at, clinic_id, doctor_id)
  WHERE status = 'requested';
CREATE INDEX staff_members_clinic_user_active_idx
  ON public.staff_members (clinic_id, user_id)
  WHERE is_active;

CREATE TRIGGER clinics_set_updated_at
  BEFORE UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics FORCE ROW LEVEL SECURITY;

-- Replace global authorization policies with clinic-scoped policies.
DROP POLICY doctors_public_active_read ON public.doctors;
DROP POLICY doctors_admin_manage ON public.doctors;
DROP POLICY availability_public_active_read ON public.availability;
DROP POLICY availability_admin_manage ON public.availability;
DROP POLICY patients_staff_read ON public.patients;
DROP POLICY appointments_staff_read ON public.appointments;
DROP POLICY appointments_staff_status_update ON public.appointments;
DROP POLICY staff_members_read_self_or_admin ON public.staff_members;
DROP POLICY staff_members_admin_insert ON public.staff_members;
DROP POLICY staff_members_admin_update_others ON public.staff_members;
DROP POLICY doctors_fn_owner_read_active ON public.doctors;
DROP POLICY availability_fn_owner_read_active ON public.availability;
DROP POLICY patients_fn_owner_insert ON public.patients;
DROP POLICY appointments_fn_owner_insert_web_request ON public.appointments;
DROP POLICY appointments_fn_owner_read_expired_requests ON public.appointments;
DROP POLICY appointments_fn_owner_cancel_expired_requests ON public.appointments;
DROP POLICY appointments_fn_owner_read_expired_cancellations ON public.appointments;
DROP POLICY staff_members_fn_owner_read ON public.staff_members;

-- Temporarily become a member of the restricted function-owner role so the
-- migration can replace its old, non-tenant-aware helper safely.
GRANT clinicsync_fn_owner TO postgres;
DROP FUNCTION private.current_staff_role();

CREATE FUNCTION private.current_staff_role(p_clinic_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT sm.role
  FROM public.staff_members AS sm
  JOIN public.clinics AS c ON c.id = sm.clinic_id
  WHERE sm.user_id = (SELECT auth.uid())
    AND sm.clinic_id = p_clinic_id
    AND sm.is_active
    AND c.is_active
  LIMIT 1
$function$;
REVOKE ALL PRIVILEGES ON FUNCTION private.current_staff_role(uuid)
  FROM PUBLIC, anon, authenticated, service_role, booking_api, clinicsync_cron_runner;
GRANT EXECUTE ON FUNCTION private.current_staff_role(uuid) TO authenticated;
COMMENT ON FUNCTION private.current_staff_role(uuid) IS
  'SECURITY DEFINER: authenticated callers and trusted definer RPCs; owner clinicsync_fn_owner; reads active staff membership for auth.uid() and the supplied clinic_id under the non-login function-owner RLS policy; never trusts user-editable JWT metadata.';

CREATE POLICY clinics_member_read
  ON public.clinics FOR SELECT TO authenticated
  USING (
    is_active
    AND (SELECT private.current_staff_role(id)) IN ('staff', 'admin')
  );
CREATE POLICY clinics_fn_owner_read_active
  ON public.clinics FOR SELECT TO clinicsync_fn_owner
  USING (is_active);

CREATE POLICY doctors_member_read
  ON public.doctors FOR SELECT TO authenticated
  USING (
    (SELECT private.current_staff_role(clinic_id)) = 'admin'
    OR (
      is_active
      AND (SELECT private.current_staff_role(clinic_id)) = 'staff'
    )
  );
CREATE POLICY doctors_admin_delete
  ON public.doctors FOR DELETE TO authenticated
  USING ((SELECT private.current_staff_role(clinic_id)) = 'admin');
CREATE POLICY availability_member_read
  ON public.availability FOR SELECT TO authenticated
  USING (
    (SELECT private.current_staff_role(clinic_id)) = 'admin'
    OR (
      is_active
      AND (SELECT private.current_staff_role(clinic_id)) = 'staff'
      AND EXISTS (
        SELECT 1
        FROM public.doctors AS d
        WHERE d.id = availability.doctor_id
          AND d.clinic_id = availability.clinic_id
          AND d.is_active
      )
    )
  );
CREATE POLICY patients_staff_read
  ON public.patients FOR SELECT TO authenticated
  USING ((SELECT private.current_staff_role(clinic_id)) IN ('staff', 'admin'));
CREATE POLICY appointments_staff_read
  ON public.appointments FOR SELECT TO authenticated
  USING ((SELECT private.current_staff_role(clinic_id)) IN ('staff', 'admin'));
CREATE POLICY appointments_staff_status_update
  ON public.appointments FOR UPDATE TO authenticated
  USING ((SELECT private.current_staff_role(clinic_id)) IN ('staff', 'admin'))
  WITH CHECK ((SELECT private.current_staff_role(clinic_id)) IN ('staff', 'admin'));

CREATE POLICY staff_members_read_self_or_admin
  ON public.staff_members FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT private.current_staff_role(clinic_id)) = 'admin'
  );
-- Authenticated clients cannot write memberships directly. All app-level
-- membership mutations go through set_clinic_member(), which serializes by clinic.
CREATE POLICY staff_members_fn_owner_insert
  ON public.staff_members FOR INSERT TO clinicsync_fn_owner
  WITH CHECK (
    (SELECT private.current_staff_role(clinic_id)) = 'admin'
    AND user_id <> (SELECT auth.uid())
  );
CREATE POLICY staff_members_fn_owner_update_others
  ON public.staff_members FOR UPDATE TO clinicsync_fn_owner
  USING (
    (SELECT private.current_staff_role(clinic_id)) = 'admin'
    AND user_id <> (SELECT auth.uid())
  )
  WITH CHECK (
    (SELECT private.current_staff_role(clinic_id)) = 'admin'
    AND user_id <> (SELECT auth.uid())
  );

-- The restricted function owner remains subject to RLS and can only service
-- public booking/catalog, admin doctor/availability/membership RPCs, masked
-- patient RPCs, and the existing expiry job.
CREATE POLICY doctors_fn_owner_read_active
  ON public.doctors FOR SELECT TO clinicsync_fn_owner
  USING (
    is_active
    AND EXISTS (
      SELECT 1 FROM public.clinics AS c
      WHERE c.id = doctors.clinic_id AND c.is_active
    )
  );
CREATE POLICY doctors_fn_owner_admin_manage
  ON public.doctors FOR ALL TO clinicsync_fn_owner
  USING ((SELECT private.current_staff_role(clinic_id)) = 'admin')
  WITH CHECK ((SELECT private.current_staff_role(clinic_id)) = 'admin');
CREATE POLICY availability_fn_owner_read_active
  ON public.availability FOR SELECT TO clinicsync_fn_owner
  USING (
    is_active
    AND EXISTS (
      SELECT 1 FROM public.doctors AS d
      JOIN public.clinics AS c ON c.id = d.clinic_id
      WHERE d.id = availability.doctor_id
        AND d.clinic_id = availability.clinic_id
        AND d.is_active
        AND c.is_active
    )
  );
CREATE POLICY availability_fn_owner_admin_manage
  ON public.availability FOR ALL TO clinicsync_fn_owner
  USING ((SELECT private.current_staff_role(clinic_id)) = 'admin')
  WITH CHECK ((SELECT private.current_staff_role(clinic_id)) = 'admin');
CREATE POLICY patients_fn_owner_read_member
  ON public.patients FOR SELECT TO clinicsync_fn_owner
  USING ((SELECT private.current_staff_role(clinic_id)) IN ('admin', 'staff'));
CREATE POLICY patients_fn_owner_insert
  ON public.patients FOR INSERT TO clinicsync_fn_owner
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinics AS c
      WHERE c.id = patients.clinic_id AND c.is_active
    )
  );
CREATE POLICY appointments_fn_owner_read_schedule_conflicts
  ON public.appointments FOR SELECT TO clinicsync_fn_owner
  USING (
    status IN ('requested', 'confirmed')
    AND (SELECT private.current_staff_role(clinic_id)) = 'admin'
  );
CREATE POLICY appointments_fn_owner_insert_web_request
  ON public.appointments FOR INSERT TO clinicsync_fn_owner
  WITH CHECK (
    status = 'requested'
    AND booking_channel = 'web'
    AND expires_at IS NOT NULL
    AND expires_at > pg_catalog.statement_timestamp()
    AND EXISTS (
      SELECT 1 FROM public.clinics AS c
      WHERE c.id = appointments.clinic_id AND c.is_active
    )
    AND EXISTS (
      SELECT 1 FROM public.doctors AS d
      WHERE d.id = appointments.doctor_id
        AND d.clinic_id = appointments.clinic_id
        AND d.is_active
    )
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
CREATE POLICY appointments_fn_owner_read_expired_cancellations
  ON public.appointments FOR SELECT TO clinicsync_fn_owner
  USING (
    status = 'cancelled'
    AND expires_at IS NOT NULL
    AND expires_at <= pg_catalog.clock_timestamp()
  );
CREATE POLICY staff_members_fn_owner_read
  ON public.staff_members FOR SELECT TO clinicsync_fn_owner
  USING (true);

-- Authenticated access is explicitly granted; anonymous table scans are removed.
REVOKE ALL PRIVILEGES ON TABLE
  public.clinics,
  public.doctors,
  public.patients,
  public.availability,
  public.appointments,
  public.staff_members
FROM PUBLIC, anon, authenticated, service_role, booking_api, clinicsync_fn_owner, clinicsync_cron_runner;
-- Table-level REVOKE does not clear prior column grants, so explicitly remove
-- the old direct write grants before re-granting only to the restricted owner.
REVOKE INSERT (clinic_id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active),
       UPDATE (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active),
       DELETE
  ON TABLE public.availability
  FROM PUBLIC, anon, authenticated, service_role, booking_api, clinicsync_fn_owner, clinicsync_cron_runner;
REVOKE INSERT (user_id, clinic_id, role, is_active), UPDATE (role, is_active)
  ON TABLE public.staff_members
  FROM PUBLIC, anon, authenticated, service_role, booking_api, clinicsync_fn_owner, clinicsync_cron_runner;
REVOKE SELECT (id, clinic_id, full_name, phone_e164, created_at)
  ON TABLE public.patients
  FROM PUBLIC, anon, authenticated, service_role, booking_api, clinicsync_fn_owner, clinicsync_cron_runner;

GRANT SELECT ON TABLE public.clinics TO authenticated;
GRANT SELECT ON TABLE public.doctors, public.availability, public.appointments,
  public.staff_members TO authenticated;
-- Patient phone numbers are never available through direct table reads.
GRANT SELECT (id, clinic_id, full_name, created_at) ON TABLE public.patients TO authenticated;
-- Doctor creation and every active-state/profile update go through the
-- clinic-authorized RPCs, which take the same locks as public booking.
REVOKE INSERT (id, clinic_id, name, specialty, is_active),
       UPDATE (name, specialty, is_active),
       DELETE
  ON TABLE public.doctors
  FROM PUBLIC, anon, authenticated, service_role, booking_api, clinicsync_fn_owner, clinicsync_cron_runner;
-- Doctor creation and status/profile updates require the RPC protocol. Preserve
-- the existing admin-only delete operation; same-clinic foreign keys still
-- restrict deletion when availability or appointments reference the doctor.
GRANT DELETE ON TABLE public.doctors TO authenticated;
-- Availability changes and membership changes must go through the serialized
-- security-definer RPCs below; direct authenticated DML stays revoked.
GRANT UPDATE (status) ON TABLE public.appointments TO authenticated;

-- The function owner receives only the columns and writes needed by tenant-
-- scoped booking, expiry, patient RPCs, membership, availability, and doctors RPCs.
GRANT SELECT (id, slug, name, time_zone, is_active) ON TABLE public.clinics TO clinicsync_fn_owner;
GRANT SELECT (id, clinic_id, name, specialty, is_active) ON TABLE public.doctors TO clinicsync_fn_owner;
GRANT INSERT (id, clinic_id, name, specialty, is_active),
      UPDATE (name, specialty, is_active)
  ON TABLE public.doctors TO clinicsync_fn_owner;
GRANT SELECT (clinic_id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
  ON TABLE public.availability TO clinicsync_fn_owner;
GRANT INSERT (clinic_id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active),
      UPDATE (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active),
      DELETE ON TABLE public.availability TO clinicsync_fn_owner;
GRANT SELECT (id, clinic_id, full_name, phone_e164, created_at),
      INSERT (id, clinic_id, full_name, phone_e164)
  ON TABLE public.patients TO clinicsync_fn_owner;
GRANT SELECT (id, clinic_id, patient_id, doctor_id, starts_at, ends_at, status, expires_at)
  ON TABLE public.appointments TO clinicsync_fn_owner;
GRANT INSERT (id, clinic_id, patient_id, doctor_id, starts_at, ends_at, status, booking_channel, expires_at)
  ON TABLE public.appointments TO clinicsync_fn_owner;
GRANT UPDATE (status) ON TABLE public.appointments TO clinicsync_fn_owner;
GRANT SELECT (user_id, clinic_id, role, is_active),
      INSERT (user_id, clinic_id, role, is_active),
      UPDATE (role, is_active)
  ON TABLE public.staff_members TO clinicsync_fn_owner;

-- Lock-key helpers use separate hash namespaces so schedule, availability-row,
-- and clinic-membership locks cannot intentionally alias each other.
CREATE FUNCTION private.schedule_lock_key(
  p_clinic_id uuid,
  p_doctor_id uuid,
  p_day_of_week smallint
)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $function$
  SELECT pg_catalog.hashtextextended(
    'clinicsync:schedule:' || p_clinic_id::text || ':' ||
    p_doctor_id::text || ':' || p_day_of_week::text,
    0
  )
$function$;

CREATE FUNCTION private.availability_row_lock_key(p_availability_id uuid)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $function$
  SELECT pg_catalog.hashtextextended(
    'clinicsync:availability-row:' || p_availability_id::text,
    0
  )
$function$;

CREATE FUNCTION private.membership_lock_key(p_clinic_id uuid)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $function$
  SELECT pg_catalog.hashtextextended(
    'clinicsync:membership:' || p_clinic_id::text,
    0
  )
$function$;

-- Eligibility changes take every weekday lock used by booking, in signed hash
-- key order. This makes the doctor-wide lock set deterministic and avoids
-- deadlocks with availability updates that order their old/new keys likewise.
CREATE FUNCTION private.lock_doctor_schedule(
  p_clinic_id uuid,
  p_doctor_id uuid
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SET search_path = ''
AS $function$
DECLARE
  v_lock_key bigint;
BEGIN
  IF p_clinic_id IS NULL OR p_doctor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_doctor_input';
  END IF;

  FOR v_lock_key IN
    SELECT private.schedule_lock_key(
      p_clinic_id, p_doctor_id, weekdays.day_of_week::smallint
    ) AS lock_key
    FROM pg_catalog.generate_series(1, 7) AS weekdays(day_of_week)
    ORDER BY lock_key
  LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(v_lock_key);
  END LOOP;
END
$function$;

CREATE FUNCTION public.create_clinic_doctor(
  p_clinic_id uuid,
  p_name text,
  p_specialty text
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_doctor_id uuid;
BEGIN
  IF p_clinic_id IS NULL OR p_name IS NULL OR p_specialty IS NULL
     OR pg_catalog.char_length(pg_catalog.btrim(p_name)) NOT BETWEEN 1 AND 120
     OR pg_catalog.char_length(pg_catalog.btrim(p_specialty)) NOT BETWEEN 1 AND 120
     OR p_name ~ '[[:cntrl:]]'
     OR p_specialty ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_doctor_input';
  END IF;
  IF (SELECT private.current_staff_role(p_clinic_id)) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'clinic_admin_required';
  END IF;

  -- Membership changes serialize against this authorization check. Lock order
  -- is clinic membership first, then all doctor weekday locks in key order.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    private.membership_lock_key(p_clinic_id)
  );
  IF (SELECT private.current_staff_role(p_clinic_id)) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'clinic_admin_required';
  END IF;

  v_doctor_id := pg_catalog.gen_random_uuid();
  PERFORM private.lock_doctor_schedule(p_clinic_id, v_doctor_id);
  INSERT INTO public.doctors (id, clinic_id, name, specialty, is_active)
  VALUES (
    v_doctor_id, p_clinic_id, pg_catalog.btrim(p_name),
    pg_catalog.btrim(p_specialty), true
  );

  RETURN v_doctor_id;
END
$function$;

CREATE FUNCTION public.update_clinic_doctor(
  p_clinic_id uuid,
  p_doctor_id uuid,
  p_name text,
  p_specialty text,
  p_is_active boolean
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_updated_id uuid;
BEGIN
  IF p_clinic_id IS NULL OR p_doctor_id IS NULL
     OR p_name IS NULL OR p_specialty IS NULL OR p_is_active IS NULL
     OR pg_catalog.char_length(pg_catalog.btrim(p_name)) NOT BETWEEN 1 AND 120
     OR pg_catalog.char_length(pg_catalog.btrim(p_specialty)) NOT BETWEEN 1 AND 120
     OR p_name ~ '[[:cntrl:]]'
     OR p_specialty ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_doctor_input';
  END IF;
  IF (SELECT private.current_staff_role(p_clinic_id)) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'clinic_admin_required';
  END IF;

  -- Serialize authorization changes before eligibility locks. The membership
  -- lock is not used by booking; all seven schedule locks are shared with
  -- booking's per-weekday shared lock and held through this transaction.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    private.membership_lock_key(p_clinic_id)
  );
  IF (SELECT private.current_staff_role(p_clinic_id)) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'clinic_admin_required';
  END IF;
  PERFORM private.lock_doctor_schedule(p_clinic_id, p_doctor_id);

  UPDATE public.doctors AS d
  SET name = pg_catalog.btrim(p_name),
      specialty = pg_catalog.btrim(p_specialty),
      is_active = p_is_active
  WHERE d.clinic_id = p_clinic_id
    AND d.id = p_doctor_id
  RETURNING d.id INTO v_updated_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'doctor_not_found';
  END IF;

  RETURN v_updated_id;
END
$function$;

COMMENT ON FUNCTION public.create_clinic_doctor(uuid, text, text) IS
  'SECURITY DEFINER: active clinic admins only; serializes membership authorization and uses the doctor-wide weekday schedule-lock protocol before creating an active doctor.';
COMMENT ON FUNCTION public.update_clinic_doctor(uuid, uuid, text, text, boolean) IS
  'SECURITY DEFINER: active clinic admins only; serializes membership authorization, then locks all seven clinic/doctor weekday schedule keys in ascending hash order before updating. Deactivation blocks new public bookings but leaves existing future requested/confirmed appointments unchanged; this RPC never cancels or reschedules appointments.';

CREATE FUNCTION private.has_future_appointments_in_schedule_window(
  p_clinic_id uuid,
  p_doctor_id uuid,
  p_day_of_week smallint,
  p_start_time time without time zone,
  p_end_time time without time zone
)
RETURNS boolean
LANGUAGE sql
VOLATILE
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.appointments AS appointment
    WHERE appointment.clinic_id = p_clinic_id
      AND appointment.doctor_id = p_doctor_id
      AND appointment.status IN ('requested', 'confirmed')
      AND appointment.starts_at > pg_catalog.clock_timestamp()
      AND EXTRACT(
        ISODOW FROM (appointment.starts_at AT TIME ZONE 'Africa/Cairo')
      )::smallint = p_day_of_week
      AND (appointment.starts_at AT TIME ZONE 'Africa/Cairo')::time < p_end_time
      AND (appointment.ends_at AT TIME ZONE 'Africa/Cairo')::time > p_start_time
  )
$function$;

-- Only an already-authorized clinic admin can call this upsert RPC. The
-- transaction-scoped clinic lock serializes all membership changes for that
-- clinic, so concurrent demotions/deactivations cannot remove its last active
-- administrator. Bootstrap of the first admin remains operator-only.
CREATE FUNCTION public.set_clinic_member(
  p_clinic_id uuid,
  p_user_id uuid,
  p_role text,
  p_is_active boolean
)
RETURNS TABLE (user_id uuid, clinic_id uuid, role text, is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_previous_role text;
  v_previous_active boolean;
  v_remaining_admins bigint;
BEGIN
  IF p_clinic_id IS NULL OR p_user_id IS NULL
     OR p_role IS NULL OR p_role NOT IN ('admin', 'staff')
     OR p_is_active IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_membership_input';
  END IF;
  IF p_user_id = (SELECT auth.uid()) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'cannot_change_own_membership';
  END IF;
  IF (SELECT private.current_staff_role(p_clinic_id)) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'clinic_admin_required';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    private.membership_lock_key(p_clinic_id)
  );

  -- Recheck after waiting: the caller might have lost admin status while
  -- another membership transaction held the clinic lock.
  IF (SELECT private.current_staff_role(p_clinic_id)) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'clinic_admin_required';
  END IF;

  SELECT sm.role, sm.is_active
    INTO v_previous_role, v_previous_active
  FROM public.staff_members AS sm
  WHERE sm.clinic_id = p_clinic_id
    AND sm.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY
      INSERT INTO public.staff_members (user_id, clinic_id, role, is_active)
      VALUES (p_user_id, p_clinic_id, p_role, p_is_active)
      RETURNING staff_members.user_id, staff_members.clinic_id,
                staff_members.role, staff_members.is_active;
    RETURN;
  END IF;

  IF v_previous_role = 'admin' AND v_previous_active
     AND (p_role <> 'admin' OR NOT p_is_active) THEN
    SELECT pg_catalog.count(*)
      INTO v_remaining_admins
    FROM public.staff_members AS sm
    WHERE sm.clinic_id = p_clinic_id
      AND sm.role = 'admin'
      AND sm.is_active
      AND sm.user_id <> p_user_id;
    IF v_remaining_admins = 0 THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'clinic_must_retain_an_active_admin';
    END IF;
  END IF;

  UPDATE public.staff_members AS sm
  SET role = p_role, is_active = p_is_active
  WHERE sm.clinic_id = p_clinic_id
    AND sm.user_id = p_user_id;

  RETURN QUERY
    SELECT sm.user_id, sm.clinic_id, sm.role, sm.is_active
    FROM public.staff_members AS sm
    WHERE sm.clinic_id = p_clinic_id
      AND sm.user_id = p_user_id;
END
$function$;

-- Controlled patient read boundary: authenticated staff may search within one
-- authorized clinic, but the RPC returns only a masked phone value.
CREATE FUNCTION public.search_clinic_patients(
  p_clinic_id uuid,
  p_search text
)
RETURNS TABLE (
  patient_id uuid,
  full_name text,
  masked_phone text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_search text;
  v_pattern text;
  v_role text;
BEGIN
  IF p_clinic_id IS NULL OR p_search IS NULL
     OR pg_catalog.char_length(p_search) > 80
     OR p_search ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_patient_search';
  END IF;
  v_role := (SELECT private.current_staff_role(p_clinic_id));
  IF v_role IS NULL OR v_role NOT IN ('admin', 'staff') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'clinic_staff_required';
  END IF;

  v_search := pg_catalog.btrim(p_search);
  IF pg_catalog.char_length(v_search) < 2 THEN
    RETURN;
  END IF;
  v_pattern := '%' ||
    pg_catalog.replace(
      pg_catalog.replace(
        pg_catalog.replace(v_search, E'\\', E'\\\\'),
        '%', E'\\%'
      ),
      '_', E'\\_'
    ) || '%';

  RETURN QUERY
    SELECT patient.id,
           patient.full_name,
           CASE
             WHEN pg_catalog.char_length(patient.phone_e164) <= 6 THEN '••••'
             ELSE '••• ••• ' || pg_catalog.right(patient.phone_e164, 4)
           END,
           patient.created_at
    FROM public.patients AS patient
    WHERE patient.clinic_id = p_clinic_id
      AND (
        patient.full_name ILIKE v_pattern ESCAPE E'\\'
        OR patient.phone_e164 ILIKE v_pattern ESCAPE E'\\'
      )
    ORDER BY patient.full_name, patient.id
    LIMIT 100;
END
$function$;

CREATE FUNCTION public.get_clinic_patient(
  p_clinic_id uuid,
  p_patient_id uuid
)
RETURNS TABLE (
  patient_id uuid,
  full_name text,
  masked_phone text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT patient.id,
         patient.full_name,
         CASE
           WHEN pg_catalog.char_length(patient.phone_e164) <= 6 THEN '••••'
           ELSE '••• ••• ' || pg_catalog.right(patient.phone_e164, 4)
         END,
         patient.created_at
  FROM public.patients AS patient
  WHERE patient.clinic_id = p_clinic_id
    AND patient.id = p_patient_id
    AND (SELECT private.current_staff_role(p_clinic_id)) IN ('admin', 'staff')
$function$;

CREATE FUNCTION private.raise_if_future_appointments_in_schedule_window(
  p_clinic_id uuid,
  p_doctor_id uuid,
  p_day_of_week smallint,
  p_start_time time without time zone,
  p_end_time time without time zone
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SET search_path = ''
AS $function$
BEGIN
  IF private.has_future_appointments_in_schedule_window(
    p_clinic_id, p_doctor_id, p_day_of_week, p_start_time, p_end_time
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'availability_has_future_active_appointments';
  END IF;
END
$function$;

CREATE FUNCTION public.create_clinic_availability(
  p_clinic_id uuid,
  p_doctor_id uuid,
  p_day_of_week smallint,
  p_start_time time without time zone,
  p_end_time time without time zone,
  p_slot_duration_minutes smallint,
  p_is_active boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_availability_id uuid;
BEGIN
  IF p_clinic_id IS NULL OR p_doctor_id IS NULL
     OR p_day_of_week IS NULL OR p_day_of_week NOT BETWEEN 1 AND 7
     OR p_start_time IS NULL OR p_end_time IS NULL OR p_end_time <= p_start_time
     OR p_slot_duration_minutes IS NULL
     OR p_slot_duration_minutes NOT BETWEEN 5 AND 240
     OR p_slot_duration_minutes % 5 <> 0
     OR p_is_active IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_availability_input';
  END IF;
  IF (SELECT private.current_staff_role(p_clinic_id)) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'clinic_admin_required';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    private.schedule_lock_key(p_clinic_id, p_doctor_id, p_day_of_week)
  );

  INSERT INTO public.availability (
    clinic_id, doctor_id, day_of_week, start_time, end_time,
    slot_duration_minutes, is_active
  )
  VALUES (
    p_clinic_id, p_doctor_id, p_day_of_week, p_start_time, p_end_time,
    p_slot_duration_minutes, p_is_active
  )
  RETURNING id INTO v_availability_id;

  RETURN v_availability_id;
END
$function$;

CREATE FUNCTION public.update_clinic_availability(
  p_clinic_id uuid,
  p_availability_id uuid,
  p_doctor_id uuid,
  p_day_of_week smallint,
  p_start_time time without time zone,
  p_end_time time without time zone,
  p_slot_duration_minutes smallint,
  p_is_active boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_old_doctor_id uuid;
  v_old_day_of_week smallint;
  v_old_start_time time without time zone;
  v_old_end_time time without time zone;
  v_old_slot_duration_minutes smallint;
  v_old_is_active boolean;
  v_old_lock bigint;
  v_new_lock bigint;
BEGIN
  IF p_clinic_id IS NULL OR p_availability_id IS NULL OR p_doctor_id IS NULL
     OR p_day_of_week IS NULL OR p_day_of_week NOT BETWEEN 1 AND 7
     OR p_start_time IS NULL OR p_end_time IS NULL OR p_end_time <= p_start_time
     OR p_slot_duration_minutes IS NULL
     OR p_slot_duration_minutes NOT BETWEEN 5 AND 240
     OR p_slot_duration_minutes % 5 <> 0
     OR p_is_active IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_availability_input';
  END IF;
  IF (SELECT private.current_staff_role(p_clinic_id)) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'clinic_admin_required';
  END IF;

  -- First take the row-scoped advisory lock, then read without a tuple lock,
  -- then take schedule-window locks in ascending key order. Deferring the
  -- UPDATE tuple lock until after schedule locks avoids cycles with INSERTs
  -- that are checking the exclusion constraint under the same schedule lock.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    private.availability_row_lock_key(p_availability_id)
  );
  SELECT a.doctor_id, a.day_of_week, a.start_time, a.end_time,
         a.slot_duration_minutes, a.is_active
    INTO v_old_doctor_id, v_old_day_of_week, v_old_start_time, v_old_end_time,
         v_old_slot_duration_minutes, v_old_is_active
  FROM public.availability AS a
  WHERE a.id = p_availability_id AND a.clinic_id = p_clinic_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'availability_not_found';
  END IF;

  v_old_lock := private.schedule_lock_key(
    p_clinic_id, v_old_doctor_id, v_old_day_of_week
  );
  v_new_lock := private.schedule_lock_key(
    p_clinic_id, p_doctor_id, p_day_of_week
  );
  IF v_old_lock = v_new_lock THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(v_old_lock);
  ELSIF v_old_lock < v_new_lock THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(v_old_lock);
    PERFORM pg_catalog.pg_advisory_xact_lock(v_new_lock);
  ELSE
    PERFORM pg_catalog.pg_advisory_xact_lock(v_new_lock);
    PERFORM pg_catalog.pg_advisory_xact_lock(v_old_lock);
  END IF;

  IF v_old_doctor_id IS DISTINCT FROM p_doctor_id
     OR v_old_day_of_week IS DISTINCT FROM p_day_of_week
     OR v_old_start_time IS DISTINCT FROM p_start_time
     OR v_old_end_time IS DISTINCT FROM p_end_time
     OR v_old_slot_duration_minutes IS DISTINCT FROM p_slot_duration_minutes
     OR v_old_is_active IS DISTINCT FROM p_is_active THEN
    PERFORM private.raise_if_future_appointments_in_schedule_window(
      p_clinic_id, v_old_doctor_id, v_old_day_of_week,
      v_old_start_time, v_old_end_time
    );
  END IF;

  UPDATE public.availability AS a
  SET doctor_id = p_doctor_id,
      day_of_week = p_day_of_week,
      start_time = p_start_time,
      end_time = p_end_time,
      slot_duration_minutes = p_slot_duration_minutes,
      is_active = p_is_active
  WHERE a.id = p_availability_id AND a.clinic_id = p_clinic_id;

  RETURN p_availability_id;
END
$function$;

CREATE FUNCTION public.delete_clinic_availability(
  p_clinic_id uuid,
  p_availability_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_doctor_id uuid;
  v_day_of_week smallint;
  v_start_time time without time zone;
  v_end_time time without time zone;
BEGIN
  IF p_clinic_id IS NULL OR p_availability_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_availability_input';
  END IF;
  IF (SELECT private.current_staff_role(p_clinic_id)) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'clinic_admin_required';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    private.availability_row_lock_key(p_availability_id)
  );
  SELECT a.doctor_id, a.day_of_week, a.start_time, a.end_time
    INTO v_doctor_id, v_day_of_week, v_start_time, v_end_time
  FROM public.availability AS a
  WHERE a.id = p_availability_id AND a.clinic_id = p_clinic_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'availability_not_found';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    private.schedule_lock_key(p_clinic_id, v_doctor_id, v_day_of_week)
  );
  PERFORM private.raise_if_future_appointments_in_schedule_window(
    p_clinic_id, v_doctor_id, v_day_of_week, v_start_time, v_end_time
  );

  DELETE FROM public.availability AS a
  WHERE a.id = p_availability_id AND a.clinic_id = p_clinic_id;

  RETURN p_availability_id;
END
$function$;

-- Public clinic discovery is explicit and slug-scoped. Public clients cannot
-- query all clinic rows or scan doctors/availability tables directly.
CREATE FUNCTION public.get_public_clinic_doctors(p_clinic_slug text)
RETURNS TABLE (doctor_id uuid, name text, specialty text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT d.id, d.name, d.specialty
  FROM public.doctors AS d
  JOIN public.clinics AS c ON c.id = d.clinic_id
  WHERE c.slug = p_clinic_slug
    AND c.is_active
    AND d.is_active
  ORDER BY d.name, d.id
$function$;

CREATE FUNCTION public.get_public_clinic_availability(p_clinic_slug text)
RETURNS TABLE (
  doctor_id uuid,
  day_of_week smallint,
  start_time time without time zone,
  end_time time without time zone,
  slot_duration_minutes smallint,
  time_zone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT a.doctor_id, a.day_of_week, a.start_time, a.end_time,
         a.slot_duration_minutes, c.time_zone
  FROM public.availability AS a
  JOIN public.doctors AS d
    ON d.id = a.doctor_id AND d.clinic_id = a.clinic_id
  JOIN public.clinics AS c ON c.id = a.clinic_id
  WHERE c.slug = p_clinic_slug
    AND c.is_active
    AND d.is_active
    AND a.is_active
  ORDER BY a.doctor_id, a.day_of_week, a.start_time
$function$;

REVOKE ALL PRIVILEGES ON FUNCTION public.get_public_clinic_doctors(text)
  FROM PUBLIC, anon, authenticated, service_role, booking_api, clinicsync_cron_runner;
REVOKE ALL PRIVILEGES ON FUNCTION public.get_public_clinic_availability(text)
  FROM PUBLIC, anon, authenticated, service_role, booking_api, clinicsync_cron_runner;

CREATE OR REPLACE FUNCTION private.book_public_appointment(
  p_doctor_id uuid,
  p_full_name text,
  p_phone_e164 text,
  p_starts_at timestamp with time zone
)
RETURNS TABLE (
  outcome text,
  appointment_id uuid,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  expires_at timestamp with time zone
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_now timestamp with time zone;
  v_local_start timestamp without time zone;
  v_local_end timestamp without time zone;
  v_schedule_start time without time zone;
  v_schedule_end time without time zone;
  v_slot_duration integer;
  v_day_of_week smallint;
  v_seconds_from_schedule_start bigint;
  v_ends_at timestamp with time zone;
  v_expires_at timestamp with time zone;
  v_patient_id uuid;
  v_appointment_id uuid;
  v_expired_id uuid;
  v_clinic_id uuid;
BEGIN
  v_now := pg_catalog.clock_timestamp();

  IF p_doctor_id IS NULL OR p_full_name IS NULL OR p_phone_e164 IS NULL OR p_starts_at IS NULL THEN
    outcome := 'invalid_input';
    RETURN NEXT;
    RETURN;
  END IF;

  IF pg_catalog.char_length(pg_catalog.btrim(p_full_name)) NOT BETWEEN 1 AND 120
     OR p_full_name ~ '[[:cntrl:]]'
     OR p_phone_e164 !~ '^[+][1-9][0-9]{1,14}$' THEN
    outcome := 'invalid_input';
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_starts_at <= v_now THEN
    outcome := 'time_not_future';
    RETURN NEXT;
    RETURN;
  END IF;

  IF pg_catalog.date_trunc('minute', p_starts_at) <> p_starts_at THEN
    outcome := 'invalid_slot';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT d.clinic_id
    INTO v_clinic_id
  FROM public.doctors AS d
  JOIN public.clinics AS c ON c.id = d.clinic_id
  WHERE d.id = p_doctor_id
    AND d.is_active
    AND c.is_active;

  IF NOT FOUND THEN
    outcome := 'doctor_unavailable';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Schedules and current input validation remain pinned to Africa/Cairo.
  v_local_start := p_starts_at AT TIME ZONE 'Africa/Cairo';

  IF (v_local_start AT TIME ZONE 'Africa/Cairo') IS DISTINCT FROM p_starts_at THEN
    outcome := 'invalid_local_time';
    RETURN NEXT;
    RETURN;
  END IF;

  v_day_of_week := EXTRACT(ISODOW FROM v_local_start)::smallint;

  -- The booking shares this transaction-scoped lock with every availability
  -- mutation for the same clinic, doctor, and Cairo-local weekday. The lock is
  -- acquired before reading a schedule, so either the old schedule is used
  -- and the editor sees this booking, or the new schedule is read after commit.
  PERFORM pg_catalog.pg_advisory_xact_lock_shared(
    private.schedule_lock_key(v_clinic_id, p_doctor_id, v_day_of_week)
  );

  -- The initial lookup only locates the clinic so the schedule key can be
  -- computed. Recheck eligibility after waiting for the shared lock: if a
  -- deactivation won the exclusive all-weekday locks first, this read must see
  -- its committed state and reject the booking. If booking got here first, its
  -- shared lock serializes it before deactivation until transaction commit.
  PERFORM 1
  FROM public.doctors AS d
  JOIN public.clinics AS c ON c.id = d.clinic_id
  WHERE d.id = p_doctor_id
    AND d.clinic_id = v_clinic_id
    AND d.is_active
    AND c.is_active;

  IF NOT FOUND THEN
    outcome := 'doctor_unavailable';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT a.start_time, a.end_time, a.slot_duration_minutes
    INTO v_schedule_start, v_schedule_end, v_slot_duration
  FROM public.availability AS a
  WHERE a.clinic_id = v_clinic_id
    AND a.doctor_id = p_doctor_id
    AND a.day_of_week = v_day_of_week
    AND a.is_active
    AND v_local_start::time >= a.start_time
    AND v_local_start::time < a.end_time
  ORDER BY a.start_time
  LIMIT 1;

  IF NOT FOUND THEN
    outcome := 'off_schedule';
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_slot_duration NOT BETWEEN 5 AND 240 OR v_slot_duration % 5 <> 0 THEN
    outcome := 'invalid_schedule';
    RETURN NEXT;
    RETURN;
  END IF;

  v_seconds_from_schedule_start := extract(
    epoch FROM (v_local_start - (v_local_start::date + v_schedule_start))
  )::bigint;

  IF v_seconds_from_schedule_start < 0
     OR v_seconds_from_schedule_start % (v_slot_duration * 60) <> 0 THEN
    outcome := 'misaligned_slot';
    RETURN NEXT;
    RETURN;
  END IF;

  v_ends_at := p_starts_at + pg_catalog.make_interval(mins => v_slot_duration);
  v_local_end := v_ends_at AT TIME ZONE 'Africa/Cairo';

  IF v_local_end::date <> v_local_start::date OR v_local_end::time > v_schedule_end THEN
    outcome := 'off_schedule';
    RETURN NEXT;
    RETURN;
  END IF;

  v_now := pg_catalog.clock_timestamp();
  IF p_starts_at <= v_now THEN
    outcome := 'time_not_future';
    RETURN NEXT;
    RETURN;
  END IF;

  v_expires_at := LEAST(
    v_now + INTERVAL '24 hours',
    p_starts_at - INTERVAL '1 hour'
  );

  IF v_expires_at <= v_now THEN
    outcome := 'too_close_to_start';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Expired overlapping requests are cancelled only inside the same clinic.
  FOR v_expired_id IN
    SELECT a.id
    FROM public.appointments AS a
    WHERE a.clinic_id = v_clinic_id
      AND a.doctor_id = p_doctor_id
      AND a.status = 'requested'
      AND a.expires_at IS NOT NULL
      AND a.expires_at <= v_now
      AND a.starts_at < v_ends_at
      AND a.ends_at > p_starts_at
    ORDER BY a.expires_at, a.id
    FOR UPDATE OF a
  LOOP
    UPDATE public.appointments AS a
    SET status = 'cancelled'
    WHERE a.id = v_expired_id
      AND a.clinic_id = v_clinic_id
      AND a.status = 'requested'
      AND a.expires_at <= v_now;
  END LOOP;

  v_patient_id := pg_catalog.gen_random_uuid();
  v_appointment_id := pg_catalog.gen_random_uuid();

  BEGIN
    IF v_expires_at <= pg_catalog.clock_timestamp() THEN
      outcome := 'too_close_to_start';
      RETURN NEXT;
      RETURN;
    END IF;

    INSERT INTO public.patients (id, clinic_id, full_name, phone_e164)
    VALUES (v_patient_id, v_clinic_id, pg_catalog.btrim(p_full_name), p_phone_e164);

    INSERT INTO public.appointments (
      id,
      clinic_id,
      patient_id,
      doctor_id,
      starts_at,
      ends_at,
      status,
      booking_channel,
      expires_at
    )
    VALUES (
      v_appointment_id,
      v_clinic_id,
      v_patient_id,
      p_doctor_id,
      p_starts_at,
      v_ends_at,
      'requested',
      'web',
      v_expires_at
    );
  EXCEPTION
    WHEN exclusion_violation THEN
      outcome := 'slot_conflict';
      appointment_id := NULL;
      starts_at := NULL;
      ends_at := NULL;
      expires_at := NULL;
      RETURN NEXT;
      RETURN;
    WHEN insufficient_privilege THEN
      outcome := 'too_close_to_start';
      appointment_id := NULL;
      starts_at := NULL;
      ends_at := NULL;
      expires_at := NULL;
      RETURN NEXT;
      RETURN;
  END;

  outcome := 'requested';
  appointment_id := v_appointment_id;
  starts_at := p_starts_at;
  ends_at := v_ends_at;
  expires_at := v_expires_at;
  RETURN NEXT;
END;
$function$;

GRANT CREATE ON SCHEMA public TO clinicsync_fn_owner;
ALTER FUNCTION private.current_staff_role(uuid) OWNER TO clinicsync_fn_owner;
ALTER FUNCTION public.get_public_clinic_doctors(text) OWNER TO clinicsync_fn_owner;
ALTER FUNCTION public.get_public_clinic_availability(text) OWNER TO clinicsync_fn_owner;
ALTER FUNCTION public.create_clinic_doctor(uuid, text, text) OWNER TO clinicsync_fn_owner;
ALTER FUNCTION public.update_clinic_doctor(uuid, uuid, text, text, boolean) OWNER TO clinicsync_fn_owner;
ALTER FUNCTION public.set_clinic_member(uuid, uuid, text, boolean) OWNER TO clinicsync_fn_owner;
ALTER FUNCTION public.search_clinic_patients(uuid, text) OWNER TO clinicsync_fn_owner;
ALTER FUNCTION public.get_clinic_patient(uuid, uuid) OWNER TO clinicsync_fn_owner;
ALTER FUNCTION public.create_clinic_availability(uuid, uuid, smallint, time without time zone, time without time zone, smallint, boolean)
  OWNER TO clinicsync_fn_owner;
ALTER FUNCTION public.update_clinic_availability(uuid, uuid, uuid, smallint, time without time zone, time without time zone, smallint, boolean)
  OWNER TO clinicsync_fn_owner;
ALTER FUNCTION public.delete_clinic_availability(uuid, uuid) OWNER TO clinicsync_fn_owner;
ALTER FUNCTION private.book_public_appointment(uuid, text, text, timestamp with time zone)
  OWNER TO clinicsync_fn_owner;
REVOKE CREATE ON SCHEMA public FROM clinicsync_fn_owner;
REVOKE clinicsync_fn_owner FROM postgres;

-- Internal helpers are invoker-rights and executable only by the restricted
-- function owner. Public callers receive only the narrowly scoped RPCs.
REVOKE ALL PRIVILEGES ON FUNCTION private.schedule_lock_key(uuid, uuid, smallint),
  private.availability_row_lock_key(uuid), private.membership_lock_key(uuid),
  private.lock_doctor_schedule(uuid, uuid),
  private.has_future_appointments_in_schedule_window(uuid, uuid, smallint, time without time zone, time without time zone),
  private.raise_if_future_appointments_in_schedule_window(uuid, uuid, smallint, time without time zone, time without time zone)
  FROM PUBLIC, anon, authenticated, service_role, booking_api, clinicsync_cron_runner;
GRANT EXECUTE ON FUNCTION private.schedule_lock_key(uuid, uuid, smallint),
  private.availability_row_lock_key(uuid), private.membership_lock_key(uuid),
  private.lock_doctor_schedule(uuid, uuid),
  private.has_future_appointments_in_schedule_window(uuid, uuid, smallint, time without time zone, time without time zone),
  private.raise_if_future_appointments_in_schedule_window(uuid, uuid, smallint, time without time zone, time without time zone)
  TO clinicsync_fn_owner;

REVOKE ALL PRIVILEGES ON FUNCTION public.create_clinic_doctor(uuid, text, text),
  public.update_clinic_doctor(uuid, uuid, text, text, boolean),
  public.set_clinic_member(uuid, uuid, text, boolean),
  public.search_clinic_patients(uuid, text), public.get_clinic_patient(uuid, uuid),
  public.create_clinic_availability(uuid, uuid, smallint, time without time zone, time without time zone, smallint, boolean),
  public.update_clinic_availability(uuid, uuid, uuid, smallint, time without time zone, time without time zone, smallint, boolean),
  public.delete_clinic_availability(uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role, booking_api, clinicsync_cron_runner;
REVOKE ALL PRIVILEGES ON FUNCTION public.get_public_clinic_doctors(text)
  FROM PUBLIC, anon, authenticated, service_role, booking_api, clinicsync_cron_runner;
REVOKE ALL PRIVILEGES ON FUNCTION public.get_public_clinic_availability(text)
  FROM PUBLIC, anon, authenticated, service_role, booking_api, clinicsync_cron_runner;

GRANT EXECUTE ON FUNCTION public.get_public_clinic_doctors(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_clinic_availability(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_clinic_doctor(uuid, text, text),
  public.update_clinic_doctor(uuid, uuid, text, text, boolean)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_clinic_member(uuid, uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_clinic_patients(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_clinic_patient(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_clinic_availability(uuid, uuid, smallint, time without time zone, time without time zone, smallint, boolean)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_clinic_availability(uuid, uuid, uuid, smallint, time without time zone, time without time zone, smallint, boolean)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_clinic_availability(uuid, uuid) TO authenticated;
REVOKE ALL PRIVILEGES ON FUNCTION private.book_public_appointment(uuid, text, text, timestamp with time zone)
  FROM PUBLIC, anon, authenticated, service_role, clinicsync_cron_runner;
GRANT EXECUTE ON FUNCTION private.book_public_appointment(uuid, text, text, timestamp with time zone)
  TO booking_api;
COMMENT ON FUNCTION private.book_public_appointment(uuid, text, text, timestamp with time zone) IS
  'SECURITY DEFINER: caller booking_api only; owner clinicsync_fn_owner; locates clinic_id from the active doctor, then rechecks doctor and clinic eligibility after taking the shared clinic/doctor/weekday schedule lock before validating Africa/Cairo availability and atomically inserting a same-clinic patient and public web request; returns only a safe outcome and appointment timing.';

COMMIT;
