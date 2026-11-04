import "server-only";

import {
  escapeLikePattern,
  isUuid,
  normalizeSearchTerm,
  parseAppointmentStatus,
  type AppointmentStatus,
} from "@/lib/server/admin-validation";
import {
  formatClinicDateTime,
  getClinicDayRangeForDate,
  getClinicLocalDate,
  getCurrentClinicDayRange,
} from "@/lib/server/date-time";
import { requireClinicStaff } from "@/lib/server/staff-auth";

export class AdminDataError extends Error {
  constructor() {
    super("ClinicSync could not load the requested data.");
    this.name = "AdminDataError";
  }
}

export class AdminDataValidationError extends AdminDataError {
  constructor() {
    super();
    this.name = "AdminDataValidationError";
  }
}

export type DoctorDto = {
  id: string;
  name: string;
  specialty: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AvailabilityDto = {
  id: string;
  doctorId: string;
  doctorName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  isActive: boolean;
};

export type AppointmentDto = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  bookingChannel: string;
  expiresAt: string | null;
  isExpired: boolean;
  createdAt: string;
  patientName: string;
  maskedPhone: string | null;
  doctorName: string;
  doctorSpecialty: string;
};

export type PatientDto = {
  id: string;
  fullName: string;
  maskedPhone: string;
  createdAt: string;
};

export type PatientAppointmentDto = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  bookingChannel: string;
  doctorName: string;
  doctorSpecialty: string;
};

export type DashboardOverviewDto = {
  clinicName: string;
  clinicSlug: string;
  timeZone: string;
  role: "admin" | "staff";
  localDate: string;
  todayCount: number;
  requestedTodayCount: number;
  confirmedTodayCount: number;
  cancelledTodayCount: number;
  activeDoctorCount: number;
  todayAppointments: Array<{
    id: string;
    startsAt: string;
    status: AppointmentStatus;
    patientName: string;
    doctorName: string;
  }>;
  upcomingAppointments: Array<{
    id: string;
    startsAt: string;
    status: AppointmentStatus;
    patientName: string;
    doctorName: string;
  }>;
};

export type AppointmentFilterInput = {
  search?: unknown;
  date?: unknown;
  status?: unknown;
};

export type AppointmentListDto = {
  clinicName: string;
  timeZone: string;
  role: "admin" | "staff";
  localDate: string;
  rows: AppointmentDto[];
  date: string;
  status: AppointmentStatus | "all";
};

export type AppointmentDetailDto = {
  clinicName: string;
  timeZone: string;
  role: "admin" | "staff";
  appointment: AppointmentDto;
};

function failIfError(error: unknown): void {
  if (error) throw new AdminDataError();
}

function nonEmptyString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asAppointmentStatus(value: unknown): AppointmentStatus {
  return parseAppointmentStatus(value) ?? "requested";
}

function mapAppointment(row: Record<string, unknown>): AppointmentDto {
  const patient = row.patients && typeof row.patients === "object"
    ? (row.patients as Record<string, unknown>)
    : {};
  const doctor = row.doctors && typeof row.doctors === "object"
    ? (row.doctors as Record<string, unknown>)
    : {};
  const maskedPhone = nonEmptyString(patient.masked_phone);
  const expiresAt = typeof row.expires_at === "string" ? row.expires_at : null;

  return {
    id: nonEmptyString(row.id),
    startsAt: nonEmptyString(row.starts_at),
    endsAt: nonEmptyString(row.ends_at),
    status: asAppointmentStatus(row.status),
    bookingChannel: nonEmptyString(row.booking_channel),
    expiresAt,
    isExpired: expiresAt !== null && Date.parse(expiresAt) <= Date.now(),
    createdAt: nonEmptyString(row.created_at),
    patientName: nonEmptyString(patient.full_name) || "Patient unavailable",
    maskedPhone: maskedPhone || null,
    doctorName: nonEmptyString(doctor.name) || "Doctor unavailable",
    doctorSpecialty: nonEmptyString(doctor.specialty),
  };
}

function mapDoctor(row: Record<string, unknown>): DoctorDto {
  return {
    id: nonEmptyString(row.id),
    name: nonEmptyString(row.name),
    specialty: nonEmptyString(row.specialty),
    isActive: row.is_active === true,
    createdAt: nonEmptyString(row.created_at),
    updatedAt: nonEmptyString(row.updated_at),
  };
}

function mapPatient(row: Record<string, unknown>): PatientDto {
  return {
    id: nonEmptyString(row.patient_id) || nonEmptyString(row.id),
    fullName: nonEmptyString(row.full_name),
    maskedPhone: nonEmptyString(row.masked_phone) || "Not available",
    createdAt: nonEmptyString(row.created_at),
  };
}

function mapAvailability(row: Record<string, unknown>): AvailabilityDto {
  const doctor = row.doctors && typeof row.doctors === "object"
    ? (row.doctors as Record<string, unknown>)
    : {};
  return {
    id: nonEmptyString(row.id),
    doctorId: nonEmptyString(row.doctor_id),
    doctorName: nonEmptyString(doctor.name) || "Doctor unavailable",
    dayOfWeek: Number(row.day_of_week),
    startTime: nonEmptyString(row.start_time),
    endTime: nonEmptyString(row.end_time),
    slotDurationMinutes: Number(row.slot_duration_minutes),
    isActive: row.is_active === true,
  };
}

const APPOINTMENT_LIST_SELECT =
  "id, clinic_id, patient_id, doctor_id, starts_at, ends_at, status, booking_channel, expires_at, created_at, patients:patients!appointments_clinic_patient_fkey(full_name), doctors:doctors!appointments_clinic_doctor_fkey(name, specialty)";
const APPOINTMENT_DETAIL_SELECT =
  "id, clinic_id, patient_id, doctor_id, starts_at, ends_at, status, booking_channel, expires_at, created_at, patients:patients!appointments_clinic_patient_fkey(full_name), doctors:doctors!appointments_clinic_doctor_fkey(name, specialty)";

export async function getDashboardOverview(
  clinicSlug: string,
  now = new Date(),
): Promise<DashboardOverviewDto> {
  const context = await requireClinicStaff(clinicSlug, `/admin/${clinicSlug}`);
  const day = getCurrentClinicDayRange(now, context.timeZone);
  const todayStart = day.start.toISOString();
  const todayEnd = day.end.toISOString();

  const [
    todayResult,
    requestedResult,
    confirmedResult,
    cancelledResult,
    doctorsResult,
    todayScheduleResult,
    upcomingResult,
  ] = await Promise.all([
    context.supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", context.clinicId)
      .gte("starts_at", todayStart)
      .lt("starts_at", todayEnd),
    context.supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", context.clinicId)
      .eq("status", "requested")
      .gte("starts_at", todayStart)
      .lt("starts_at", todayEnd),
    context.supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", context.clinicId)
      .eq("status", "confirmed")
      .gte("starts_at", todayStart)
      .lt("starts_at", todayEnd),
    context.supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", context.clinicId)
      .eq("status", "cancelled")
      .gte("starts_at", todayStart)
      .lt("starts_at", todayEnd),
    context.supabase
      .from("doctors")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", context.clinicId)
      .eq("is_active", true),
    context.supabase
      .from("appointments")
      .select(
        "id, starts_at, status, patients:patients!appointments_clinic_patient_fkey(full_name), doctors:doctors!appointments_clinic_doctor_fkey(name)",
      )
      .eq("clinic_id", context.clinicId)
      .gte("starts_at", todayStart)
      .lt("starts_at", todayEnd)
      .order("starts_at", { ascending: true })
      .limit(50),
    context.supabase
      .from("appointments")
      .select(
        "id, starts_at, status, patients:patients!appointments_clinic_patient_fkey(full_name), doctors:doctors!appointments_clinic_doctor_fkey(name)",
      )
      .eq("clinic_id", context.clinicId)
      .gte("starts_at", todayEnd)
      .in("status", ["requested", "confirmed"])
      .order("starts_at", { ascending: true })
      .limit(8),
  ]);

  for (const result of [
    todayResult,
    requestedResult,
    confirmedResult,
    cancelledResult,
    doctorsResult,
    todayScheduleResult,
    upcomingResult,
  ]) {
    failIfError(result.error);
  }

  const mapOverviewAppointment = (row: Record<string, unknown>) => {
    const patient = row.patients && typeof row.patients === "object"
      ? (row.patients as Record<string, unknown>)
      : {};
    const doctor = row.doctors && typeof row.doctors === "object"
      ? (row.doctors as Record<string, unknown>)
      : {};
    return {
      id: nonEmptyString(row.id),
      startsAt: nonEmptyString(row.starts_at),
      status: asAppointmentStatus(row.status),
      patientName: nonEmptyString(patient.full_name) || "Patient unavailable",
      doctorName: nonEmptyString(doctor.name) || "Doctor unavailable",
    };
  };
  const todaySchedule = (todayScheduleResult.data ?? []) as unknown as Array<Record<string, unknown>>;
  const upcoming = (upcomingResult.data ?? []) as unknown as Array<Record<string, unknown>>;

  return {
    clinicName: context.clinicName,
    clinicSlug: context.clinicSlug,
    timeZone: context.timeZone,
    role: context.role,
    localDate: day.date,
    todayCount: todayResult.count ?? 0,
    requestedTodayCount: requestedResult.count ?? 0,
    confirmedTodayCount: confirmedResult.count ?? 0,
    cancelledTodayCount: cancelledResult.count ?? 0,
    activeDoctorCount: doctorsResult.count ?? 0,
    todayAppointments: todaySchedule.map(mapOverviewAppointment),
    upcomingAppointments: upcoming.map(mapOverviewAppointment),
  };
}

export async function getAppointments(
  clinicSlug: string,
  filters: AppointmentFilterInput,
): Promise<AppointmentListDto> {
  const context = await requireClinicStaff(clinicSlug, `/admin/${clinicSlug}/appointments`);
  const searchValue = normalizeSearchTerm(filters.search);
  if (searchValue === null) throw new AdminDataValidationError();

  const dateValue = typeof filters.date === "string" ? filters.date : "";
  const localDate = dateValue || getClinicLocalDate(new Date(), context.timeZone);
  const day = getClinicDayRangeForDate(localDate, context.timeZone);
  if (!day) throw new AdminDataValidationError();

  const parsedStatus = filters.status === "all" || filters.status === undefined
    ? "all"
    : parseAppointmentStatus(filters.status);
  if (!parsedStatus) throw new AdminDataValidationError();

  let matchingAppointmentIds: string[] | null = null;
  if (searchValue) {
    const pattern = `%${escapeLikePattern(searchValue)}%`;
    const [patientResult, doctorResult] = await Promise.all([
      context.supabase.rpc("search_clinic_patients", {
        p_clinic_id: context.clinicId,
        p_search: searchValue,
      }),
      context.supabase
        .from("doctors")
        .select("id")
        .eq("clinic_id", context.clinicId)
        .ilike("name", pattern)
        .limit(100),
    ]);
    failIfError(patientResult.error);
    failIfError(doctorResult.error);

    const patientIds = Array.from(
      new Set(
        ((patientResult.data ?? []) as unknown as Array<Record<string, unknown>>)
          .map((row) => nonEmptyString(row.patient_id))
          .filter(Boolean),
      ),
    );
    const doctorIds = (doctorResult.data ?? [])
      .map((row) => nonEmptyString((row as Record<string, unknown>).id))
      .filter(Boolean);

    const idQueries: Array<PromiseLike<{ data: unknown; error: unknown }>> = [];
    if (patientIds.length > 0) {
      let query = context.supabase
        .from("appointments")
        .select("id")
        .eq("clinic_id", context.clinicId)
        .in("patient_id", patientIds)
        .gte("starts_at", day.start.toISOString())
        .lt("starts_at", day.end.toISOString());
      if (parsedStatus !== "all") query = query.eq("status", parsedStatus);
      idQueries.push(query.limit(500));
    }
    if (doctorIds.length > 0) {
      let query = context.supabase
        .from("appointments")
        .select("id")
        .eq("clinic_id", context.clinicId)
        .in("doctor_id", doctorIds)
        .gte("starts_at", day.start.toISOString())
        .lt("starts_at", day.end.toISOString());
      if (parsedStatus !== "all") query = query.eq("status", parsedStatus);
      idQueries.push(query.limit(500));
    }
    if (isUuid(searchValue)) {
      let query = context.supabase
        .from("appointments")
        .select("id")
        .eq("clinic_id", context.clinicId)
        .eq("id", searchValue.toLowerCase())
        .gte("starts_at", day.start.toISOString())
        .lt("starts_at", day.end.toISOString());
      if (parsedStatus !== "all") query = query.eq("status", parsedStatus);
      idQueries.push(query.limit(1));
    }

    const idResults = await Promise.all(idQueries);
    for (const result of idResults) failIfError(result.error);
    matchingAppointmentIds = Array.from(
      new Set(
        idResults.flatMap((result) => {
          const rows = (result.data ?? []) as Array<Record<string, unknown>>;
          return rows.map((row) => nonEmptyString(row.id)).filter(Boolean);
        }),
      ),
    );
  }

  let query = context.supabase
    .from("appointments")
    .select(APPOINTMENT_LIST_SELECT)
    .eq("clinic_id", context.clinicId)
    .gte("starts_at", day.start.toISOString())
    .lt("starts_at", day.end.toISOString())
    .order("starts_at", { ascending: true })
    .limit(100);
  if (parsedStatus !== "all") query = query.eq("status", parsedStatus);
  if (matchingAppointmentIds !== null) {
    if (matchingAppointmentIds.length === 0) {
      return {
        clinicName: context.clinicName,
        timeZone: context.timeZone,
        role: context.role,
        localDate: day.date,
        rows: [],
        date: day.date,
        status: parsedStatus,
      };
    }
    query = query.in("id", matchingAppointmentIds);
  }

  const { data, error } = await query;
  failIfError(error);

  return {
    clinicName: context.clinicName,
    timeZone: context.timeZone,
    role: context.role,
    localDate: day.date,
    rows: ((data ?? []) as unknown as Array<Record<string, unknown>>).map(mapAppointment),
    date: day.date,
    status: parsedStatus,
  };
}

export async function getAppointment(
  clinicSlug: string,
  appointmentId: string,
): Promise<AppointmentDetailDto | null> {
  const context = await requireClinicStaff(
    clinicSlug,
    `/admin/${clinicSlug}/appointments/${appointmentId}`,
  );
  if (!isUuid(appointmentId)) return null;

  const { data, error } = await context.supabase
    .from("appointments")
    .select(APPOINTMENT_DETAIL_SELECT)
    .eq("clinic_id", context.clinicId)
    .eq("id", appointmentId.toLowerCase())
    .maybeSingle();
  failIfError(error);
  if (!data) return null;

  const appointmentRow = data as unknown as Record<string, unknown>;
  const patientId = nonEmptyString(appointmentRow.patient_id);
  let maskedPhone: string | null = null;
  if (patientId) {
    const patientResult = await context.supabase.rpc("get_clinic_patient", {
      p_clinic_id: context.clinicId,
      p_patient_id: patientId,
    });
    failIfError(patientResult.error);
    const patientRows = (patientResult.data ?? []) as unknown as Array<Record<string, unknown>>;
    maskedPhone = nonEmptyString(patientRows[0]?.masked_phone) || null;
  }
  const patient = appointmentRow.patients && typeof appointmentRow.patients === "object"
    ? (appointmentRow.patients as Record<string, unknown>)
    : {};

  return {
    clinicName: context.clinicName,
    timeZone: context.timeZone,
    role: context.role,
    appointment: mapAppointment({
      ...appointmentRow,
      patients: { ...patient, masked_phone: maskedPhone },
    }),
  };
}

export async function getDoctors(clinicSlug: string): Promise<{
  clinicName: string;
  timeZone: string;
  role: "admin" | "staff";
  doctors: DoctorDto[];
}> {
  const context = await requireClinicStaff(clinicSlug, `/admin/${clinicSlug}/doctors`);
  const { data, error } = await context.supabase
    .from("doctors")
    .select("id, name, specialty, is_active, created_at, updated_at")
    .eq("clinic_id", context.clinicId)
    .order("name", { ascending: true })
    .limit(200);
  failIfError(error);

  return {
    clinicName: context.clinicName,
    timeZone: context.timeZone,
    role: context.role,
    doctors: ((data ?? []) as unknown as Array<Record<string, unknown>>).map(mapDoctor),
  };
}

export async function getDoctor(
  clinicSlug: string,
  doctorId: string,
): Promise<{
  clinicName: string;
  timeZone: string;
  role: "admin" | "staff";
  doctor: DoctorDto;
  availability: AvailabilityDto[];
} | null> {
  const context = await requireClinicStaff(clinicSlug, `/admin/${clinicSlug}/doctors/${doctorId}`);
  if (!isUuid(doctorId)) return null;

  const [doctorResult, availabilityResult] = await Promise.all([
    context.supabase
      .from("doctors")
      .select("id, name, specialty, is_active, created_at, updated_at")
      .eq("clinic_id", context.clinicId)
      .eq("id", doctorId.toLowerCase())
      .maybeSingle(),
    context.supabase
      .from("availability")
      .select("id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active")
      .eq("clinic_id", context.clinicId)
      .eq("doctor_id", doctorId.toLowerCase())
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true }),
  ]);
  failIfError(doctorResult.error);
  failIfError(availabilityResult.error);
  if (!doctorResult.data) return null;

  const doctor = mapDoctor(doctorResult.data as unknown as Record<string, unknown>);
  const availability = ((availabilityResult.data ?? []) as unknown as Array<Record<string, unknown>>).map(
    (row) => mapAvailability({ ...row, doctors: { name: doctor.name } }),
  );
  return {
    clinicName: context.clinicName,
    timeZone: context.timeZone,
    role: context.role,
    doctor,
    availability,
  };
}

export async function getAvailability(
  clinicSlug: string,
  doctorFilter?: string,
): Promise<{
  clinicName: string;
  timeZone: string;
  role: "admin" | "staff";
  doctors: DoctorDto[];
  availability: AvailabilityDto[];
  selectedDoctorId: string;
}> {
  const context = await requireClinicStaff(clinicSlug, `/admin/${clinicSlug}/availability`);
  const selectedDoctorId = doctorFilter && isUuid(doctorFilter) ? doctorFilter.toLowerCase() : "";
  const [doctorsResult, availabilityResult] = await Promise.all([
    context.supabase
      .from("doctors")
      .select("id, name, specialty, is_active, created_at, updated_at")
      .eq("clinic_id", context.clinicId)
      .order("name", { ascending: true })
      .limit(200),
    (() => {
      let query = context.supabase
        .from("availability")
        .select(
          "id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active, doctors:doctors!availability_clinic_doctor_fkey(name)",
        )
        .eq("clinic_id", context.clinicId)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(500);
      if (selectedDoctorId) query = query.eq("doctor_id", selectedDoctorId);
      return query;
    })(),
  ]);
  failIfError(doctorsResult.error);
  failIfError(availabilityResult.error);

  return {
    clinicName: context.clinicName,
    timeZone: context.timeZone,
    role: context.role,
    doctors: ((doctorsResult.data ?? []) as unknown as Array<Record<string, unknown>>).map(mapDoctor),
    availability: ((availabilityResult.data ?? []) as unknown as Array<Record<string, unknown>>).map(
      mapAvailability,
    ),
    selectedDoctorId,
  };
}

export async function searchPatients(
  clinicSlug: string,
  searchValue: unknown,
): Promise<{
  clinicName: string;
  timeZone: string;
  role: "admin" | "staff";
  search: string;
  patients: PatientDto[];
}> {
  const context = await requireClinicStaff(clinicSlug, `/admin/${clinicSlug}/patients`);
  const search = normalizeSearchTerm(searchValue);
  if (search === null) throw new AdminDataValidationError();

  if (search.length < 2) {
    return {
      clinicName: context.clinicName,
      timeZone: context.timeZone,
      role: context.role,
      search,
      patients: [],
    };
  }

  const { data, error } = await context.supabase.rpc("search_clinic_patients", {
    p_clinic_id: context.clinicId,
    p_search: search,
  });
  failIfError(error);

  return {
    clinicName: context.clinicName,
    timeZone: context.timeZone,
    role: context.role,
    search,
    patients: ((data ?? []) as unknown as Array<Record<string, unknown>>)
      .slice(0, 50)
      .map(mapPatient),
  };
}

export async function getPatient(
  clinicSlug: string,
  patientId: string,
): Promise<{
  clinicName: string;
  timeZone: string;
  patient: PatientDto;
  appointments: PatientAppointmentDto[];
} | null> {
  const context = await requireClinicStaff(clinicSlug, `/admin/${clinicSlug}/patients/${patientId}`);
  if (!isUuid(patientId)) return null;

  const [patientResult, appointmentsResult] = await Promise.all([
    context.supabase.rpc("get_clinic_patient", {
      p_clinic_id: context.clinicId,
      p_patient_id: patientId.toLowerCase(),
    }),
    context.supabase
      .from("appointments")
      .select(
        "id, starts_at, ends_at, status, booking_channel, doctors:doctors!appointments_clinic_doctor_fkey(name, specialty)",
      )
      .eq("clinic_id", context.clinicId)
      .eq("patient_id", patientId.toLowerCase())
      .order("starts_at", { ascending: false })
      .limit(100),
  ]);
  failIfError(patientResult.error);
  failIfError(appointmentsResult.error);
  const patientRows = (patientResult.data ?? []) as unknown as Array<Record<string, unknown>>;
  const patient = patientRows[0];
  if (!patient) return null;

  const appointments = (appointmentsResult.data ?? []) as unknown as Array<Record<string, unknown>>;
  return {
    clinicName: context.clinicName,
    timeZone: context.timeZone,
    patient: mapPatient(patient),
    appointments: appointments.map((row) => {
      const doctor = row.doctors && typeof row.doctors === "object"
        ? (row.doctors as Record<string, unknown>)
        : {};
      return {
        id: nonEmptyString(row.id),
        startsAt: nonEmptyString(row.starts_at),
        endsAt: nonEmptyString(row.ends_at),
        status: asAppointmentStatus(row.status),
        bookingChannel: nonEmptyString(row.booking_channel),
        doctorName: nonEmptyString(doctor.name) || "Doctor unavailable",
        doctorSpecialty: nonEmptyString(doctor.specialty),
      };
    }),
  };
}

export function formatAppointmentDate(value: string, timeZone: string): string {
  return formatClinicDateTime(value, timeZone);
}
