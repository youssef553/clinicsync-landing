import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccessUnavailable } from "@/app/admin/_components/access-state";
import { ClinicLogo, PageHeader } from "@/app/admin/_components/ui";
import { getLoginRedirectPath, getStaffAccess } from "@/lib/server/staff-auth";

export default function AdminClinicChooser() {
  return (
    <Suspense fallback={<ClinicChooserFallback />}>
      <ClinicChooserContent />
    </Suspense>
  );
}

async function ClinicChooserContent() {
  const access = await getStaffAccess();
  if (access.status === "unauthenticated") redirect(getLoginRedirectPath("/admin"));
  if (access.status === "not_staff") {
    redirect(getLoginRedirectPath("/admin", "no-staff-access"));
  }
  if (access.status === "unconfigured") return <AccessUnavailable configured={false} />;
  if (access.status === "unavailable") return <AccessUnavailable />;

  if (access.memberships.length === 1) {
    redirect(`/admin/${access.memberships[0].clinicSlug}`);
  }

  return (
    <main className="min-h-screen bg-[#f5f8f7] px-4 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="inline-block" aria-label="ClinicSync clinic selection">
          <ClinicLogo />
        </Link>
        <div className="mt-10">
          <PageHeader
            eyebrow="Staff workspace"
            title="Choose a clinic"
            description="Your active memberships determine which clinic records you can access. Choose a workspace to continue."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {access.memberships.map((membership) => (
            <Link
              key={membership.clinicId}
              href={`/admin/${membership.clinicSlug}`}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(23,54,48,0.045)] transition hover:-translate-y-0.5 hover:border-[#a6d7ce] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c766b] focus-visible:ring-offset-2"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-[#e8f5f1] text-[#0c766b]">
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                    <path d="M4 20V6.5L12 3l8 3.5V20M2.75 20h18.5M8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01M10 20v-3.5h4V20" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {membership.role === "admin" ? "Administrator" : "Staff"}
                </span>
              </div>
              <h2 className="mt-5 text-lg font-semibold text-slate-950 group-hover:text-[#0c766b]">{membership.clinicName}</h2>
              <p className="mt-1 text-sm text-slate-500">{membership.timeZone}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0c766b]">
                Open workspace
                <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-8 text-xs text-slate-500">Clinic data is isolated by active membership and database row-level security.</p>
      </div>
    </main>
  );
}

function ClinicChooserFallback() {
  return (
    <main className="min-h-screen bg-[#f5f8f7] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl animate-pulse">
        <div className="h-10 w-36 rounded-xl bg-slate-200" />
        <div className="mt-12 h-9 w-64 rounded-lg bg-slate-200" />
        <div className="mt-3 h-5 w-96 max-w-full rounded bg-slate-200" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => <div key={item} className="h-48 rounded-2xl bg-white ring-1 ring-slate-200" />)}
        </div>
      </div>
    </main>
  );
}
