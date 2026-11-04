"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { updateAppointmentStatusAction, searchAppointmentsAction } from "@/app/admin/actions";
import { EmptyState, Notice, PageHeader, Panel, StatusBadge } from "@/app/admin/_components/ui";
import type { AppointmentListDto } from "@/lib/server/admin-data";
import type { AppointmentSearchState } from "@/lib/admin-action-state";
import { formatClinicDateTime } from "@/lib/server/date-time";

export function AppointmentManager({
  clinicSlug,
  initialList,
}: {
  clinicSlug: string;
  initialList: AppointmentListDto;
}) {
  const [list, setList] = useState(initialList);
  const [searchError, setSearchError] = useState<AppointmentSearchState["error"]>(null);
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(initialList.date);
  const [status, setStatus] = useState(initialList.status);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const result = await searchAppointmentsAction(formData);
        if (result.list) setList(result.list);
        setSearchError(result.error);
      } catch {
        setSearchError("unavailable");
      }
    });
  }

  return (
    <>
      <PageHeader
        eyebrow={`${list.clinicName} · ${list.timeZone}`}
        title="Appointments"
        description="Review online requests and update only the appointment statuses supported by your clinic’s existing permissions."
        actions={(
          <button
            type="button"
            disabled
            title="Staff appointment creation is not supported by the current secure database API."
            className="inline-flex min-h-10 cursor-not-allowed items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500"
          >
            New appointment · unavailable
          </button>
        )}
      />

      {searchError === "invalid" && (
        <div className="mb-5"><Notice title="Check the filters" tone="warning">Use a real clinic date, a supported status, and no more than 80 characters in the search field.</Notice></div>
      )}
      {searchError === "unavailable" && (
        <div className="mb-5"><Notice title="Appointment search is unavailable" tone="error">No new data was displayed. Refresh or contact your clinic administrator if this continues.</Notice></div>
      )}

      <div className="mb-6">
        <Notice title="Appointment creation is intentionally disabled" tone="warning">
          The existing public booking path creates online requests through a separate server-only booking function. It is not an authenticated staff API. Current staff RLS permits status updates only, so this dashboard does not create, reschedule, or reassign appointments.
        </Notice>
      </div>

      <Panel title="Find appointments" description="Search by patient name, phone number, doctor, or appointment ID. Search terms are submitted in a POST body and are not added to the page URL.">
        <form method="post" onSubmit={handleSearchSubmit} className="grid gap-4 md:grid-cols-[minmax(180px,1.5fr)_minmax(150px,0.8fr)_minmax(150px,0.8fr)_auto] md:items-end">
          <input type="hidden" name="clinicSlug" value={clinicSlug} />
          <label className="block text-sm font-medium text-slate-700">
            <span>Search</span>
            <input
              type="search"
              name="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              maxLength={80}
              autoComplete="off"
              placeholder="Patient, phone, doctor, ID"
              className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#0c766b] focus:ring-2 focus:ring-[#0c766b]/15"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            <span>Clinic date</span>
            <input
              type="date"
              name="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 outline-none transition focus:border-[#0c766b] focus:ring-2 focus:ring-[#0c766b]/15"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            <span>Status</span>
            <select
              name="status"
              value={status}
              onChange={(event) => setStatus(event.target.value as AppointmentListDto["status"])}
              className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 outline-none focus:border-[#0c766b] focus:ring-2 focus:ring-[#0c766b]/15"
            >
              <option value="all">All statuses</option>
              <option value="requested">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0c766b] px-4 text-sm font-semibold text-white transition hover:bg-[#095f56] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c766b] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
            {pending ? "Searching…" : "Apply filters"}
          </button>
        </form>
      </Panel>

      <div className="mt-6">
        <Panel title="Appointment list" description={`Clinic date ${list.date} · showing up to 100 matching records`}>
          {list.rows.length === 0 ? (
            <EmptyState
              title="No appointments match these filters"
              description="Try different search terms or adjust the date and status. Online requests will appear here when submitted."
            />
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {list.rows.map((appointment) => (
                  <AppointmentCard key={appointment.id} clinicSlug={clinicSlug} appointment={appointment} timeZone={list.timeZone} />
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="pb-3 pr-4 font-semibold">Patient</th>
                      <th className="pb-3 pr-4 font-semibold">Doctor</th>
                      <th className="pb-3 pr-4 font-semibold">Date &amp; time</th>
                      <th className="pb-3 pr-4 font-semibold">Status</th>
                      <th className="pb-3 pr-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {list.rows.map((appointment) => (
                      <tr key={appointment.id} className="align-top">
                        <td className="py-4 pr-4">
                          <Link href={`/admin/${clinicSlug}/appointments/${appointment.id}`} className="font-semibold text-slate-900 hover:text-[#0c766b]">{appointment.patientName}</Link>
                        </td>
                        <td className="py-4 pr-4">
                          <p className="font-medium text-slate-800">{appointment.doctorName}</p>
                          <p className="mt-1 text-xs text-slate-500">{appointment.doctorSpecialty}</p>
                        </td>
                        <td className="py-4 pr-4 text-slate-700">{formatClinicDateTime(appointment.startsAt, list.timeZone)}</td>
                        <td className="py-4 pr-4"><StatusBadge status={appointment.status} /></td>
                        <td className="py-4 pr-4"><AppointmentActions clinicSlug={clinicSlug} appointment={appointment} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Panel>
      </div>
    </>
  );
}

function AppointmentActions({
  clinicSlug,
  appointment,
}: {
  clinicSlug: string;
  appointment: AppointmentListDto["rows"][number];
}) {
  if (appointment.status === "requested") {
    return (
      <div className="flex flex-wrap gap-2">
        <StatusActionForm clinicSlug={clinicSlug} appointmentId={appointment.id} status="confirmed" label="Confirm" disabled={appointment.isExpired} />
        <StatusActionForm clinicSlug={clinicSlug} appointmentId={appointment.id} status="cancelled" label="Cancel" />
      </div>
    );
  }
  if (appointment.status === "confirmed") {
    return (
      <div className="flex flex-wrap gap-2">
        <StatusActionForm clinicSlug={clinicSlug} appointmentId={appointment.id} status="completed" label="Complete" />
        <StatusActionForm clinicSlug={clinicSlug} appointmentId={appointment.id} status="cancelled" label="Cancel" />
      </div>
    );
  }
  return <span className="text-xs text-slate-400">No status actions</span>;
}

function StatusActionForm({
  clinicSlug,
  appointmentId,
  status,
  label,
  disabled = false,
}: {
  clinicSlug: string;
  appointmentId: string;
  status: "confirmed" | "cancelled" | "completed";
  label: string;
  disabled?: boolean;
}) {
  return (
    <form action={updateAppointmentStatusAction}>
      <input type="hidden" name="clinicSlug" value={clinicSlug} />
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" disabled={disabled} title={disabled ? "This request has expired." : undefined} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
        {label}
      </button>
    </form>
  );
}

function AppointmentCard({
  clinicSlug,
  appointment,
  timeZone,
}: {
  clinicSlug: string;
  appointment: AppointmentListDto["rows"][number];
  timeZone: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/admin/${clinicSlug}/appointments/${appointment.id}`} className="font-semibold text-slate-900 hover:text-[#0c766b]">{appointment.patientName}</Link>
        <StatusBadge status={appointment.status} />
      </div>
      <p className="mt-3 text-sm font-medium text-slate-800">{appointment.doctorName}</p>
      <p className="mt-1 text-xs text-slate-500">{appointment.doctorSpecialty}</p>
      <p className="mt-3 text-sm text-slate-600">{formatClinicDateTime(appointment.startsAt, timeZone)}</p>
      <div className="mt-4 border-t border-slate-100 pt-3"><AppointmentActions clinicSlug={clinicSlug} appointment={appointment} /></div>
    </article>
  );
}
