import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20261103100000_add_clinic_tenancy.sql", import.meta.url),
  "utf8",
);
const adminData = readFileSync(
  new URL("../src/lib/server/admin-data.ts", import.meta.url),
  "utf8",
);
const adminMutations = readFileSync(
  new URL("../src/lib/server/admin-mutations.ts", import.meta.url),
  "utf8",
);
const technicalDebt = readFileSync(
  new URL("../docs/technical-debt.md", import.meta.url),
  "utf8",
);
const doctorDetailPage = readFileSync(
  new URL("../src/app/admin/[clinicSlug]/doctors/[id]/page.tsx", import.meta.url),
  "utf8",
);

function sqlSectionFrom(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `missing SQL marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `missing SQL marker after ${startMarker}: ${endMarker}`);
  return source.slice(start, end);
}

function sqlSection(startMarker: string, endMarker: string): string {
  return sqlSectionFrom(migration, startMarker, endMarker);
}

function policy(name: string): string {
  const marker = `CREATE POLICY ${name}`;
  const start = migration.indexOf(marker);
  assert.notEqual(start, -1, `missing RLS policy: ${name}`);
  const end = migration.indexOf(";", start);
  assert.notEqual(end, -1, `unterminated RLS policy: ${name}`);
  return migration.slice(start, end + 1);
}

test("tenant membership helper binds the verified auth user to the requested active clinic", () => {
  const helper = sqlSection(
    "CREATE FUNCTION private.current_staff_role(p_clinic_id uuid)",
    "$function$;",
  );
  assert.match(helper, /SECURITY DEFINER/);
  assert.match(helper, /sm\.user_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(helper, /sm\.clinic_id = p_clinic_id/);
  assert.match(helper, /sm\.is_active/);
  assert.match(helper, /c\.is_active/);
  assert.doesNotMatch(helper, /raw_user_meta_data|user_metadata|app_metadata/);
});

test("clinic-sensitive staff policies consistently authorize against the row's clinic", () => {
  for (const name of [
    "doctors_member_read",
    "doctors_admin_delete",
    "doctors_fn_owner_admin_manage",
    "availability_member_read",
    "patients_staff_read",
    "appointments_staff_read",
    "appointments_staff_status_update",
  ]) {
    assert.match(policy(name), /private\.current_staff_role\(clinic_id\)/, name);
  }
  assert.match(policy("availability_fn_owner_admin_manage"), /private\.current_staff_role\(clinic_id\)/);
  assert.match(policy("staff_members_fn_owner_insert"), /private\.current_staff_role\(clinic_id\)/);
  assert.match(policy("staff_members_fn_owner_update_others"), /private\.current_staff_role\(clinic_id\)/);
  assert.doesNotMatch(migration, /CREATE POLICY staff_members_admin_(?:insert|update)/);
  assert.doesNotMatch(migration, /CREATE POLICY availability_admin_manage/);
});

test("foreign keys prevent cross-clinic doctor, patient, and schedule references", () => {
  assert.match(migration, /UNIQUE \(clinic_id, id\)/);
  const sameClinicDoctorForeignKeys = migration.match(
    /FOREIGN KEY \(clinic_id, doctor_id\) REFERENCES public\.doctors\(clinic_id, id\)/g,
  ) ?? [];
  assert.equal(sameClinicDoctorForeignKeys.length, 2);
  assert.match(
    migration,
    /FOREIGN KEY \(clinic_id, patient_id\) REFERENCES public\.patients\(clinic_id, id\)/,
  );
});

test("database exclusion constraints remain tenant-aware for schedule and appointment conflicts", () => {
  const availabilityConstraint = sqlSection(
    "ADD CONSTRAINT availability_no_overlapping_active_windows",
    ";\n\nALTER TABLE public.appointments",
  );
  assert.match(availabilityConstraint, /EXCLUDE USING gist/);
  assert.match(availabilityConstraint, /clinic_id extensions\.gist_uuid_ops WITH =/);
  assert.match(availabilityConstraint, /doctor_id extensions\.gist_uuid_ops WITH =/);
  assert.match(availabilityConstraint, /\(pg_catalog\.tsrange\([\s\S]+WITH &&/);

  const appointmentConstraint = sqlSection(
    "ADD CONSTRAINT appointments_no_overlapping_active_times",
    ";\n\nDROP INDEX public\.availability_doctor_day_active_idx",
  );
  assert.match(appointmentConstraint, /EXCLUDE USING gist/);
  assert.match(appointmentConstraint, /clinic_id extensions\.gist_uuid_ops WITH =/);
  assert.match(appointmentConstraint, /doctor_id extensions\.gist_uuid_ops WITH =/);
  assert.match(appointmentConstraint, /pg_catalog\.tstzrange\(starts_at, ends_at, '\[\)'\)/);
  assert.match(appointmentConstraint, /status IN \('requested', 'confirmed'\)/);
});

test("public booking resolves a clinic from an active doctor and inserts same-clinic rows", () => {
  const booking = sqlSection(
    "CREATE OR REPLACE FUNCTION private.book_public_appointment(",
    "$function$;",
  );
  assert.match(booking, /SELECT d\.clinic_id/);
  assert.match(booking, /JOIN public\.clinics AS c ON c\.id = d\.clinic_id/);
  assert.match(booking, /AND d\.is_active/);
  assert.match(booking, /AND c\.is_active/);
  assert.match(booking, /WHERE a\.clinic_id = v_clinic_id/);
  assert.match(booking, /INSERT INTO public\.patients \(id, clinic_id, full_name, phone_e164\)/);
  assert.match(booking, /clinic_id,[\s\S]+?patient_id,[\s\S]+?doctor_id/);
  assert.match(booking, /v_clinic_id,[\s\S]+?v_patient_id,[\s\S]+?p_doctor_id/);
});

test("doctor eligibility mutations and booking share a clinic-scoped lock protocol", () => {
  const lockAllDoctorDays = sqlSection(
    "CREATE FUNCTION private.lock_doctor_schedule(",
    "$function$;",
  );
  assert.match(lockAllDoctorDays, /generate_series\(1, 7\)/);
  assert.match(lockAllDoctorDays, /ORDER BY lock_key/);
  assert.match(lockAllDoctorDays, /pg_advisory_xact_lock\(v_lock_key\)/);
  assert.match(lockAllDoctorDays, /schedule_lock_key\(\s*p_clinic_id, p_doctor_id/);

  const createDoctorRpc = sqlSection("CREATE FUNCTION public.create_clinic_doctor(", "$function$;");
  const updateDoctorRpc = sqlSection("CREATE FUNCTION public.update_clinic_doctor(", "$function$;");
  for (const doctorRpc of [createDoctorRpc, updateDoctorRpc]) {
    const membershipLock = doctorRpc.indexOf("membership_lock_key(p_clinic_id)");
    const scheduleLocks = doctorRpc.indexOf("lock_doctor_schedule(p_clinic_id");
    const postLockAuthorization = doctorRpc.indexOf("current_staff_role(p_clinic_id)", membershipLock);
    assert.ok(membershipLock >= 0 && scheduleLocks > membershipLock);
    assert.ok(postLockAuthorization > membershipLock);
    assert.match(doctorRpc, /current_staff_role\(p_clinic_id\)[\s\S]+?IS DISTINCT FROM 'admin'/);
  }
  assert.ok(
    createDoctorRpc.indexOf("lock_doctor_schedule(p_clinic_id") <
      createDoctorRpc.indexOf("INSERT INTO public.doctors"),
  );
  assert.ok(
    updateDoctorRpc.indexOf("lock_doctor_schedule(p_clinic_id") <
      updateDoctorRpc.indexOf("UPDATE public.doctors"),
  );
  assert.match(updateDoctorRpc, /WHERE d\.clinic_id = p_clinic_id[\s\S]+?AND d\.id = p_doctor_id/);
  assert.doesNotMatch(updateDoctorRpc, /UPDATE public\.appointments|DELETE FROM public\.appointments/);

  const booking = sqlSection(
    "CREATE OR REPLACE FUNCTION private.book_public_appointment(",
    "$function$;",
  );
  const sharedLock = booking.indexOf("pg_advisory_xact_lock_shared");
  const activeRecheck = booking.indexOf("PERFORM 1", sharedLock);
  const scheduleRead = booking.indexOf("FROM public.availability", activeRecheck);
  assert.ok(sharedLock >= 0 && activeRecheck > sharedLock && scheduleRead > activeRecheck);
  const recheck = booking.slice(activeRecheck, scheduleRead);
  assert.match(recheck, /d\.clinic_id = v_clinic_id/);
  assert.match(recheck, /d\.is_active/);
  assert.match(recheck, /c\.is_active/);
  assert.match(recheck, /doctor_unavailable/);

  const createMutation = adminMutations.slice(
    adminMutations.indexOf("export async function createDoctor("),
    adminMutations.indexOf("export async function updateDoctor("),
  );
  const updateMutation = adminMutations.slice(
    adminMutations.indexOf("export async function updateDoctor("),
    adminMutations.indexOf("async function doctorExistsInClinic("),
  );
  assert.match(createMutation, /rpc\("create_clinic_doctor"/);
  assert.match(updateMutation, /rpc\("update_clinic_doctor"/);
  assert.doesNotMatch(createMutation, /\.from\("doctors"\)/);
  assert.doesNotMatch(updateMutation, /\.from\("doctors"\)/);
  assert.match(migration, /REVOKE INSERT \(id, clinic_id, name, specialty, is_active\)[\s\S]+?ON TABLE public\.doctors/);
  assert.doesNotMatch(migration, /GRANT (?:INSERT|UPDATE)[^;]*ON TABLE public\.doctors TO authenticated/);
  assert.match(migration, /GRANT DELETE ON TABLE public\.doctors TO authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.create_clinic_doctor[\s\S]+?TO authenticated/);
  assert.match(doctorDetailPage, /Inactive doctors are not offered for new public bookings\.[\s\S]+?remain unchanged/);
});

test("booking and schedule writes serialize on the Cairo-local schedule key without cancelling appointments", () => {
  const booking = sqlSection(
    "CREATE OR REPLACE FUNCTION private.book_public_appointment(",
    "$function$;",
  );
  const sharedLock = booking.indexOf("pg_advisory_xact_lock_shared");
  const scheduleRead = booking.indexOf("FROM public.availability", sharedLock);
  assert.ok(sharedLock >= 0 && scheduleRead > sharedLock);
  assert.match(booking, /schedule_lock_key\(v_clinic_id, p_doctor_id, v_day_of_week\)/);

  const create = sqlSection("CREATE FUNCTION public.create_clinic_availability(", "$function$;");
  assert.match(create, /pg_advisory_xact_lock\([\s\S]+schedule_lock_key/);
  const update = sqlSection("CREATE FUNCTION public.update_clinic_availability(", "$function$;");
  assert.match(update, /availability_row_lock_key\(p_availability_id\)/);
  assert.match(update, /IF v_old_lock = v_new_lock/);
  assert.match(update, /ELSIF v_old_lock < v_new_lock/);
  assert.match(update, /raise_if_future_appointments_in_schedule_window/);
  const remove = sqlSection("CREATE FUNCTION public.delete_clinic_availability(", "$function$;");
  assert.match(remove, /availability_row_lock_key\(p_availability_id\)/);
  assert.match(remove, /raise_if_future_appointments_in_schedule_window/);
  assert.match(migration, /availability_has_future_active_appointments/);
  assert.match(migration, /ADD CONSTRAINT appointments_no_overlapping_active_times[\s\S]+?EXCLUDE USING gist/);
  assert.doesNotMatch(
    migration,
    /GRANT (?:INSERT|UPDATE|DELETE)[^;]*ON TABLE public\.availability TO authenticated/,
  );
  for (const rpc of [
    "create_clinic_availability",
    "update_clinic_availability",
    "delete_clinic_availability",
  ]) {
    assert.match(adminMutations, new RegExp(`rpc\\("${rpc}"`));
  }
  assert.doesNotMatch(
    adminMutations,
    /\.from\("availability"\)[\s\S]{0,160}\.(?:insert|update|delete)\(/,
  );
});

test("membership RPC serializes clinic changes and protects the last active admin", () => {
  const membership = sqlSection("CREATE FUNCTION public.set_clinic_member(", "$function$;");
  assert.match(membership, /private\.current_staff_role\(p_clinic_id\)/);
  assert.match(membership, /pg_advisory_xact_lock\([\s\S]+membership_lock_key\(p_clinic_id\)/);
  assert.match(membership, /Recheck after waiting/);
  assert.match(membership, /SELECT pg_catalog\.count\(\*[\s\S]+sm\.role = 'admin'[\s\S]+sm\.is_active/);
  assert.match(membership, /clinic_must_retain_an_active_admin/);
  assert.match(membership, /cannot_change_own_membership/);
  assert.doesNotMatch(migration, /GRANT INSERT[^;]*ON TABLE public\.staff_members TO authenticated/);
  assert.doesNotMatch(migration, /GRANT UPDATE[^;]*ON TABLE public\.staff_members TO authenticated/);
  assert.match(migration, /Bootstrap of the first admin remains operator-only/);
});

test("Auth-user deletion is restricted while any protected clinic membership exists", () => {
  const authMembershipForeignKey = sqlSection(
    "DROP CONSTRAINT staff_members_user_id_fkey;",
    "ADD CONSTRAINT staff_members_clinic_id_fkey",
  );
  assert.match(authMembershipForeignKey, /ADD CONSTRAINT staff_members_user_id_fkey/);
  assert.match(authMembershipForeignKey, /FOREIGN KEY \(user_id\) REFERENCES auth\.users\(id\)/);
  assert.match(authMembershipForeignKey, /ON UPDATE RESTRICT ON DELETE RESTRICT/);
  assert.doesNotMatch(authMembershipForeignKey, /ON DELETE CASCADE/);
  assert.doesNotMatch(migration, /GRANT DELETE ON TABLE public\.staff_members TO authenticated/);
  assert.match(technicalDebt, /Any membership row, including inactive memberships, blocks Auth-user deletion/);
});

test("patient phone access is masked behind clinic-scoped RPCs", () => {
  assert.match(
    migration,
    /GRANT SELECT \(id, clinic_id, full_name, created_at\) ON TABLE public\.patients TO authenticated;/,
  );
  assert.doesNotMatch(migration, /GRANT SELECT[^;]*phone_e164[^;]*TO authenticated/);
  assert.match(
    migration,
    /REVOKE SELECT \(id, clinic_id, full_name, phone_e164, created_at\)[\s\S]+?FROM PUBLIC, anon, authenticated/,
  );
  assert.match(migration, /CREATE FUNCTION public\.search_clinic_patients\([\s\S]+?masked_phone text/);
  assert.match(migration, /CREATE FUNCTION public\.get_clinic_patient\([\s\S]+?masked_phone text/);
  assert.match(migration, /private\.current_staff_role\(p_clinic_id\)\) IN \('admin', 'staff'\)/);
  assert.doesNotMatch(adminData, /phone_e164/);
  assert.match(adminData, /rpc\("search_clinic_patients"/);
  assert.match(adminData, /rpc\("get_clinic_patient"/);
  assert.doesNotMatch(adminData, /\.from\("patients"\)/);
});

test("expiry runner remains restricted and the migration does not create a recurring job", () => {
  const expiryMigration = readFileSync(
    new URL("../supabase/migrations/20261102193421_booking_and_expiration_logic.sql", import.meta.url),
    "utf8",
  );
  const expiry = sqlSectionFrom(
    expiryMigration,
    "CREATE OR REPLACE FUNCTION private.expire_pending_appointments()",
    "$function$;",
  );
  assert.match(expiry, /LIMIT 500/);
  assert.match(expiry, /FOR UPDATE SKIP LOCKED/);
  assert.match(expiry, /status = 'requested'/);
  assert.match(expiryMigration, /GRANT EXECUTE ON FUNCTION private\.expire_pending_appointments\(\)[\s\S]+?TO clinicsync_cron_runner/);
  assert.doesNotMatch(migration, /cron\.schedule(?:_in_database)?\s*\(/i);
  assert.match(technicalDebt, /No recurring ClinicSync job exists/);
  assert.match(technicalDebt, /idempotent/);
});

test("tenant migration refuses to guess clinic assignments for existing rows", () => {
  const guard = sqlSection("DO $tenant_data_guard$", "$tenant_data_guard$;");
  for (const table of ["staff_members", "doctors", "patients", "availability", "appointments"]) {
    assert.match(guard, new RegExp(`FROM public\\.${table}\\s+LIMIT 1`));
  }
  assert.match(guard, /explicit clinic mapping/);
});
