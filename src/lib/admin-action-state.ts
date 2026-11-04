import type { AppointmentListDto, PatientDto } from "@/lib/server/admin-data";

export type AppointmentSearchState = {
  list: AppointmentListDto | null;
  error: "invalid" | "unavailable" | null;
};

export type PatientSearchState = {
  patients: PatientDto[];
  timeZone: string;
  hasSearched: boolean;
  error: "invalid" | "unavailable" | null;
};
