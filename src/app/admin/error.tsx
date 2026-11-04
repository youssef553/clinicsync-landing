"use client";

export default function AdminRouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f8f7] px-4 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_20px_70px_rgba(23,54,48,0.08)] sm:p-9">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 8v4m0 4h.01M10.3 3.9 2.7 17.1a1.7 1.7 0 0 0 1.5 2.55h15.6a1.7 1.7 0 0 0 1.5-2.55L13.7 3.9a1.95 1.95 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-slate-950">Dashboard unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">The request could not be completed. No appointment or patient information is displayed on this error screen.</p>
        <button type="button" onClick={reset} className="mt-6 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#0c766b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#095f56] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c766b] focus-visible:ring-offset-2">Try again</button>
      </section>
    </main>
  );
}
