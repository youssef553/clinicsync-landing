import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminDataError, getDoctor } from "@/lib/server/admin-data";
import { updateDoctorAction } from "@/app/admin/actions";
import { EmptyState, FormField, Notice, PageHeader, Panel, PrimaryButton } from "@/app/admin/_components/ui";

const WEEKDAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
type SearchParams = Promise<{ notice?: string | string[] }>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatTime(value: string): string {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return value;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export default async function DoctorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clinicSlug: string; id: string }>;
  searchParams: SearchParams;
}) {
  const [{ clinicSlug, id }, query] = await Promise.all([params, searchParams]);
  let result: Awaited<ReturnType<typeof getDoctor>> = null;
  let unavailable = false;
  try {
    result = await getDoctor(clinicSlug, id);
  } catch (error) {
    if (!(error instanceof AdminDataError)) throw error;
    unavailable = true;
  }
  if (unavailable) {
    return <Notice title="Doctor details are unavailable" tone="error">No doctor or schedule data was displayed. Refresh the page or contact your clinic administrator.</Notice>;
  }
  if (!result) notFound();

  const { doctor, availability, role, clinicName } = result;
  const notice = first(query.notice);
  return (
    <>
      <PageHeader
        eyebrow={`${clinicName} · Doctor details`}
        title={doctor.name}
        description={doctor.specialty}
        actions={<Link href={`/admin/${clinicSlug}/doctors`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back to doctors</Link>}
      />
      {notice === "doctor-updated" && <div className="mb-5"><Notice title="Doctor details saved" tone="success">The changes were saved through the authenticated clinic Data API.</Notice></div>}
      {notice && notice !== "doctor-updated" && <div className="mb-5"><Notice title="Could not update doctor" tone={notice === "invalid" ? "warning" : "error"}>No doctor record was changed. Check the form and your administrator access.</Notice></div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <Panel title="Doctor profile" description="Doctor identity and activity are scoped to this clinic.">
          {role === "admin" ? (
            <form action={updateDoctorAction} className="space-y-5">
              <input type="hidden" name="clinicSlug" value={clinicSlug} />
              <input type="hidden" name="doctorId" value={doctor.id} />
              <FormField label="Doctor name" name="name" required maxLength={120} defaultValue={doctor.name} />
              <FormField label="Specialty" name="specialty" required max={120} defaultValue={doctor.specialty} />
              <label className="block text-sm font-medium text-slate-700">
                <span>Availability status</span>
                <select name="isActive" defaultValue={doctor.isActive ? "true" : "false"} className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 outline-none focus:border-[#0c766b] focus:ring-2 focus:ring-[#0c766b]/15">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
                <span className="mt-2 block text-xs leading-5 text-slate-500">Inactive doctors are not offered for new public bookings. Future requested or confirmed appointments remain unchanged; cancel or resolve them explicitly from Appointments if needed.</span>
              </label>
              <PrimaryButton>Save doctor details</PrimaryButton>
            </form>
          ) : (
            <dl className="grid gap-5 sm:grid-cols-2">
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Specialty</dt><dd className="mt-2 text-sm font-medium text-slate-900">{doctor.specialty}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</dt><dd className="mt-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${doctor.isActive ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{doctor.isActive ? "Active" : "Inactive"}</span></dd></div>
            </dl>
          )}
        </Panel>

        <Panel
          title="Weekly availability"
          description={`Clinic-local schedule · ${result.timeZone}`}
          action={<Link href={`/admin/${clinicSlug}/availability?doctorId=${doctor.id}`} className="text-sm font-semibold text-[#0c766b] hover:underline">Manage schedule</Link>}
        >
          {availability.length === 0 ? (
            <EmptyState title="No schedule windows" description="No weekly availability is configured for this doctor yet." />
          ) : (
            <div className="divide-y divide-slate-100">
              {availability.map((window) => (
                <div key={window.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-slate-900">{WEEKDAYS[window.dayOfWeek] ?? "Day unavailable"}</p>
                    <p className="mt-1 text-sm text-slate-600">{formatTime(window.startTime)}–{formatTime(window.endTime)} · {window.slotDurationMinutes} min slots</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${window.isActive ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{window.isActive ? "Active" : "Paused"}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
      {role !== "admin" && <div className="mt-6"><Notice title="Read-only access" tone="info">Only clinic administrators can change doctor records or schedules.</Notice></div>}
    </>
  );
}
