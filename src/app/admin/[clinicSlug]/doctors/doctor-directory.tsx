"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyState, Panel } from "@/app/admin/_components/ui";
import type { DoctorDto } from "@/lib/server/admin-data";

export function DoctorDirectory({
  clinicSlug,
  role,
  doctors,
}: {
  clinicSlug: string;
  role: "admin" | "staff";
  doctors: DoctorDto[];
}) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const filteredDoctors = query
    ? doctors.filter((doctor) => `${doctor.name} ${doctor.specialty}`.toLowerCase().includes(query))
    : doctors;

  return (
    <Panel
      title="Clinic doctors"
      description={`${doctors.length} record${doctors.length === 1 ? "" : "s"} loaded (up to 200). Search by doctor name or specialty.`}
    >
      {doctors.length > 0 && (
        <label className="mb-5 block max-w-xl text-sm font-medium text-slate-700">
          <span>Search doctors</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            maxLength={120}
            autoComplete="off"
            placeholder="Name or specialty"
            className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#0c766b] focus:ring-2 focus:ring-[#0c766b]/15"
          />
        </label>
      )}

      {doctors.length === 0 ? (
        <EmptyState
          title="No doctors found"
          description={role === "admin" ? "Add the first doctor above, then configure weekly availability." : "There are no active doctors visible to your staff membership."}
          action={role === "admin" ? <Link href={`/admin/${clinicSlug}/availability`} className="text-sm font-semibold text-[#0c766b] hover:underline">Open availability management →</Link> : undefined}
        />
      ) : filteredDoctors.length === 0 ? (
        <EmptyState title="No matching doctors" description="Try a different name or specialty." />
      ) : (
        <>
          <p className="mb-3 text-xs text-slate-500" aria-live="polite">
            Showing {filteredDoctors.length} of {doctors.length} loaded doctors.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredDoctors.map((doctor) => (
              <article key={doctor.id} className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-[#c6e4de] hover:shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-[#e8f5f1] text-[#0c766b]">
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                      <path d="M8.5 4.25a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5ZM2.75 20v-1.25a5.75 5.75 0 0 1 11.5 0V20M16 8.5h5.25M18.625 5.875v5.25" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${doctor.isActive ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                    {doctor.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <h2 className="mt-5 text-lg font-semibold text-slate-950">{doctor.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{doctor.specialty}</p>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-xs text-slate-500">Doctor record</span>
                  <Link href={`/admin/${clinicSlug}/doctors/${doctor.id}`} className="text-sm font-semibold text-[#0c766b] hover:underline">View details <span aria-hidden="true">→</span></Link>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}
