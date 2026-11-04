import Link from "next/link";
import { ClinicLogo } from "@/app/admin/_components/ui";

export function AccessUnavailable({
  configured = true,
  backHref = "/login",
  backLabel = "Back to sign in",
}: {
  configured?: boolean;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f8f7] px-4 py-12">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_24px_80px_rgba(23,54,48,0.1)] sm:p-10">
        <ClinicLogo />
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h1 className="text-xl font-semibold text-amber-950">
            {configured ? "Access verification is unavailable" : "ClinicSync is not configured"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-amber-950/80">
            {configured
              ? "We could not verify an active clinic staff membership. No clinic data has been loaded. Please retry later or contact your project administrator."
              : "Set the public Supabase URL and publishable key in the deployment environment, then restart the application. Do not use a service-role key here."}
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={backHref} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#0c766b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#095f56]">
            {backLabel}
          </Link>
          <Link href="/" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Public site
          </Link>
        </div>
      </section>
    </main>
  );
}
