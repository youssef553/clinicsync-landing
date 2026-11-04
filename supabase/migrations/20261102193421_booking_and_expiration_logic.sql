-- ClinicSync booking integrity, appointment status transitions, and expiry functions.
-- No appointments or patients are seeded by this migration.

CREATE OR REPLACE FUNCTION private.enforce_appointment_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'requested' AND NEW.status IN ('confirmed', 'cancelled') THEN
    IF NEW.status = 'confirmed'
       AND (OLD.expires_at IS NULL OR OLD.expires_at <= pg_catalog.clock_timestamp()) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'appointment request is expired';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'confirmed' AND NEW.status IN ('cancelled', 'completed') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'invalid appointment status transition';
END;
$function$;
REVOKE ALL PRIVILEGES ON FUNCTION private.enforce_appointment_status_transition()
  FROM PUBLIC, anon, authenticated, service_role, booking_api, clinicsync_fn_owner, clinicsync_cron_runner;

CREATE TRIGGER appointments_enforce_status_transition
  BEFORE UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION private.enforce_appointment_status_transition();

-- The definer's insert policy checks the request timestamp. The booking function
-- separately rechecks the expiry immediately before inserting to handle delays.
ALTER POLICY appointments_fn_owner_insert_web_request
  ON public.appointments
  WITH CHECK (
    status = 'requested'
    AND booking_channel = 'web'
    AND expires_at IS NOT NULL
    AND expires_at > pg_catalog.statement_timestamp()
  );

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
  v_seconds_from_schedule_start bigint;
  v_ends_at timestamp with time zone;
  v_expires_at timestamp with time zone;
  v_patient_id uuid;
  v_appointment_id uuid;
  v_expired_id uuid;
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

  IF NOT EXISTS (
    SELECT 1
    FROM public.doctors AS d
    WHERE d.id = p_doctor_id
      AND d.is_active
  ) THEN
    outcome := 'doctor_unavailable';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Starts are supplied as an instant with an explicit offset. Convert that
  -- instant to Cairo local wall time for recurring-weekly schedule validation.
  v_local_start := p_starts_at AT TIME ZONE 'Africa/Cairo';

  -- During a repeated DST hour, accept only PostgreSQL's canonical instant for
  -- that local wall time so one displayed Cairo slot cannot be booked twice.
  IF (v_local_start AT TIME ZONE 'Africa/Cairo') IS DISTINCT FROM p_starts_at THEN
    outcome := 'invalid_local_time';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT a.start_time, a.end_time, a.slot_duration_minutes
    INTO v_schedule_start, v_schedule_end, v_slot_duration
  FROM public.availability AS a
  WHERE a.doctor_id = p_doctor_id
    AND a.day_of_week = extract(isodow FROM v_local_start)::smallint
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

  -- Calculate the deadline immediately before persistence. The public policy
  -- intentionally has no additional two-hour booking-notice rule.
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

  -- Lazy cleanup: lock only overdue overlapping requests and cancel them before
  -- the exclusion constraint arbitrates this new booking.
  FOR v_expired_id IN
    SELECT a.id
    FROM public.appointments AS a
    WHERE a.doctor_id = p_doctor_id
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
      AND a.status = 'requested'
      AND a.expires_at <= v_now;
  END LOOP;

  v_patient_id := pg_catalog.gen_random_uuid();
  v_appointment_id := pg_catalog.gen_random_uuid();

  -- Both writes are inside this exception subtransaction. A conflict or expiry
  -- race rolls back the patient row together with the appointment insert.
  BEGIN
    IF v_expires_at <= pg_catalog.clock_timestamp() THEN
      outcome := 'too_close_to_start';
      RETURN NEXT;
      RETURN;
    END IF;

    INSERT INTO public.patients (id, full_name, phone_e164)
    VALUES (v_patient_id, pg_catalog.btrim(p_full_name), p_phone_e164);

    INSERT INTO public.appointments (
      id,
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
      -- The only time-sensitive RLS check here is the request expiry cutoff.
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
REVOKE ALL PRIVILEGES ON FUNCTION private.book_public_appointment(uuid, text, text, timestamp with time zone)
  FROM PUBLIC, anon, authenticated, service_role, booking_api, clinicsync_cron_runner;
GRANT EXECUTE ON FUNCTION private.book_public_appointment(uuid, text, text, timestamp with time zone)
  TO booking_api;
COMMENT ON FUNCTION private.book_public_appointment(uuid, text, text, timestamp with time zone) IS
  'SECURITY DEFINER: caller booking_api only; owner clinicsync_fn_owner; owner has restricted INSERT/SELECT/UPDATE grants and non-BYPASSRLS policies on doctors, availability, patients, and appointments; validates Africa/Cairo schedule and inserts patient+appointment atomically; returns only a safe outcome and appointment timing.';

CREATE OR REPLACE FUNCTION private.expire_pending_appointments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_cancelled_count integer;
BEGIN
  WITH expired_requests AS (
    SELECT a.id
    FROM public.appointments AS a
    WHERE a.status = 'requested'
      AND a.expires_at IS NOT NULL
      AND a.expires_at <= pg_catalog.clock_timestamp()
    ORDER BY a.expires_at, a.id
    LIMIT 500
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.appointments AS a
  SET status = 'cancelled'
  FROM expired_requests AS e
  WHERE a.id = e.id
    AND a.status = 'requested'
    AND a.expires_at <= pg_catalog.clock_timestamp();

  GET DIAGNOSTICS v_cancelled_count = ROW_COUNT;
  RETURN v_cancelled_count;
END;
$function$;
REVOKE ALL PRIVILEGES ON FUNCTION private.expire_pending_appointments()
  FROM PUBLIC, anon, authenticated, service_role, booking_api, clinicsync_cron_runner;
GRANT EXECUTE ON FUNCTION private.expire_pending_appointments()
  TO clinicsync_cron_runner;
COMMENT ON FUNCTION private.expire_pending_appointments() IS
  'SECURITY DEFINER: caller clinicsync_cron_runner only; owner clinicsync_fn_owner; owner can SELECT expired requested rows and UPDATE only status under appointments_fn_owner_read_expired_requests and appointments_fn_owner_cancel_expired_requests RLS; scheduler has no direct appointment table privileges.';

-- Transfer only the two SECURITY DEFINER functions to the restricted owner.
-- Temporary membership permits the transfer and is removed immediately afterward.
GRANT clinicsync_fn_owner TO postgres;
ALTER FUNCTION private.book_public_appointment(uuid, text, text, timestamp with time zone)
  OWNER TO clinicsync_fn_owner;
ALTER FUNCTION private.expire_pending_appointments()
  OWNER TO clinicsync_fn_owner;
REVOKE clinicsync_fn_owner FROM postgres;
