import "server-only";

import {
  canTransitionAppointment,
  isUuid,
  parseAppointmentStatus,
  validateAvailabilityInput,
  validateDoctorInput,
  intervalsOverlap,
  type AppointmentStatus,
} from "@/lib/server/admin-validation";
import { requireClinicStaff } from "@/lib/server/staff-auth";

export type MutationCode =
  | "invalid"
  | "forbidden"
  | "not-found"
  | "expired"
  | "conflict"
  | "unavailable";

export type MutationResult =
  | { ok: true; id?: string }
  | { ok: false; code: MutationCode };

function databaseErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("code" in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function availabilityMutationError(error: unknown): MutationResult {
  switch (databaseErrorCode(error)) {
    case "23P01":
    case "P0001":
      return { ok: false, code: "conflict" };
    case "42501":
      return { ok: false, code: "forbidden" };
    case "23503":
    case "P0002":
      return { ok: false, code: "not-found" };
    default:
      return { ok: false, code: "unavailable" };
  }
}

function doctorMutationError(error: unknown): MutationResult {
  switch (databaseErrorCode(error)) {
    case "22023":
      return { ok: false, code: "invalid" };
    case "42501":
      return { ok: false, code: "forbidden" };
    case "P0002":
      return { ok: false, code: "not-found" };
    default:
      return { ok: false, code: "unavailable" };
  }
}

function asId(value: unknown): string | null {
  return typeof value === "string" && isUuid(value) ? value.toLowerCase() : null;
}

export async function updateAppointmentStatus(
  clinicSlug: string,
  appointmentIdValue: unknown,
  newStatusValue: unknown,
): Promise<MutationResult> {
  const context = await requireClinicStaff(
    clinicSlug,
    `/admin/${clinicSlug}/appointments`,
  );
  const appointmentId = asId(appointmentIdValue);
  const newStatus = parseAppointmentStatus(newStatusValue);
  if (!appointmentId || !newStatus) return { ok: false, code: "invalid" };

  const { data: existing, error: readError } = await context.supabase
    .from("appointments")
    .select("id, status, expires_at")
    .eq("clinic_id", context.clinicId)
    .eq("id", appointmentId)
    .maybeSingle();
  if (readError) return { ok: false, code: "unavailable" };
  if (!existing) return { ok: false, code: "not-found" };

  const currentStatus = parseAppointmentStatus(existing.status);
  if (!currentStatus || !canTransitionAppointment(currentStatus, newStatus)) {
    return { ok: false, code: "conflict" };
  }

  if (
    currentStatus === "requested" &&
    newStatus === "confirmed" &&
    (typeof existing.expires_at !== "string" || Date.parse(existing.expires_at) <= Date.now())
  ) {
    return { ok: false, code: "expired" };
  }

  const { data: updated, error: updateError } = await context.supabase
    .from("appointments")
    .update({ status: newStatus })
    .eq("clinic_id", context.clinicId)
    .eq("id", appointmentId)
    .eq("status", currentStatus)
    .select("id")
    .maybeSingle();
  if (updateError) {
    return databaseErrorCode(updateError) === "P0001"
      ? { ok: false, code: "expired" }
      : { ok: false, code: "unavailable" };
  }
  if (!updated) return { ok: false, code: "conflict" };

  return { ok: true, id: appointmentId };
}

export async function createDoctor(
  clinicSlug: string,
  input: { name: unknown; specialty: unknown },
): Promise<MutationResult> {
  const context = await requireClinicStaff(clinicSlug, `/admin/${clinicSlug}/doctors`);
  if (context.role !== "admin") return { ok: false, code: "forbidden" };
  const validated = validateDoctorInput(input);
  if (!validated.ok) return { ok: false, code: "invalid" };

  const { data, error } = await context.supabase.rpc("create_clinic_doctor", {
    p_clinic_id: context.clinicId,
    p_name: validated.value.name,
    p_specialty: validated.value.specialty,
  });
  if (error) return doctorMutationError(error);
  const id = asId(data);
  if (!id) return { ok: false, code: "unavailable" };
  return { ok: true, id };
}

export async function updateDoctor(
  clinicSlug: string,
  doctorIdValue: unknown,
  input: { name: unknown; specialty: unknown; isActive: unknown },
): Promise<MutationResult> {
  const context = await requireClinicStaff(
    clinicSlug,
    `/admin/${clinicSlug}/doctors`,
  );
  if (context.role !== "admin") return { ok: false, code: "forbidden" };
  const doctorId = asId(doctorIdValue);
  const validated = validateDoctorInput(input);
  if (!doctorId || !validated.ok) return { ok: false, code: "invalid" };

  const { data, error } = await context.supabase.rpc("update_clinic_doctor", {
    p_clinic_id: context.clinicId,
    p_doctor_id: doctorId,
    p_name: validated.value.name,
    p_specialty: validated.value.specialty,
    p_is_active: validated.value.isActive,
  });
  if (error) return doctorMutationError(error);
  const id = asId(data);
  if (!id) return { ok: false, code: "unavailable" };
  return { ok: true, id };
}

async function doctorExistsInClinic(
  context: Awaited<ReturnType<typeof requireClinicStaff>>,
  doctorId: string,
): Promise<boolean> {
  const { data, error } = await context.supabase
    .from("doctors")
    .select("id")
    .eq("clinic_id", context.clinicId)
    .eq("id", doctorId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

export async function createAvailability(
  clinicSlug: string,
  input: {
    doctorId: unknown;
    dayOfWeek: unknown;
    startTime: unknown;
    endTime: unknown;
    slotDurationMinutes: unknown;
    isActive?: unknown;
  },
): Promise<MutationResult> {
  const context = await requireClinicStaff(clinicSlug, `/admin/${clinicSlug}/availability`);
  if (context.role !== "admin") return { ok: false, code: "forbidden" };

  const validated = validateAvailabilityInput({ clinicSlug, ...input });
  if (!validated.ok) return { ok: false, code: "invalid" };
  if (!(await doctorExistsInClinic(context, validated.value.doctorId))) {
    return { ok: false, code: "not-found" };
  }

  if (validated.value.isActive) {
    const { data: rows, error } = await context.supabase
      .from("availability")
      .select("id, start_time, end_time")
      .eq("clinic_id", context.clinicId)
      .eq("doctor_id", validated.value.doctorId)
      .eq("day_of_week", validated.value.dayOfWeek)
      .eq("is_active", true);
    if (error) return { ok: false, code: "unavailable" };
    const overlap = (rows ?? []).some((row) =>
      intervalsOverlap(
        validated.value.startTime,
        validated.value.endTime,
        String(row.start_time),
        String(row.end_time),
      ),
    );
    if (overlap) return { ok: false, code: "conflict" };
  }

  const { data, error } = await context.supabase.rpc("create_clinic_availability", {
    p_clinic_id: context.clinicId,
    p_doctor_id: validated.value.doctorId,
    p_day_of_week: validated.value.dayOfWeek,
    p_start_time: validated.value.startTime,
    p_end_time: validated.value.endTime,
    p_slot_duration_minutes: validated.value.slotDurationMinutes,
    p_is_active: validated.value.isActive,
  });
  if (error) return availabilityMutationError(error);
  const id = asId(data);
  if (!id) return { ok: false, code: "unavailable" };
  return { ok: true, id };
}

export async function updateAvailability(
  clinicSlug: string,
  availabilityIdValue: unknown,
  input: {
    doctorId: unknown;
    dayOfWeek: unknown;
    startTime: unknown;
    endTime: unknown;
    slotDurationMinutes: unknown;
    isActive?: unknown;
  },
): Promise<MutationResult> {
  const context = await requireClinicStaff(clinicSlug, `/admin/${clinicSlug}/availability`);
  if (context.role !== "admin") return { ok: false, code: "forbidden" };

  const availabilityId = asId(availabilityIdValue);
  const validated = validateAvailabilityInput({ clinicSlug, ...input });
  if (!availabilityId || !validated.ok) return { ok: false, code: "invalid" };
  if (!(await doctorExistsInClinic(context, validated.value.doctorId))) {
    return { ok: false, code: "not-found" };
  }

  if (validated.value.isActive) {
    const { data: rows, error } = await context.supabase
      .from("availability")
      .select("id, start_time, end_time")
      .eq("clinic_id", context.clinicId)
      .eq("doctor_id", validated.value.doctorId)
      .eq("day_of_week", validated.value.dayOfWeek)
      .eq("is_active", true);
    if (error) return { ok: false, code: "unavailable" };
    const overlap = (rows ?? []).some((row) => {
      if (row.id === availabilityId) return false;
      return intervalsOverlap(
        validated.value.startTime,
        validated.value.endTime,
        String(row.start_time),
        String(row.end_time),
      );
    });
    if (overlap) return { ok: false, code: "conflict" };
  }

  const { data, error } = await context.supabase.rpc("update_clinic_availability", {
    p_clinic_id: context.clinicId,
    p_availability_id: availabilityId,
    p_doctor_id: validated.value.doctorId,
    p_day_of_week: validated.value.dayOfWeek,
    p_start_time: validated.value.startTime,
    p_end_time: validated.value.endTime,
    p_slot_duration_minutes: validated.value.slotDurationMinutes,
    p_is_active: validated.value.isActive,
  });
  if (error) return availabilityMutationError(error);
  const id = asId(data);
  if (!id) return { ok: false, code: "unavailable" };
  return { ok: true, id };
}

export async function removeAvailability(
  clinicSlug: string,
  availabilityIdValue: unknown,
): Promise<MutationResult> {
  const context = await requireClinicStaff(clinicSlug, `/admin/${clinicSlug}/availability`);
  if (context.role !== "admin") return { ok: false, code: "forbidden" };
  const availabilityId = asId(availabilityIdValue);
  if (!availabilityId) return { ok: false, code: "invalid" };

  const { data, error } = await context.supabase.rpc("delete_clinic_availability", {
    p_clinic_id: context.clinicId,
    p_availability_id: availabilityId,
  });
  if (error) return availabilityMutationError(error);
  const id = asId(data);
  if (!id) return { ok: false, code: "unavailable" };
  return { ok: true, id };
}

export function parseStatusInput(value: unknown): AppointmentStatus | null {
  return parseAppointmentStatus(value);
}
