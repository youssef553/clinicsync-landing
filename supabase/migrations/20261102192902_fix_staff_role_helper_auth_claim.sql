-- Use the verified JWT subject claim directly so the definer role does not need
-- privileges on Supabase's protected auth schema. This is not user_metadata.
GRANT clinicsync_fn_owner TO postgres;
SET ROLE clinicsync_fn_owner;

CREATE OR REPLACE FUNCTION private.current_staff_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT sm.role
  FROM public.staff_members AS sm
  WHERE sm.user_id = NULLIF(
    COALESCE(
      NULLIF(pg_catalog.current_setting('request.jwt.claim.sub', true), ''),
      NULLIF(pg_catalog.current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    ),
    ''
  )::uuid
    AND sm.is_active
  LIMIT 1
$function$;

COMMENT ON FUNCTION private.current_staff_role() IS
  'SECURITY DEFINER: authenticated callers only; owner clinicsync_fn_owner; reads user_id/role/is_active under staff_members_fn_owner_read RLS; uses only the verified JWT sub claim, never user_metadata.';

RESET ROLE;
REVOKE clinicsync_fn_owner FROM postgres;
