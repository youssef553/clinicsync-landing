-- Updating an expired request to cancelled must leave the definer owner able to
-- see the resulting tuple under RLS. This remains limited to expired requests
-- that are already cancelled; the owner still has no patient_id SELECT grant.
CREATE POLICY appointments_fn_owner_read_expired_cancellations
  ON public.appointments FOR SELECT TO clinicsync_fn_owner
  USING (
    status = 'cancelled'
    AND expires_at IS NOT NULL
    AND expires_at <= pg_catalog.clock_timestamp()
  );
