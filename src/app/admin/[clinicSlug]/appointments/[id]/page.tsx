import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AdminDataError, getAppointment, formatAppointmentDate } from "@/lib/server/admin-data";
import { updateAppointmentStatusAction } from "@/app/admin/actions";
import { EmptyState, Notice, PageHeader, Panel, StatusBadge } from "@/app/admin/_components/ui";

type SearchParams = Promise<{ notice?: string | string[] }>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AppointmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clinicSlug: string; id: string }>;
  searchParams: SearchParams;
}) {
  const [{ clinicSlug, id }, query] = await Promise.all([params, searchParams]);
  let result: Awaited<ReturnType<typeof getAppointment>> = null;
  let unavailable = false;
  try {
    result = await getAppointment(clinicSlug, id);
  } catch (error) {
    if (!(error instanceof AdminDataError)) throw error;
    unavailable = true;
  }
  if (unavailable) {
    return <Notice title="Appointment details are unavailable" tone="error">No appointment data was displayed. Refresh the page or contact your clinic administrator.</Notice>;
  }
  if (!result) notFound();

  const { appointment, timeZone, clinicName } = result;
  const notice = first(query.notice);
  const expired = appointment.isExpired;
  const channelLabel = appointment.bookingChannel === "web"
    ? "Online request"
    : appointment.bookingChannel === "whatsapp"
      ? "WhatsApp"
      : "Staff";

  return (
    <>
      <PageHeader
        eyebrow={`${clinicName} · Appointment`}
        title={appointment.patientName}
        description={`Appointment ID ${appointment.id}`}
        actions={<Link href={`/admin/${clinicSlug}/appointments`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back to appointments</Link>}
      />

      {notice === "status-updated" && <div className="mb-5"><Notice title="Status updated" tone="success">The status change was accepted by the database.</Notice></div>}
      {notice === "expired" && <div className="mb-5"><Notice title="Request expired" tone="warning">An expired request cannot be confirmed. It can still be cancelled.</Notice></div>}
      {notice === "conflict" && <div className="mb-5"><Notice title="Status changed elsewhere" tone="warning">Refresh and review the current appointment status before trying again.</Notice></div>}
      {notice === "unavailable" && <div className="mb-5"><Notice title="Could not update status" tone="error">No data was changed. Please retry or contact your clinic administrator.</Notice></div>}
      {notice === "forbidden" && <div className="mb-5"><Notice title="Administrator access required" tone="error">Only an administrator can manage this record.</Notice></div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
        <Panel title="Appointment details" description="Appointment time, patient, and doctor are read-only in the current staff permission model.">
          <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            <Detail label="Status"><StatusBadge status={appointment.status} /></Detail>
            <Detail label="Booking channel">{channelLabel}</Detail>
            <Detail label="Date and time">{formatAppointmentDate(appointment.startsAt, timeZone)}</Detail>
            <Detail label="Scheduled end">{formatAppointmentDate(appointment.endsAt, timeZone)}</Detail>
            <Detail label="Doctor">{appointment.doctorName}</Detail>
            <Detail label="Specialty">{appointment.doctorSpecialty || "Not specified"}</Detail>
            <Detail label="Patient">{appointment.patientName}</Detail>
            <Detail label="Phone">{appointment.maskedPhone ?? "Not available"}</Detail>
            <Detail label="Request created">{formatAppointmentDate(appointment.createdAt, timeZone)}</Detail>
            {appointment.status === "requested" && appointment.expiresAt && (
              <Detail label="Request deadline">{formatAppointmentDate(appointment.expiresAt, timeZone)}</Detail>
            )}
          </dl>
        </Panel>

        <div className="space-y-6">
          <Panel title="Supported status actions" description="Every change is checked again in the server action and by database RLS/constraints.">
            {appointment.status === "requested" ? (
              <div className="space-y-3">
                {expired && <Notice title="Expired request" tone="warning">Confirmation is disabled because this request has expired.</Notice>}
                <div className="flex flex-wrap gap-2">
                  <StatusForm clinicSlug={clinicSlug} appointmentId={appointment.id} status="confirmed" label="Confirm request" disabled={expired} primary />
                  <StatusForm clinicSlug={clinicSlug} appointmentId={appointment.id} status="cancelled" label="Cancel request" />
                </div>
              </div>
            ) : appointment.status === "confirmed" ? (
              <div className="flex flex-wrap gap-2">
                <StatusForm clinicSlug={clinicSlug} appointmentId={appointment.id} status="completed" label="Mark completed" primary />
                <StatusForm clinicSlug={clinicSlug} appointmentId={appointment.id} status="cancelled" label="Cancel appointment" />
              </div>
            ) : (
              <EmptyState title="No further status changes" description="This appointment is already cancelled or completed." />
            )}
          </Panel>
          <Notice title="Staff appointment creation is not enabled" tone="info">
            This dashboard does not use the public booking endpoint for admin work. Creating, rescheduling, or reassigning an appointment requires a separately approved staff-facing database capability.
          </Notice>
        </div>
      </div>
    </>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-2 text-sm font-medium text-slate-900">{children}</dd>
    </div>
  );
}

function StatusForm({
  clinicSlug,
  appointmentId,
  status,
  label,
  disabled = false,
  primary = false,
}: {
  clinicSlug: string;
  appointmentId: string;
  status: "confirmed" | "cancelled" | "completed";
  label: string;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <form action={updateAppointmentStatusAction}>
      <input type="hidden" name="clinicSlug" value={clinicSlug} />
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        disabled={disabled}
        className={primary
          ? "inline-flex min-h-10 items-center justify-center rounded-xl bg-[#0c766b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#095f56] disabled:cursor-not-allowed disabled:opacity-50"
          : "inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"}
      >
        {label}
      </button>
    </form>
  );
}
