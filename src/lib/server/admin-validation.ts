export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const CLINIC_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export type AppointmentStatus = "requested" | "confirmed" | "cancelled" | "completed";
export type StaffRole = "admin" | "staff";

const APPOINTMENT_STATUSES = new Set<AppointmentStatus>([
  "requested",
  "confirmed",
  "cancelled",
  "completed",
]);
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;
const TIME_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function isClinicSlug(value: string): boolean {
  return CLINIC_SLUG_PATTERN.test(value);
}

export function parseStaffRole(value: unknown): StaffRole | null {
  return value === "admin" || value === "staff" ? value : null;
}

export function parseAppointmentStatus(value: unknown): AppointmentStatus | null {
  return typeof value === "string" && APPOINTMENT_STATUSES.has(value as AppointmentStatus)
    ? (value as AppointmentStatus)
    : null;
}

export function canTransitionAppointment(
  from: AppointmentStatus,
  to: AppointmentStatus,
): boolean {
  if (from === "requested") return to === "confirmed" || to === "cancelled";
  if (from === "confirmed") return to === "cancelled" || to === "completed";
  return false;
}

export type DoctorInputResult =
  | { ok: true; value: { name: string; specialty: string; isActive: boolean } }
  | { ok: false };

export function validateDoctorInput(value: {
  name: unknown;
  specialty: unknown;
  isActive?: unknown;
}): DoctorInputResult {
  if (typeof value.name !== "string" || typeof value.specialty !== "string") {
    return { ok: false };
  }

  const name = value.name.trim();
  const specialty = value.specialty.trim();
  const isActive = value.isActive === undefined ? true : value.isActive === true;

  if (
    Array.from(name).length < 1 ||
    Array.from(name).length > 120 ||
    Array.from(specialty).length < 1 ||
    Array.from(specialty).length > 120 ||
    CONTROL_CHARACTERS.test(value.name) ||
    CONTROL_CHARACTERS.test(value.specialty) ||
    (value.isActive !== undefined && typeof value.isActive !== "boolean")
  ) {
    return { ok: false };
  }

  return { ok: true, value: { name, specialty, isActive } };
}

export type AvailabilityInput = {
  clinicSlug: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  isActive: boolean;
};

export type AvailabilityInputResult =
  | { ok: true; value: AvailabilityInput }
  | { ok: false };

function parseTimeToMinutes(value: string): number | null {
  const match = TIME_PATTERN.exec(value);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = match[3] === undefined ? 0 : Number(match[3]);
  if (hour > 23 || minute > 59 || second !== 0) return null;
  return hour * 60 + minute;
}

export function normalizeTimeForDatabase(value: string): string | null {
  const minutes = parseTimeToMinutes(value);
  if (minutes === null) return null;
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  const remainder = String(minutes % 60).padStart(2, "0");
  return `${hours}:${remainder}:00`;
}

export function intervalsOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
): boolean {
  const aStart = parseTimeToMinutes(firstStart);
  const aEnd = parseTimeToMinutes(firstEnd);
  const bStart = parseTimeToMinutes(secondStart);
  const bEnd = parseTimeToMinutes(secondEnd);

  if (aStart === null || aEnd === null || bStart === null || bEnd === null) return true;
  return aStart < bEnd && bStart < aEnd;
}

export function validateAvailabilityInput(value: {
  clinicSlug: unknown;
  doctorId: unknown;
  dayOfWeek: unknown;
  startTime: unknown;
  endTime: unknown;
  slotDurationMinutes: unknown;
  isActive?: unknown;
}): AvailabilityInputResult {
  if (
    typeof value.clinicSlug !== "string" ||
    typeof value.doctorId !== "string" ||
    typeof value.dayOfWeek !== "number" ||
    typeof value.startTime !== "string" ||
    typeof value.endTime !== "string" ||
    typeof value.slotDurationMinutes !== "number"
  ) {
    return { ok: false };
  }

  const startMinutes = parseTimeToMinutes(value.startTime);
  const endMinutes = parseTimeToMinutes(value.endTime);
  const isActive = value.isActive === undefined ? true : value.isActive === true;

  if (
    !isClinicSlug(value.clinicSlug) ||
    !isUuid(value.doctorId) ||
    !Number.isInteger(value.dayOfWeek) ||
    value.dayOfWeek < 1 ||
    value.dayOfWeek > 7 ||
    startMinutes === null ||
    endMinutes === null ||
    startMinutes >= endMinutes ||
    !Number.isInteger(value.slotDurationMinutes) ||
    value.slotDurationMinutes < 5 ||
    value.slotDurationMinutes > 240 ||
    value.slotDurationMinutes % 5 !== 0 ||
    (value.isActive !== undefined && typeof value.isActive !== "boolean")
  ) {
    return { ok: false };
  }

  const startTime = normalizeTimeForDatabase(value.startTime);
  const endTime = normalizeTimeForDatabase(value.endTime);
  if (!startTime || !endTime) return { ok: false };

  return {
    ok: true,
    value: {
      clinicSlug: value.clinicSlug,
      doctorId: value.doctorId.toLowerCase(),
      dayOfWeek: value.dayOfWeek,
      startTime,
      endTime,
      slotDurationMinutes: value.slotDurationMinutes,
      isActive,
    },
  };
}

export function normalizeSearchTerm(value: unknown, maxLength = 80): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return "";
  if (
    Array.from(normalized).length > maxLength ||
    CONTROL_CHARACTERS.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

export function maskPhoneNumber(phone: string): string {
  if (phone.length <= 6) return "••••";
  const lastFour = phone.slice(-4);
  return `••• ••• ${lastFour}`;
}
