import assert from "node:assert/strict";
import test from "node:test";
import { parseClinicMembershipRows } from "../src/lib/server/staff-membership";

const USER_ID = "a1000000-0000-4000-8000-000000000001";
const OTHER_USER_ID = "b1000000-0000-4000-8000-000000000002";

function membership(overrides: Record<string, unknown> = {}) {
  return {
    user_id: USER_ID,
    clinic_id: "c1000000-0000-4000-8000-000000000003",
    role: "staff",
    is_active: true,
    clinic: {
      id: "c1000000-0000-4000-8000-000000000003",
      slug: "assuit-medical",
      name: "Assiut Medical",
      time_zone: "Africa/Cairo",
      is_active: true,
    },
    ...overrides,
  };
}

test("membership parser accepts active user-scoped roles and supports multiple clinics", () => {
  const rows = [
    membership(),
    membership({
      clinic_id: "d1000000-0000-4000-8000-000000000004",
      role: "admin",
      clinic: {
        id: "d1000000-0000-4000-8000-000000000004",
        slug: "nile-care",
        name: "Nile Care",
        time_zone: "Africa/Cairo",
        is_active: true,
      },
    }),
  ];
  const parsed = parseClinicMembershipRows(USER_ID, rows);
  assert.equal(parsed.length, 2);
  assert.deepEqual(parsed.map((item) => item.clinicSlug), ["assuit-medical", "nile-care"]);
  assert.equal(parsed[1]?.role, "admin");
});

test("membership parser rejects forged, inactive, malformed, and mismatched memberships", () => {
  const valid = membership();
  const invalidRows = [
    { ...valid, user_id: OTHER_USER_ID },
    { ...valid, is_active: false },
    { ...valid, role: "owner" },
    { ...valid, clinic_id: "d1000000-0000-4000-8000-000000000004" },
    { ...valid, clinic: { ...(valid.clinic as Record<string, unknown>), is_active: false } },
    { ...valid, clinic: { ...(valid.clinic as Record<string, unknown>), slug: "../other" } },
    { ...valid, clinic: { ...(valid.clinic as Record<string, unknown>), time_zone: "Not/A_Zone" } },
  ];
  assert.deepEqual(parseClinicMembershipRows(USER_ID, invalidRows), []);
});

test("membership parser fails closed for unexpected result shapes", () => {
  assert.deepEqual(parseClinicMembershipRows(USER_ID, null), []);
  assert.deepEqual(parseClinicMembershipRows(USER_ID, {}), []);
  assert.deepEqual(parseClinicMembershipRows(USER_ID, [null, "untrusted", 42]), []);
});
