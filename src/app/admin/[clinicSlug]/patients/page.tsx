import { Notice } from "@/app/admin/_components/ui";
import { PatientSearchManager } from "@/app/admin/[clinicSlug]/patients/patient-search-manager";
import { AdminDataError, searchPatients } from "@/lib/server/admin-data";

export default async function PatientsPage({
  params,
}: {
  params: Promise<{ clinicSlug: string }>;
}) {
  const { clinicSlug } = await params;
  let clinicContext: { clinicName: string; timeZone: string } | null = null;

  try {
    const context = await searchPatients(clinicSlug, "");
    clinicContext = { clinicName: context.clinicName, timeZone: context.timeZone };
  } catch (error) {
    if (!(error instanceof AdminDataError)) throw error;
  }

  if (!clinicContext) {
    return (
      <Notice title="Patient records are unavailable" tone="error">
        No patient data was displayed. Refresh the page or contact your clinic administrator.
      </Notice>
    );
  }

  return (
    <PatientSearchManager
      clinicSlug={clinicSlug}
      clinicName={clinicContext.clinicName}
      timeZone={clinicContext.timeZone}
    />
  );
}
