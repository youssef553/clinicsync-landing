import { getDoctors, AdminDataError } from "@/lib/server/admin-data";
import { createDoctorAction } from "@/app/admin/actions";
import { DoctorDirectory } from "@/app/admin/[clinicSlug]/doctors/doctor-directory";
import { FormField, Notice, PageHeader, Panel, PrimaryButton } from "@/app/admin/_components/ui";

type SearchParams = Promise<{ notice?: string | string[] }>;
type DoctorsResult = Awaited<ReturnType<typeof getDoctors>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function DoctorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clinicSlug: string }>;
  searchParams: SearchParams;
}) {
  const [{ clinicSlug }, query] = await Promise.all([params, searchParams]);
  let data: DoctorsResult | null = null;
  try {
    data = await getDoctors(clinicSlug);
  } catch (error) {
    if (!(error instanceof AdminDataError)) throw error;
  }

  if (!data) {
    return <Notice title="Doctor records are unavailable" tone="error">No doctor data was displayed. Refresh the page or contact your clinic administrator.</Notice>;
  }

  const notice = first(query.notice);
  const noticeText: Record<string, { title: string; tone: "success" | "warning" | "error" }> = {
    "doctor-created": { title: "Doctor added", tone: "success" },
    "doctor-updated": { title: "Doctor details saved", tone: "success" },
    invalid: { title: "Check the doctor details", tone: "warning" },
    forbidden: { title: "Administrator access is required", tone: "error" },
    unavailable: { title: "Could not save doctor details", tone: "error" },
    "not-found": { title: "Doctor not found in this clinic", tone: "warning" },
  };

  return (
    <>
      <PageHeader
        eyebrow={`${data.clinicName} · Doctors`}
        title="Doctors"
        description="View doctor details and activity for this clinic. Only administrators can create or edit doctor records."
      />
      {noticeText[notice] && (
        <div className="mb-5">
          <Notice title={noticeText[notice].title} tone={noticeText[notice].tone}>
            {notice === "doctor-created" || notice === "doctor-updated"
              ? "Changes were saved through the authenticated Supabase Data API."
              : "No doctor record was changed. Review access and validation, then try again."}
          </Notice>
        </div>
      )}

      {data.role === "admin" && (
        <div className="mb-6">
          <Panel title="Add a doctor" description="Doctor names and specialties are visible to clinic staff and may be used by public booking flows.">
            <form action={createDoctorAction} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <input type="hidden" name="clinicSlug" value={clinicSlug} />
              <FormField label="Doctor name" name="name" required max={120} placeholder="e.g. Dr. Salma Hassan" />
              <FormField label="Specialty" name="specialty" required maxLength={120} placeholder="e.g. Pediatrics" />
              <PrimaryButton className="min-h-11">Add doctor</PrimaryButton>
            </form>
          </Panel>
        </div>
      )}

      <DoctorDirectory clinicSlug={clinicSlug} role={data.role} doctors={data.doctors} />
    </>
  );
}
