import Link from "next/link";
import { getDashboardOverview, formatAppointmentDate, AdminDataError } from "@/lib/server/admin-data";
import { StatCard, PageHeader, Panel, EmptyState, Notice } from "@/app/admin/_components/ui";
import { StatusBadge } from "@/app/admin/_components/ui";
import { formatClinicDateTime } from "@/lib/server/date-time";

export default async function ClinicDashboardPage({
  params,
}: {
  params: Promise<{ clinicSlug: string }>;
}) {
  const { clinicSlug } = await params;
  let overview: Awaited<ReturnType<typeof getDashboardOverview>> | null = null;
  try {
    overview = await getDashboardOverview(clinicSlug);
  } catch (error) {
    if (!(error instanceof AdminDataError)) throw error;
  }
  if (!overview) return <DashboardError />;

  const dateLabel = formatClinicDateTime(
    new Date(`${overview.localDate}T12:00:00.000Z`),
    overview.timeZone,
  ).split(",").slice(0, 2).join(",");

  return (
    <>
      <PageHeader
        eyebrow={`${overview.clinicName} · ${overview.timeZone}`}
        title="Clinic overview"
        description={`A live snapshot for ${dateLabel}. Counts and appointments are loaded using this clinic’s active membership and row-level security.`}
        actions={(
          <Link href={`/admin/${clinicSlug}/appointments`} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#0c766b] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#095f56] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c766b] focus-visible:ring-offset-2">
            Review appointments
          </Link>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Appointments today" value={overview.todayCount} detail="All statuses · clinic local date" accent />
        <StatCard label="Pending requests" value={overview.requestedTodayCount} detail="Requests awaiting a decision" />
        <StatCard label="Confirmed today" value={overview.confirmedTodayCount} detail="Scheduled appointments" />
        <StatCard label="Cancelled today" value={overview.cancelledTodayCount} detail="Cancelled appointments" />
        <StatCard label="Active doctors" value={overview.activeDoctorCount} detail="Visible under your clinic access" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
        <Panel
          title="Today's schedule"
          description={`Showing ${overview.todayAppointments.length} of ${overview.todayCount} appointments for ${overview.localDate} (${overview.timeZone}).`}
          action={<Link href={`/admin/${clinicSlug}/appointments`} className="text-sm font-semibold text-[#0c766b] hover:underline">View all</Link>}
        >
          {overview.todayAppointments.length === 0 ? (
            <EmptyState
              title="No appointments today"
              description="There are no appointment records for this clinic-local date. New online requests will appear here when submitted."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {overview.todayAppointments.map((appointment) => (
                <Link
                  key={appointment.id}
                  href={`/admin/${clinicSlug}/appointments/${appointment.id}`}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{appointment.patientName}</p>
                    <p className="mt-1 text-sm text-slate-600">{appointment.doctorName}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatAppointmentDate(appointment.startsAt, overview.timeZone)}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <StatusBadge status={appointment.status} />
                    <span className="text-sm font-medium text-[#0c766b]">Details <span aria-hidden="true">→</span></span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="Workspace shortcuts" description="Common clinic operations">
            <div className="space-y-2">
              {[
                ["Appointments", "Review and update supported statuses", "appointments"],
                ["Doctors", "View clinic doctor records", "doctors"],
                ["Availability", "Manage weekly schedule windows", "availability"],
                ["Patients", "Search the clinic patient directory", "patients"],
              ].map(([label, detail, path]) => (
                <Link key={path} href={`/admin/${clinicSlug}/${path}`} className="group flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3.5 py-3 transition hover:border-[#c6e4de] hover:bg-[#f6fbf9]">
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{label}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{detail}</span>
                  </span>
                  <span className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#0c766b]" aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </Panel>
          <Notice title="Tenant-protected workspace" tone="info">
            This view uses your verified staff membership for the selected clinic. The database enforces the same clinic boundary on each query.
          </Notice>
        </div>
      </div>

      <div className="mt-6">
        <Panel
          title="Upcoming appointments"
          description="The next requested or confirmed appointments after today's clinic-local date."
          action={<Link href={`/admin/${clinicSlug}/appointments`} className="text-sm font-semibold text-[#0c766b] hover:underline">View all</Link>}
        >
          {overview.upcomingAppointments.length === 0 ? (
            <EmptyState
              title="No later appointments"
              description="There are no requested or confirmed appointments after today."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {overview.upcomingAppointments.map((appointment) => (
                <Link
                  key={appointment.id}
                  href={`/admin/${clinicSlug}/appointments/${appointment.id}`}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{appointment.patientName}</p>
                    <p className="mt-1 text-sm text-slate-600">{appointment.doctorName}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatAppointmentDate(appointment.startsAt, overview.timeZone)}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <StatusBadge status={appointment.status} />
                    <span className="text-sm font-medium text-[#0c766b]">Details <span aria-hidden="true">→</span></span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

function DashboardError() {
  return (
    <Notice title="Dashboard data is temporarily unavailable" tone="error">
      No clinic records were displayed. Refresh the page or contact your project administrator if the issue continues.
    </Notice>
  );
}
