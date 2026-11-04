"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PrimaryButton } from "@/app/admin/_components/ui";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");
    if (typeof email !== "string" || typeof password !== "string") {
      setError("Enter your staff email and password.");
      return;
    }

    setPending(true);
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError("Sign-in failed. Check your email and password, then try again.");
        setPending(false);
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("Sign-in is temporarily unavailable. Please try again later.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block text-sm font-medium text-slate-700">
        <span>Email address</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="username"
          inputMode="email"
          maxLength={254}
          className="mt-1.5 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#0c766b] focus:ring-2 focus:ring-[#0c766b]/15"
          placeholder="name@clinic.com"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        <span>Password</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          maxLength={256}
          className="mt-1.5 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#0c766b] focus:ring-2 focus:ring-[#0c766b]/15"
          placeholder="Enter your password"
        />
      </label>

      {error && <p className="text-sm leading-6 text-rose-700" role="alert">{error}</p>}

      <PrimaryButton disabled={pending} className="w-full min-h-12">
        {pending ? "Signing in…" : "Sign in securely"}
      </PrimaryButton>
      <p className="text-center text-xs leading-5 text-slate-500">
        Staff accounts are provisioned by a trusted clinic administrator. Public sign-up is not available here.
      </p>
    </form>
  );
}
