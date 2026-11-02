-- pg_cron is available and preloaded on clinicsync-dev. Install it only after
-- verifying the target database settings; this migration deliberately creates
-- no scheduled job so installed signatures and run-as behavior can be inspected.
CREATE EXTENSION IF NOT EXISTS pg_cron;
