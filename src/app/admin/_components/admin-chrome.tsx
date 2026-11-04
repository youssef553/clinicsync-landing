import type { ReactNode } from "react";
import Link from "next/link";
import type { ClinicMembership } from "@/lib/server/staff-membership";
import { AdminNavigation } from "@/app/admin/_components/admin-navigation";
import { ClinicLogo } from "@/app/admin/_components/ui";
import { LogoutButton } from "@/app/admin/_components/logout-button";

export function AdminChrome({
  membership,
  children,
}: {
  membership: ClinicMembership;
  children: ReactNode;
}) {
  const roleLabel = membership.role === "admin" ? "Administrator" : "Staff";

  return (
    <div className="min-h-screen bg-[#f5f8f7] text-slate-900 lg:flex">
      <aside className="hidden w-[264px] shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="px-6 pb-6 pt-7">
          <Link href="/admin" aria-label="Choose a clinic">
            <ClinicLogo />
          </Link>
          <div className="mt-7 rounded-2xl bg-[#f3f8f6] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Clinic workspace</p>
            <p className="mt-1 truncate font-semibold text-slate-900">{membership.clinicName}</p>
            <p className="mt-0.5 text-xs text-slate-500">{membership.timeZone}</p>
          </div>
        </div>
        <div className="px-4">
          <AdminNavigation clinicSlug={membership.clinicSlug} />
        </div>
        <div className="mt-auto p-5">
          <Link href="/admin" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950">
            <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M14.5 5.5 8 12l6.5 6.5M8.5 12h12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Switch clinic
          </Link>
          <div className="mt-4 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
            Staff-only workspace<br />
            Access is checked by Supabase RLS
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
          <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3 lg:hidden">
              <Link href="/admin" aria-label="Choose a clinic">
                <ClinicLogo compact />
              </Link>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{membership.clinicName}</p>
                <Link href="/admin" className="text-xs font-medium text-[#0c766b] hover:underline">Switch clinic</Link>
              </div>
            </div>
            <div className="hidden min-w-0 lg:block">
              <p className="text-sm font-semibold text-slate-900">{membership.clinicName}</p>
              <p className="text-xs text-slate-500">{membership.timeZone} · Secure staff workspace</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 sm:inline-flex">
                {roleLabel}
              </span>
              <LogoutButton />
            </div>
          </div>
          <div className="overflow-x-auto border-t border-slate-100 lg:hidden">
            <AdminNavigation clinicSlug={membership.clinicSlug} mobile />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
