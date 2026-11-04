import Link from "next/link";

export default function AdminNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f8f7] px-4 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_20px_70px_rgba(23,54,48,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0c766b]">ClinicSync workspace</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Workspace not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">This clinic is unavailable or is not included in your active staff memberships.</p>
        <Link href="/admin" className="mt-6 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#0c766b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#095f56]">Choose a clinic</Link>
      </section>
    </main>
  );
}
