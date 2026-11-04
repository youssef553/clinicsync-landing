import Link from "next/link";
import { ConfirmSubmitButton } from "@/app/admin/_components/confirm-submit-button";
import { AdminDataError, getAvailability } from "@/lib/server/admin-data";
import { createAvailabilityAction, removeAvailabilityAction, updateAvailabilityAction } from "@/app/admin/actions";
import { EmptyState, FormField, Notice, PageHeader, Panel, PrimaryButton } from "@/app/admin/_components/ui";

type SearchParams = Promise<{ doctorId?: string | string[]; notice?: string | string[] }>;
const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function timeInputValue(value: string): string {
  return value.slice(0, 5);
}

function noticeContent(code: string): { title: string; tone: "success" | "warning" | "error"; description: string } | null {
  const messages: Record<string, { title: string; tone: "success" | "warning" | "error"; description: string }> = {
    "availability-created": { title: "Availability added", tone: "success", description: "The weekly window was saved for this clinic." },
    "availability-updated": { title: "Availability updated", tone: "success", description: "The weekly window was saved for this clinic." },
    "availability-removed": { title: "Availability removed", tone: "success", description: "The schedule window is no longer active." },
    invalid: { title: "Check the schedule fields", tone: "warning", description: "Use a valid weekday, a start time before the end time, and a slot length from 5 to 240 minutes in 5-minute increments." },
    conflict: { title: "Schedule change conflicts with bookings", tone: "warning", description: "Active windows for the same doctor and weekday cannot overlap. A window with future requested or confirmed appointments cannot be edited, deactivated, or removed; cancel or resolve those appointments explicitly, then retry." },
    forbidden: { title: "Administrator access is required", tone: "error", description: "Only a clinic administrator can change availability." },
    unavailable: { title: "Could not save availability", tone: "error", description: "No schedule change was made. Retry or contact your clinic administrator." },
    "not-found": { title: "Doctor or schedule not found", tone: "warning", description: "The selected record may have changed or may not belong to this clinic." },
  };
  return messages[code] ?? null;
}

export default async function AvailabilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ clinicSlug: string }>;
  searchParams: SearchParams;
}) {
  const [{ clinicSlug }, query] = await Promise.all([params, searchParams]);
  let data: Awaited<ReturnType<typeof getAvailability>> | null = null;
  try {
    data = await getAvailability(clinicSlug, first(query.doctorId));
  } catch (error) {
    if (!(error instanceof AdminDataError)) throw error;
  }
  if (!data) {
    return <Notice title="Availability is unavailable" tone="error">No schedule data was displayed. Refresh the page or contact your clinic administrator.</Notice>;
  }

  const notice = noticeContent(first(query.notice));
  const defaultDoctorId = data.selectedDoctorId || data.doctors[0]?.id || "";
  return (
    <>
      <PageHeader
        eyebrow={`${data.clinicName} · Weekly schedules`}
        title="Availability"
        description={`Recurring weekly windows use ${data.timeZone} local time. Changes are validated in the server and protected by clinic-scoped RLS and database overlap constraints.`}
        actions={<Link href={`/admin/${clinicSlug}/doctors`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">View doctors</Link>}
      />
      {notice && <div className="mb-5"><Notice title={notice.title} tone={notice.tone}>{notice.description}</Notice></div>}

      <Panel title="Filter schedule" description="Choose a doctor to narrow the weekly availability list.">
        <form method="get" action={`/admin/${clinicSlug}/availability`} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block w-full max-w-xl text-sm font-medium text-slate-700">
            <span>Doctor</span>
            <select name="doctorId" defaultValue={data.selectedDoctorId} className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 outline-none focus:border-[#0c766b] focus:ring-2 focus:ring-[#0c766b]/15">
              <option value="">All visible doctors</option>
              {data.doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}{doctor.isActive ? "" : " · inactive"}</option>)}
            </select>
          </label>
          <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0c766b] px-4 text-sm font-semibold text-white hover:bg-[#095f56]">Apply filter</button>
          {data.selectedDoctorId && <Link href={`/admin/${clinicSlug}/availability`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Clear</Link>}
        </form>
      </Panel>

      {data.role === "admin" && (
        <div className="mt-6">
          <Panel title="Add weekly availability" description="Times are local wall-clock values; windows must stay within one day and must not overlap another active window for the same doctor.">
            {data.doctors.length === 0 ? (
              <EmptyState title="Add a doctor first" description="Create a doctor record before adding weekly availability." action={<Link href={`/admin/${clinicSlug}/doctors`} className="text-sm font-semibold text-[#0c766b] hover:underline">Open doctors →</Link>} />
            ) : (
              <AvailabilityForm
                action={createAvailabilityAction}
                clinicSlug={clinicSlug}
                doctors={data.doctors}
                defaultDoctorId={defaultDoctorId}
                submitLabel="Add schedule window"
              />
            )}
          </Panel>
        </div>
      )}

      <div className="mt-6">
        <Panel title="Weekly schedule windows" description={`${data.availability.length} window${data.availability.length === 1 ? "" : "s"} visible to your clinic membership.`}>
          {data.availability.length === 0 ? (
            <EmptyState title="No availability windows" description={data.role === "admin" ? "Add a weekly schedule above. Active windows are used by the existing public booking function." : "No active schedule windows are visible for the selected doctor."} />
          ) : (
            <div className="space-y-3">
              {data.availability.map((window) => (
                <article key={window.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-950">{window.doctorName}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${window.isActive ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{window.isActive ? "Active" : "Paused"}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{WEEKDAYS.find((day) => day.value === window.dayOfWeek)?.label ?? "Day unavailable"} · {timeInputValue(window.startTime)}–{timeInputValue(window.endTime)} · {window.slotDurationMinutes} minute slots</p>
                    </div>
                    {data.role === "admin" && (
                      <details className="group w-full lg:max-w-3xl">
                        <summary className="ml-auto flex min-h-10 w-fit cursor-pointer items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c766b]">
                          Edit window
                        </summary>
                        <div className="mt-4 rounded-xl bg-slate-50 p-4 sm:p-5">
                          <AvailabilityForm
                            action={updateAvailabilityAction}
                            clinicSlug={clinicSlug}
                            doctors={data.doctors}
                            defaultDoctorId={window.doctorId}
                            defaultDay={window.dayOfWeek}
                            defaultStart={timeInputValue(window.startTime)}
                            defaultEnd={timeInputValue(window.endTime)}
                            defaultDuration={window.slotDurationMinutes}
                            defaultActive={window.isActive}
                            availabilityId={window.id}
                            submitLabel="Save changes"
                          />
                          <form action={removeAvailabilityAction} className="mt-4 border-t border-slate-200 pt-4">
                            <input type="hidden" name="clinicSlug" value={clinicSlug} />
                            <input type="hidden" name="availabilityId" value={window.id} />
                            <input type="hidden" name="doctorId" value={window.doctorId} />
                            <ConfirmSubmitButton confirmation="Remove this weekly availability window? This cannot be undone.">Remove this schedule window</ConfirmSubmitButton>
                          </form>
                        </div>
                      </details>
                    )}
                  </div>
                  {data.role === "admin" && !window.isActive && <p className="mt-3 text-xs text-slate-500">Paused windows are not offered by the public booking function.</p>}
                </article>
              ))}
            </div>
          )}
        </Panel>
      </div>
      {data.role !== "admin" && <div className="mt-6"><Notice title="Read-only schedule access" tone="info">Your staff membership can view active availability. Only an administrator can add, edit, pause, or remove schedule windows.</Notice></div>}
    </>
  );
}

function AvailabilityForm({
  action,
  clinicSlug,
  doctors,
  defaultDoctorId,
  defaultDay = 1,
  defaultStart = "09:00",
  defaultEnd = "17:00",
  defaultDuration = 30,
  defaultActive = true,
  availabilityId,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  clinicSlug: string;
  doctors: Awaited<ReturnType<typeof getAvailability>>["doctors"];
  defaultDoctorId: string;
  defaultDay?: number;
  defaultStart?: string;
  defaultEnd?: string;
  defaultDuration?: number;
  defaultActive?: boolean;
  availabilityId?: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <input type="hidden" name="clinicSlug" value={clinicSlug} />
      {availabilityId && <input type="hidden" name="availabilityId" value={availabilityId} />}
      <label className="block text-sm font-medium text-slate-700">
        <span>Doctor</span>
        <select name="doctorId" required defaultValue={defaultDoctorId} className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 outline-none focus:border-[#0c766b] focus:ring-2 focus:ring-[#0c766b]/15">
          {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}{doctor.isActive ? "" : " · inactive"}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        <span>Day</span>
        <select name="dayOfWeek" defaultValue={String(defaultDay)} className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 outline-none focus:border-[#0c766b] focus:ring-2 focus:ring-[#0c766b]/15">
          {WEEKDAYS.slice(1).map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
        </select>
      </label>
      <FormField label="Start time" name="startTime" type="time" required defaultValue={defaultStart} />
      <FormField label="End time" name="endTime" type="time" required defaultValue={defaultEnd} />
      <FormField label="Slot duration (minutes)" name="slotDurationMinutes" type="number" required min={5} max={240} step={5} defaultValue={defaultDuration} />
      <label className="block text-sm font-medium text-slate-700">
        <span>Window status</span>
        <select name="isActive" defaultValue={defaultActive ? "true" : "false"} className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 outline-none focus:border-[#0c766b] focus:ring-2 focus:ring-[#0c766b]/15">
          <option value="true">Active</option>
          <option value="false">Paused</option>
        </select>
      </label>
      <div className="sm:col-span-2 xl:col-span-3"><PrimaryButton>{submitLabel}</PrimaryButton></div>
    </form>
  );
}
