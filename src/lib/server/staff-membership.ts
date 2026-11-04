import type { StaffRole } from "@/lib/server/admin-validation";
import { parseStaffRole } from "@/lib/server/admin-validation";

export type ClinicMembership = {
  clinicId: string;
  clinicSlug: string;
  clinicName: string;
  timeZone: string;
  role: StaffRole;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 1 || value.length > 80) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Parse only active memberships whose user and clinic IDs match verified rows. */
export function parseClinicMembershipRows(
  verifiedUserId: string,
  value: unknown,
): ClinicMembership[] {
  if (!Array.isArray(value)) return [];

  const memberships: ClinicMembership[] = [];
  for (const candidate of value) {
    if (!isRecord(candidate)) continue;

    const role = parseStaffRole(candidate.role);
    const clinicId = candidate.clinic_id;
    const clinic = candidate.clinic;

    if (
      candidate.user_id !== verifiedUserId ||
      candidate.is_active !== true ||
      typeof clinicId !== "string" ||
      !isRecord(clinic) ||
      clinic.id !== clinicId ||
      clinic.is_active !== true ||
      !role ||
      typeof clinic.slug !== "string" ||
      !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(clinic.slug) ||
      typeof clinic.name !== "string" ||
      clinic.name.trim().length < 1 ||
      clinic.name.length > 120 ||
      !isValidTimeZone(clinic.time_zone)
    ) {
      continue;
    }

    memberships.push({
      clinicId,
      clinicSlug: clinic.slug,
      clinicName: clinic.name.trim(),
      timeZone: clinic.time_zone,
      role,
    });
  }

  return memberships.sort((first, second) =>
    first.clinicName.localeCompare(second.clinicName, "en"),
  );
}
