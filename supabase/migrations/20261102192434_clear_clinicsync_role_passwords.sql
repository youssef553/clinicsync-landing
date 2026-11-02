-- Ensure the new application roles have no migration-supplied password verifier.
-- A private password will be provisioned separately only when a trusted server is ready.
ALTER ROLE booking_api PASSWORD NULL;
ALTER ROLE clinicsync_fn_owner PASSWORD NULL;
ALTER ROLE clinicsync_cron_runner PASSWORD NULL;
