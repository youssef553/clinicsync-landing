-- Correct the E.164 check using a bracket expression for a literal plus sign.
-- The table is currently empty; no existing values are rewritten or removed.
ALTER TABLE public.patients
  DROP CONSTRAINT patients_phone_e164_format;

ALTER TABLE public.patients
  ADD CONSTRAINT patients_phone_e164_format
  CHECK (phone_e164 ~ '^[+][1-9][0-9]{1,14}$');
