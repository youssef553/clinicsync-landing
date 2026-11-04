-- pg_cron 1.6.4 on clinicsync-dev has explicit PUBLIC ACLs on scheduler
-- functions/metadata, but the extension objects are owned by supabase_admin.
-- The project postgres migration role cannot revoke ACL entries granted by that
-- owner, so these statements are best-effort only and must be followed by a
-- catalog audit. The current cron schema grants no USAGE to application roles.
REVOKE ALL PRIVILEGES ON SCHEMA cron
  FROM PUBLIC, anon, authenticated, service_role, booking_api, clinicsync_fn_owner, clinicsync_cron_runner;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron
  FROM PUBLIC, anon, authenticated, service_role, booking_api, clinicsync_fn_owner, clinicsync_cron_runner;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA cron
  FROM PUBLIC, anon, authenticated, service_role, booking_api, clinicsync_fn_owner, clinicsync_cron_runner;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA cron
  FROM PUBLIC, anon, authenticated, service_role, booking_api, clinicsync_fn_owner, clinicsync_cron_runner;
