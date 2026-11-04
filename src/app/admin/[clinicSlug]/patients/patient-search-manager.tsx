"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { searchPatientsAction } from "@/app/admin/actions";
import { EmptyState, Notice, PageHeader, Panel } from "@/app/admin/_components/ui";
import type { PatientSearchState } from "@/lib/admin-action-state";
import { formatClinicDateTime } from "@/lib/server/date-time";

export function PatientSearchManager({
  clinicSlug,
  clinicName,
  timeZone,
}: {
  clinicSlug: string;
  clinicName: string;
  timeZone: string;
}) {
  const initialState: PatientSearchState = {
    patients: [],
    timeZone,
    hasSearched: false,
    error: null,
  };
  const [state, setState] = useState(initialState);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const hasSearched = state.hasSearched;

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        setState(await searchPatientsAction(formData));
      } catch {
        setState({ patients: [], timeZone, hasSearched: false, error: "unavailable" });
      }
    });
  }

  return (
    <>
      <PageHeader
        eyebrow={`${clinicName} · ${timeZone}`}
        title="Patients"
        description="Search patient records and review appointment history. Patient search terms are submitted in a POST body, not placed in the page URL."
      />

      {state.error === "invalid" && (
        <div className="mb-5"><Notice title="Check your search" tone="warning">Enter a search term of no more than 80 characters.</Notice></div>
      )}
      {state.error === "unavailable" && (
        <div className="mb-5"><Notice title="Patient search is unavailable" tone="error">No new patient data was displayed. Refresh or contact your clinic administrator if this continues.</Notice></div>
      )}

      <Panel title="Find a patient" description="Search by name or phone number. Contact details shown in results are masked.">
        <form method="post" onSubmit={handleSearchSubmit} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <input type="hidden" name="clinicSlug" value={clinicSlug} />
          <label className="block text-sm font-medium text-slate-700">
            <span>Patient name or phone number</span>
            <input
              type="search"
              name="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              maxLength={80}
              minLength={2}
              required
              autoComplete="off"
              placeholder="Enter at least two characters"
              className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#0c766b] focus:ring-2 focus:ring-[#0c766b]/15"
            />
          </label>
          <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0c766b] px-5 text-sm font-semibold text-white transition hover:bg-[#095f56] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c766b] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
            {pending ? "Searching…" : "Search patients"}
          </button>
        </form>
      </Panel>

      <div className="mt-6">
        <Panel title="Patient records" description={hasSearched ? "Matching clinic records. Contact details remain masked." : "Search results will appear here."}>
          {!hasSearched ? (
            <EmptyState title="Search by name or phone" description="Enter at least two characters to find records in this clinic." />
          ) : state.patients.length === 0 ? (
            <EmptyState title="No matching patients" description="Try a different name or phone number." />
          ) : (
            <div className="divide-y divide-slate-100">
              {state.patients.map((patient) => (
                <Link
                  key={patient.id}
                  href={`/admin/${clinicSlug}/patients/${patient.id}`}
                  className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-semibold text-slate-900">{patient.fullName}</span>
                  <span className="text-sm text-slate-600">{patient.maskedPhone}</span>
                  <span className="text-xs text-slate-500">Added {formatClinicDateTime(patient.createdAt, state.timeZone)}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
