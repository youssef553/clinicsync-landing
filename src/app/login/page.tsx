import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { AccessUnavailable } from "@/app/admin/_components/access-state";
import { ClinicLogo, Notice } from "@/app/admin/_components/ui";
import { LogoutButton } from "@/app/admin/_components/logout-button";
import { getSafeNextPath } from "@/lib/supabase/redirects";
import { getStaffAccess } from "@/lib/server/staff-auth";

const SAFE_BASE_URL = "https://clinicsync.invalid";
type LoginSearchParams = Promise<{ next?: string | string[]; reason?: string | string[] }>;

export default function LoginPage({ searchParams }: { searchParams: LoginSearchParams }) {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginContent({ searchParams }: { searchParams: LoginSearchParams }) {
  const query = await searchParams;
  const candidate = typeof query.next === "string" ? query.next : undefined;
  const nextPath = getSafeNextPath(candidate, SAFE_BASE_URL);
  const access = await getStaffAccess();

  if (access.status === "authorized") redirect(nextPath);
  if (access.status === "unconfigured") return <AccessUnavailable configured={false} backHref="/" backLabel="Return to the public site" />;
  if (access.status === "unavailable") return <AccessUnavailable backHref="/" backLabel="Return to the public site" />;

  return (
    <main className="min-h-screen bg-[#f5f8f7] lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
      <section className="relative hidden overflow-hidden bg-[#163a35] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div className="absolute -right-32 -top-28 size-96 rounded-full border border-white/10" />
        <div className="absolute -bottom-48 -left-24 size-[500px] rounded-full border border-white/10" />
        <div className="relative z-10">
          <ClinicLogo />
          <div className="mt-28 max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9ce0d3]">Clinic operations</p>
            <h1 className="mt-4 text-5xl font-semibold leading-[1.12] tracking-tight xl:text-6xl">
              A clearer day for your clinic team.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/75">
              Review appointment requests, manage doctor schedules, and find patient records in a staff-only workspace.
            </p>
          </div>
          <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
            {[
              ["01", "Clinic-scoped access"],
              ["02", "Protected by RLS"],
              ["03", "Cairo local schedule"],
            ].map(([number, label]) => (
              <div key={number} className="rounded-2xl border border-white/15 bg-white/[0.06] p-4">
                <p className="text-xs font-semibold text-[#9ce0d3]">{number}</p>
                <p className="mt-2 text-sm font-medium text-white/90">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-xs text-white/50">Authorized staff only · No public account creation</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8 lg:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><ClinicLogo /></div>
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_80px_rgba(23,54,48,0.09)] sm:p-9">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0c766b]">Staff portal</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Welcome back</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Sign in with your ClinicSync staff email and password.</p>
            </div>

            {access.status === "not_staff" ? (
              <div className="space-y-5">
                <Notice title="No active clinic membership" tone="warning">
                  This signed-in account is not authorized for a clinic workspace. Ask a trusted clinic administrator to review your membership.
                </Notice>
                <LogoutButton />
              </div>
            ) : (
              <LoginForm nextPath={nextPath} />
            )}

            <div className="mt-8 border-t border-slate-100 pt-5 text-center">
              <Link href="/" className="text-sm font-medium text-slate-600 hover:text-[#0c766b]">Return to the public site</Link>
            </div>
          </div>
          <p className="mt-5 text-center text-xs leading-5 text-slate-500">
            Access to patient and appointment data is limited to an active clinic staff membership.
          </p>
        </div>
      </section>
    </main>
  );
}

function LoginFallback() {
  return (
    <main className="min-h-screen bg-[#f5f8f7] lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <div className="hidden bg-[#163a35] lg:block" />
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md animate-pulse rounded-3xl bg-white p-8 shadow ring-1 ring-slate-200">
          <div className="h-5 w-24 rounded bg-slate-200" />
          <div className="mt-4 h-9 w-56 rounded bg-slate-200" />
          <div className="mt-3 h-5 w-72 max-w-full rounded bg-slate-100" />
          <div className="mt-8 h-12 rounded-xl bg-slate-100" />
          <div className="mt-4 h-12 rounded-xl bg-slate-100" />
          <div className="mt-6 h-12 rounded-xl bg-slate-200" />
        </div>
      </div>
    </main>
  );
}
