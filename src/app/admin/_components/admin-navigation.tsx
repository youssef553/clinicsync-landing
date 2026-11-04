"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { key: "overview", label: "Overview", segment: "", icon: "overview" },
  { key: "appointments", label: "Appointments", segment: "/appointments", icon: "appointments" },
  { key: "doctors", label: "Doctors", segment: "/doctors", icon: "doctors" },
  { key: "availability", label: "Availability", segment: "/availability", icon: "availability" },
  { key: "patients", label: "Patients", segment: "/patients", icon: "patients" },
] as const;

type IconName = (typeof NAV_ITEMS)[number]["icon"];

function NavIcon({ name }: { name: IconName }) {
  const common = {
    className: "size-[18px] shrink-0",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  if (name === "overview") {
    return <svg {...common}><rect x="3.75" y="3.75" width="6.5" height="6.5" rx="1.5" /><rect x="13.75" y="3.75" width="6.5" height="6.5" rx="1.5" /><rect x="3.75" y="13.75" width="6.5" height="6.5" rx="1.5" /><rect x="13.75" y="13.75" width="6.5" height="6.5" rx="1.5" /></svg>;
  }
  if (name === "appointments") {
    return <svg {...common}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17M8 13h3M8 16.5h6" /></svg>;
  }
  if (name === "doctors") {
    return <svg {...common}><path d="M8.5 4.25a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5ZM2.75 20v-1.25a5.75 5.75 0 0 1 11.5 0V20M16 8.5h5.25M18.625 5.875v5.25" /></svg>;
  }
  if (name === "availability") {
    return <svg {...common}><circle cx="12" cy="12" r="8.25" /><path d="M12 7v5l3.25 2" /></svg>;
  }
  return <svg {...common}><circle cx="9" cy="8" r="3.25" /><path d="M2.75 20v-1a6.25 6.25 0 0 1 12.5 0v1M16.25 5.25a3.25 3.25 0 0 1 0 6.25M18 14.5a5.5 5.5 0 0 1 3.25 5" /></svg>;
}

export function AdminNavigation({
  clinicSlug,
  mobile = false,
}: {
  clinicSlug: string;
  mobile?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={mobile ? "Mobile dashboard navigation" : "Dashboard navigation"}>
      <ul className={mobile ? "flex min-w-max gap-1 px-4 py-2" : "space-y-1"}>
        {NAV_ITEMS.map((item) => {
          const href = `/admin/${clinicSlug}${item.segment}`;
          const active = item.segment
            ? pathname === href || pathname.startsWith(`${href}/`)
            : pathname === `/admin/${clinicSlug}`;
          return (
            <li key={item.key}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`${mobile ? "inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm" : "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm"} font-medium transition ${active ? "bg-[#e8f5f1] text-[#0a645a]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
