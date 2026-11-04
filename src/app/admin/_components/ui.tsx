import type { ReactNode } from "react";
import Link from "next/link";
import type { AppointmentStatus } from "@/lib/server/admin-validation";

export function ClinicLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#0c766b] text-lg font-bold text-white shadow-sm">
        C
      </span>
      {!compact && (
        <span className="text-lg font-semibold tracking-tight text-[#193a35]">
          Clinic<span className="text-[#0c766b]">Sync</span>
        </span>
      )}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0c766b]">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h1>
        {description && <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(23,54,48,0.045)] ${className}`}>
      {(title || description || action) && (
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            {title && <h2 className="font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  detail,
  accent = false,
}: {
  label: string;
  value: number | string;
  detail?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 shadow-[0_8px_28px_rgba(23,54,48,0.045)] ${accent ? "border-[#b9e1d9] bg-[#eaf7f3]" : "border-slate-200/80 bg-white"}`}>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      {detail && <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>}
    </div>
  );
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const style = {
    requested: "bg-amber-50 text-amber-800 ring-amber-200",
    confirmed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    cancelled: "bg-slate-100 text-slate-600 ring-slate-200",
    completed: "bg-sky-50 text-sky-800 ring-sky-200",
  }[status];
  const label = status === "requested" ? "Pending" : status[0].toUpperCase() + status.slice(1);

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style}`}>
      {label}
    </span>
  );
}

export function Notice({
  title,
  children,
  tone = "info",
}: {
  title?: string;
  children: ReactNode;
  tone?: "info" | "warning" | "error" | "success";
}) {
  const style = {
    info: "border-sky-200 bg-sky-50 text-sky-950",
    warning: "border-amber-200 bg-amber-50 text-amber-950",
    error: "border-rose-200 bg-rose-50 text-rose-950",
    success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  }[tone];
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm leading-6 ${style}`} role={tone === "error" ? "alert" : "status"}>
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? "mt-1" : ""}>{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center">
      <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-white text-[#0c766b] ring-1 ring-slate-200">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M7 3.75h10A2.25 2.25 0 0 1 19.25 6v12A2.25 2.25 0 0 1 17 20.25H7A2.25 2.25 0 0 1 4.75 18V6A2.25 2.25 0 0 1 7 3.75Z" />
          <path d="M8 8h8M8 12h5" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-600">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PrimaryButton({
  children,
  type = "submit",
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  type?: "submit" | "button";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center justify-center rounded-xl bg-[#0c766b] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#095f56] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c766b] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c766b] focus-visible:ring-offset-2 ${className}`}
    >
      {children}
    </Link>
  );
}

export function FormField({
  label,
  name,
  type = "text",
  required = false,
  defaultValue,
  placeholder,
  min,
  max,
  maxLength,
  step,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: "text" | "email" | "password" | "date" | "time" | "number";
  required?: boolean;
  defaultValue?: string | number;
  placeholder?: string;
  min?: string | number;
  max?: string | number;
  maxLength?: number;
  step?: string | number;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      <span>{label}</span>
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        min={min}
        max={max}
        maxLength={maxLength}
        step={step}
        autoComplete={autoComplete}
        className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#0c766b] focus:ring-2 focus:ring-[#0c766b]/15"
      />
    </label>
  );
}
