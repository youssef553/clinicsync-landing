import { AppointmentManager } from "@/app/admin/[clinicSlug]/appointments/appointment-manager";
import { Notice } from "@/app/admin/_components/ui";
import { AdminDataError, getAppointments, type AppointmentListDto } from "@/lib/server/admin-data";

export default async function AppointmentsPage({
  params,
}: {
  params: Promise<{ clinicSlug: string }>;
}) {
  const { clinicSlug } = await params;
  let initialList: AppointmentListDto | null = null;

  try {
    initialList = await getAppointments(clinicSlug, { search: "", date: "", status: "all" });
  } catch (error) {
    if (!(error instanceof AdminDataError)) throw error;
  }

  if (!initialList) {
    return (
      <Notice title="Appointments are unavailable" tone="error">
        No appointment data was displayed. Refresh the page or contact your clinic administrator.
      </Notice>
    );
  }

  return <AppointmentManager clinicSlug={clinicSlug} initialList={initialList} />;
}
