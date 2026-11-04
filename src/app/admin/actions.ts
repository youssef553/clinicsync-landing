"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAvailability,
  createDoctor,
  removeAvailability,
  updateAppointmentStatus,
  updateAvailability,
  updateDoctor,
} from "@/lib/server/admin-mutations";
import { isClinicSlug, isUuid, parseAppointmentStatus } from "@/lib/server/admin-validation";
import { AdminDataError, AdminDataValidationError, getAppointments, searchPatients } from "@/lib/server/admin-data";
import type { AppointmentSearchState, PatientSearchState } from "@/lib/admin-action-state";

function stringValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function booleanValue(value: string): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function doctorNoticePath(clinicSlug: string, code: string): string {
  return `/admin/${clinicSlug}/doctors?notice=${encodeURIComponent(code)}`;
}

function availabilityNoticePath(
  clinicSlug: string,
  code: string,
  doctorId?: string,
): string {
  const query = new URLSearchParams({ notice: code });
  if (doctorId && isUuid(doctorId)) query.set("doctorId", doctorId.toLowerCase());
  return `/admin/${clinicSlug}/availability?${query.toString()}`;
}

export async function updateAppointmentStatusAction(formData: FormData): Promise<void> {
  const clinicSlug = stringValue(formData, "clinicSlug");
  const appointmentId = stringValue(formData, "appointmentId");
  const status = stringValue(formData, "status");
  if (!isClinicSlug(clinicSlug) || !isUuid(appointmentId)) redirect("/admin");

  const result = await updateAppointmentStatus(clinicSlug, appointmentId, status);
  revalidatePath(`/admin/${clinicSlug}`);
  revalidatePath(`/admin/${clinicSlug}/appointments`);
  revalidatePath(`/admin/${clinicSlug}/appointments/${appointmentId}`);
  redirect(
    result.ok
      ? `/admin/${clinicSlug}/appointments/${appointmentId}?notice=status-updated`
      : `/admin/${clinicSlug}/appointments/${appointmentId}?notice=${result.code}`,
  );
}

export async function createDoctorAction(formData: FormData): Promise<void> {
  const clinicSlug = stringValue(formData, "clinicSlug");
  if (!isClinicSlug(clinicSlug)) redirect("/admin");

  const result = await createDoctor(clinicSlug, {
    name: stringValue(formData, "name"),
    specialty: stringValue(formData, "specialty"),
  });
  revalidatePath(`/admin/${clinicSlug}/doctors`);
  redirect(doctorNoticePath(clinicSlug, result.ok ? "doctor-created" : result.code));
}

export async function updateDoctorAction(formData: FormData): Promise<void> {
  const clinicSlug = stringValue(formData, "clinicSlug");
  const doctorId = stringValue(formData, "doctorId");
  const isActive = booleanValue(stringValue(formData, "isActive"));
  if (!isClinicSlug(clinicSlug) || !isUuid(doctorId)) redirect("/admin");

  const result = await updateDoctor(clinicSlug, doctorId, {
    name: stringValue(formData, "name"),
    specialty: stringValue(formData, "specialty"),
    isActive,
  });
  revalidatePath(`/admin/${clinicSlug}/doctors`);
  revalidatePath(`/admin/${clinicSlug}/doctors/${doctorId}`);
  redirect(
    result.ok
      ? `/admin/${clinicSlug}/doctors/${doctorId}?notice=doctor-updated`
      : `/admin/${clinicSlug}/doctors/${doctorId}?notice=${result.code}`,
  );
}

export async function createAvailabilityAction(formData: FormData): Promise<void> {
  const clinicSlug = stringValue(formData, "clinicSlug");
  const doctorId = stringValue(formData, "doctorId");
  if (!isClinicSlug(clinicSlug)) redirect("/admin");
  const isActive = booleanValue(stringValue(formData, "isActive"));
  if (isActive === null) redirect(availabilityNoticePath(clinicSlug, "invalid", doctorId));

  const result = await createAvailability(clinicSlug, {
    doctorId,
    dayOfWeek: Number(stringValue(formData, "dayOfWeek")),
    startTime: stringValue(formData, "startTime"),
    endTime: stringValue(formData, "endTime"),
    slotDurationMinutes: Number(stringValue(formData, "slotDurationMinutes")),
    isActive,
  });
  revalidatePath(`/admin/${clinicSlug}/availability`);
  revalidatePath(`/admin/${clinicSlug}/doctors`);
  redirect(availabilityNoticePath(clinicSlug, result.ok ? "availability-created" : result.code, doctorId));
}

export async function updateAvailabilityAction(formData: FormData): Promise<void> {
  const clinicSlug = stringValue(formData, "clinicSlug");
  const availabilityId = stringValue(formData, "availabilityId");
  const doctorId = stringValue(formData, "doctorId");
  if (!isClinicSlug(clinicSlug) || !isUuid(availabilityId)) redirect("/admin");
  const isActive = booleanValue(stringValue(formData, "isActive"));
  if (isActive === null) redirect(availabilityNoticePath(clinicSlug, "invalid", doctorId));

  const result = await updateAvailability(clinicSlug, availabilityId, {
    doctorId,
    dayOfWeek: Number(stringValue(formData, "dayOfWeek")),
    startTime: stringValue(formData, "startTime"),
    endTime: stringValue(formData, "endTime"),
    slotDurationMinutes: Number(stringValue(formData, "slotDurationMinutes")),
    isActive,
  });
  revalidatePath(`/admin/${clinicSlug}/availability`);
  revalidatePath(`/admin/${clinicSlug}/doctors`);
  redirect(availabilityNoticePath(clinicSlug, result.ok ? "availability-updated" : result.code, doctorId));
}

export async function removeAvailabilityAction(formData: FormData): Promise<void> {
  const clinicSlug = stringValue(formData, "clinicSlug");
  const availabilityId = stringValue(formData, "availabilityId");
  const doctorId = stringValue(formData, "doctorId");
  if (!isClinicSlug(clinicSlug) || !isUuid(availabilityId)) redirect("/admin");

  const result = await removeAvailability(clinicSlug, availabilityId);
  revalidatePath(`/admin/${clinicSlug}/availability`);
  revalidatePath(`/admin/${clinicSlug}/doctors`);
  redirect(availabilityNoticePath(clinicSlug, result.ok ? "availability-removed" : result.code, doctorId));
}

export async function searchAppointmentsAction(formData: FormData): Promise<AppointmentSearchState> {
  const clinicSlug = stringValue(formData, "clinicSlug");
  if (!isClinicSlug(clinicSlug)) return { list: null, error: "invalid" };

  const search = stringValue(formData, "search");
  const date = stringValue(formData, "date");
  const rawStatus = stringValue(formData, "status") || "all";
  const status = rawStatus === "all" ? "all" : parseAppointmentStatus(rawStatus);
  if (!status) return { list: null, error: "invalid" };

  try {
    const list = await getAppointments(clinicSlug, { search, date, status });
    return { list, error: null };
  } catch (error) {
    if (error instanceof AdminDataValidationError) return { list: null, error: "invalid" };
    if (error instanceof AdminDataError) return { list: null, error: "unavailable" };
    throw error;
  }
}

export async function searchPatientsAction(formData: FormData): Promise<PatientSearchState> {
  const clinicSlug = stringValue(formData, "clinicSlug");
  if (!isClinicSlug(clinicSlug)) {
    return { patients: [], timeZone: "Africa/Cairo", hasSearched: false, error: "invalid" };
  }

  const search = stringValue(formData, "search");
  try {
    const result = await searchPatients(clinicSlug, search);
    return {
      patients: result.patients,
      timeZone: result.timeZone,
      hasSearched: true,
      error: null,
    };
  } catch (error) {
    if (error instanceof AdminDataValidationError) {
      return { patients: [], timeZone: "Africa/Cairo", hasSearched: false, error: "invalid" };
    }
    if (error instanceof AdminDataError) {
      return { patients: [], timeZone: "Africa/Cairo", hasSearched: false, error: "unavailable" };
    }
    throw error;
  }
}
