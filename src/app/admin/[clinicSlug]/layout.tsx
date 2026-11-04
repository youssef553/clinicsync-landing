import type { ReactNode } from "react";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { AdminChrome } from "@/app/admin/_components/admin-chrome";
import { AccessUnavailable } from "@/app/admin/_components/access-state";
import { getLoginRedirectPath, getStaffAccess } from "@/lib/server/staff-auth";
import { isClinicSlug } from "@/lib/server/admin-validation";

export default function ClinicWorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ clinicSlug: string }>;
}) {
  return (
    <Suspense fallback={<ClinicWorkspaceFallback />}>
      <VerifiedClinicWorkspace params={params}>{children}</VerifiedClinicWorkspace>
    </Suspense>
  );
}

async function VerifiedClinicWorkspace({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ clinicSlug: string }>;
}) {
  const { clinicSlug } = await params;
  if (!isClinicSlug(clinicSlug)) notFound();

  const access = await getStaffAccess();
  const nextPath = `/admin/${clinicSlug}`;
  if (access.status === "unauthenticated") redirect(getLoginRedirectPath(nextPath));
  if (access.status === "not_staff") {
    redirect(getLoginRedirectPath(nextPath, "no-staff-access"));
  }
  if (access.status === "unconfigured") return <AccessUnavailable configured={false} />;
  if (access.status === "unavailable") return <AccessUnavailable />;

  const membership = access.memberships.find((item) => item.clinicSlug === clinicSlug);
  if (!membership) notFound();

  return <AdminChrome membership={membership}>{children}</AdminChrome>;
}

function ClinicWorkspaceFallback() {
  return (
    <main className="min-h-screen bg-[#f5f8f7] p-5 sm:p-8">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-16 rounded-2xl bg-white ring-1 ring-slate-200" />
        <div className="mt-8 h-9 w-64 rounded-lg bg-slate-200" />
        <div className="mt-3 h-5 w-96 max-w-full rounded bg-slate-200" />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((item) => <div key={item} className="h-32 rounded-2xl bg-white ring-1 ring-slate-200" />)}
        </div>
      </div>
    </main>
  );
}
