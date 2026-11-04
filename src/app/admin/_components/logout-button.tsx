"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setPending(true);
    setError("");
    try {
      const { error: signOutError } = await createSupabaseBrowserClient().auth.signOut();
      if (signOutError) {
        setError("We could not sign you out. Please try again.");
        setPending(false);
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setError("We could not sign you out. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={handleLogout}
        disabled={pending}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c766b] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M10 4.25H6.75A2.5 2.5 0 0 0 4.25 6.75v10.5a2.5 2.5 0 0 0 2.5 2.5H10M14.5 16.5l4.5-4.5-4.5-4.5M19 12H9.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {error && <p className="mt-1 text-xs text-rose-700" role="alert">{error}</p>}
    </div>
  );
}
