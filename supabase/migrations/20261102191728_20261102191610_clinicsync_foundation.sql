-- ClinicSync database foundation.
-- This migration is intentionally safe to apply to the inspected, empty public schema.
-- No patient or appointment data is inserted here.

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- The project currently grants broad privileges by default on objects created in
-- public. Remove those defaults before creating any application tables or functions.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC, anon, authenticated, service_role;

CREATE SCHEMA IF NOT EXISTS private AUTHORIZATION postgres;
REVOKE ALL PRIVILEGES ON SCHEMA private FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
$function$;
REVOKE ALL PRIVILEGES ON FUNCTION private.set_updated_at() FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE public.doctors (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  name text NOT NULL,
  specialty text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamp with time zone NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT doctors_name_nonempty CHECK (pg_catalog.char_length(pg_catalog.btrim(name)) BETWEEN 1 AND 120),
  CONSTRAINT doctors_specialty_nonempty CHECK (pg_catalog.char_length(pg_catalog.btrim(specialty)) BETWEEN 1 AND 120)
);

CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  full_name text NOT NULL,
  phone_e164 text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT patients_full_name_nonempty CHECK (pg_catalog.char_length(pg_catalog.btrim(full_name)) BETWEEN 1 AND 120),
  CONSTRAINT patients_phone_e164_format CHECK (phone_e164 ~ '^\\+[1-9][0-9]{1,14}$')
);

-- A doctor may have multiple non-overlapping windows on the same weekday.
-- Windows are local wall-clock times in Africa/Cairo and may not cross midnight.
CREATE TABLE public.availability (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  day_of_week smallint NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  slot_duration_minutes smallint NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamp with time zone NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT availability_iso_day CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT availability_start_before_end CHECK (start_time < end_time),
  CONSTRAINT availability_minute_precision CHECK (
    extract(second FROM start_time) = 0
    AND extract(second FROM end_time) = 0
  ),
  CONSTRAINT availability_slot_duration CHECK (
    slot_duration_minutes BETWEEN 5 AND 240
    AND slot_duration_minutes % 5 = 0
  ),
  CONSTRAINT availability_no_overlapping_active_windows
    EXCLUDE USING gist (
      doctor_id extensions.gist_uuid_ops WITH =,
      day_of_week extensions.gist_int2_ops WITH =,
      (pg_catalog.tsrange(
        DATE '2000-01-03' + start_time,
        DATE '2000-01-03' + end_time,
        '[)'
      )) WITH &&
    ) WHERE (is_active)
);

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  booking_channel text NOT NULL DEFAULT 'web',
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamp with time zone NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT appointments_interval_valid CHECK (ends_at > starts_at),
  CONSTRAINT appointments_status_allowed CHECK (status IN ('requested', 'confirmed', 'cancelled', 'completed')),
  CONSTRAINT appointments_channel_allowed CHECK (booking_channel IN ('web', 'staff', 'whatsapp')),
  CONSTRAINT appointments_requested_has_expiry CHECK (status <> 'requested' OR expires_at IS NOT NULL),
  CONSTRAINT appointments_no_overlapping_active_times
    EXCLUDE USING gist (
      doctor_id extensions.gist_uuid_ops WITH =,
      (pg_catalog.tstzrange(starts_at, ends_at, '[)')) WITH &&
    ) WHERE (status IN ('requested', 'confirmed'))
);

CREATE TABLE public.staff_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  role text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamp with time zone NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT staff_members_role_allowed CHECK (role IN ('admin', 'staff'))
);

CREATE INDEX availability_doctor_day_active_idx
  ON public.availability (doctor_id, day_of_week)
  WHERE is_active;

CREATE INDEX appointments_patient_created_idx
  ON public.appointments (patient_id, created_at DESC);

CREATE INDEX appointments_doctor_starts_active_idx
  ON public.appointments (doctor_id, starts_at)
  WHERE status IN ('requested', 'confirmed');

CREATE INDEX appointments_requested_expiry_idx
  ON public.appointments (expires_at, doctor_id)
  WHERE status = 'requested';

CREATE TRIGGER doctors_set_updated_at
  BEFORE UPDATE ON public.doctors
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER availability_set_updated_at
  BEFORE UPDATE ON public.availability
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER appointments_set_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER staff_members_set_updated_at
  BEFORE UPDATE ON public.staff_members
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- Supabase currently has an event trigger that enables RLS on public tables.
-- Explicitly enable and FORCE it so this foundation also behaves safely elsewhere.
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors FORCE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients FORCE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability FORCE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members FORCE ROW LEVEL SECURITY;

-- Clear any privileges supplied by defaults and leave access deny-by-default
-- until the dedicated security migration creates the least-privilege grants.
REVOKE ALL PRIVILEGES ON TABLE
  public.doctors,
  public.patients,
  public.availability,
  public.appointments,
  public.staff_members
FROM PUBLIC, anon, authenticated, service_role;
