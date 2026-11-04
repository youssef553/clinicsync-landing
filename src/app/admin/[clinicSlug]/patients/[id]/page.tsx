import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminDataError, getPatient, formatAppointmentDate } from "@/lib/server/admin-data";
import { EmptyState, Notice, PageHeader, Panel, StatusBadge } from "@/app/admin/_components/ui";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ clinicSlug: string; id: string }>;
}) {
  const { clinicSlug, id } = await params;
  let result: Awaited<ReturnType<typeof getPatient>> = null;
  let unavailable = false;
  try {
    result = await getPatient(clinicSlug, id);
  } catch (error) {
    if (!(error instanceof AdminDataError)) throw error;
    unavailable = true;
  }
  if (unavailable) {
    return <Notice title="Patient record is unavailable" tone="error">No patient data was displayed. Refresh the page or contact your clinic administrator.</Notice>;
  }
  if (!result) notFound();

  const { patient, appointments, clinicName, timeZone } = result;
  return (
    <>
      <PageHeader
        eyebrow={`${clinicName} · Patient record`}
        title={patient.fullName}
        description="This view contains contact and appointment details only; no clinical notes are stored in the inspected schema."
        actions={<Link href={`/admin/${clinicSlug}/patients`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back to patient search</Link>}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.3fr)]">
        <Panel title="Contact details" description="Sensitive contact values are masked in this workspace.">
          <dl className="space-y-5">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient name</dt>
              <dd className="mt-2 text-sm font-medium text-slate-900">{patient.fullName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</dt>
              <dd className="mt-2 text-sm font-medium text-slate-900">{patient.maskedPhone}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Record created</dt>
              <dd className="mt-2 text-sm font-medium text-slate-900">{formatAppointmentDate(patient.createdAt, timeZone)}</dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Appointment history" description={`${appointments.length} record${appointments.length === 1 ? "" : "s"} · clinic-local times in ${timeZone}`}>
          {appointments.length === 0 ? (
            <EmptyState title="No appointment history" description="No appointment records are associated with this patient in the current clinic." />
          ) : (
            <div className="divide-y divide-slate-100">
              {appointments.map((appointment) => (
                <Link key={appointment.id} href={`/admin/${clinicSlug}/appointments/${appointment.id}`} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{formatAppointmentDate(appointment.startsAt, timeZone)}</p>
                    <p className="mt-1 text-sm text-slate-600">{appointment.doctorName}{appointment.doctorSpecialty ? ` · ${appointment.doctorSpecialty}` : ""}</p>
                    <p className="mt-1 text-xs text-slate-500">{appointment.bookingChannel === "web" ? "Online request" : appointment.bookingChannel === "whatsapp" ? "WhatsApp" : "Staff"}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <StatusBadge status={appointment.status} />
                    <span className="text-sm font-semibold text-[#0c766b]">Open <span aria-hidden="true">→</span></span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>
      <div className="mt-6"><Notice title="Minimum necessary information" tone="info">The full phone number is not sent to the patient-facing UI. Access is scoped by the verified clinic membership and database RLS.</Notice></div>
    </>
  );
}
