import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { getSafeNextPath } from "@/lib/supabase/redirects";
import {
  SupabaseServerConfigurationError,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { isClinicSlug, isUuid } from "@/lib/server/admin-validation";
import { parseClinicMembershipRows, type ClinicMembership } from "@/lib/server/staff-membership";

export type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type AuthorizedStaff = {
  userId: string;
  memberships: ClinicMembership[];
  supabase: SupabaseServerClient;
};

export type StaffAccessResult =
  | { status: "unauthenticated" }
  | { status: "not_staff" }
  | { status: "unconfigured" }
  | { status: "unavailable" }
  | ({ status: "authorized" } & AuthorizedStaff);

export type ClinicStaffContext = {
  userId: string;
  clinicId: string;
  clinicSlug: string;
  clinicName: string;
  timeZone: string;
  role: "admin" | "staff";
  supabase: SupabaseServerClient;
};

const SAFE_BASE_URL = "https://clinicsync.invalid";

export function getLoginRedirectPath(nextPath: string, reason?: string): string {
  const safeNext = getSafeNextPath(nextPath, SAFE_BASE_URL);
  const query = new URLSearchParams({ next: safeNext });
  if (reason) query.set("reason", reason);
  return `/login?${query.toString()}`;
}

export const getStaffAccess = cache(async (): Promise<StaffAccessResult> => {
  let supabase: SupabaseServerClient;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    return error instanceof SupabaseServerConfigurationError
      ? { status: "unconfigured" }
      : { status: "unavailable" };
  }

  let claimsResult: Awaited<ReturnType<typeof supabase.auth.getClaims>>;
  try {
    claimsResult = await supabase.auth.getClaims();
  } catch {
    return { status: "unavailable" };
  }

  if (claimsResult.error) return { status: "unauthenticated" };

  const verifiedUserId = claimsResult.data?.claims?.sub;
  if (typeof verifiedUserId !== "string" || !isUuid(verifiedUserId)) {
    return { status: "unauthenticated" };
  }

  let membershipResult;
  try {
    membershipResult = await supabase
      .from("staff_members")
      .select(
        "user_id, clinic_id, role, is_active, clinic:clinics!inner(id, slug, name, time_zone, is_active)",
      )
      .eq("user_id", verifiedUserId)
      .eq("is_active", true);
  } catch {
    return { status: "unavailable" };
  }

  if (membershipResult.error) return { status: "unavailable" };

  const memberships = parseClinicMembershipRows(verifiedUserId, membershipResult.data);
  if (memberships.length === 0) return { status: "not_staff" };

  return {
    status: "authorized",
    userId: verifiedUserId,
    memberships,
    supabase,
  };
});

export async function requireClinicStaff(
  clinicSlug: string,
  nextPath = "/admin",
): Promise<ClinicStaffContext> {
  if (!isClinicSlug(clinicSlug)) notFound();

  const access = await getStaffAccess();
  if (access.status === "unauthenticated") {
    redirect(getLoginRedirectPath(nextPath));
  }
  if (access.status === "not_staff") {
    redirect(getLoginRedirectPath(nextPath, "no-staff-access"));
  }
  if (access.status === "unconfigured") {
    throw new Error("ClinicSync authentication is not configured.");
  }
  if (access.status === "unavailable") {
    throw new Error("ClinicSync staff access could not be verified.");
  }

  const membership = access.memberships.find((item) => item.clinicSlug === clinicSlug);
  if (!membership) notFound();

  return {
    userId: access.userId,
    clinicId: membership.clinicId,
    clinicSlug: membership.clinicSlug,
    clinicName: membership.clinicName,
    timeZone: membership.timeZone,
    role: membership.role,
    supabase: access.supabase,
  };
}

export function redirectUnauthenticatedAccess(
  status: StaffAccessResult["status"],
  nextPath: string,
): void {
  if (status === "unauthenticated") {
    redirect(getLoginRedirectPath(nextPath));
  }
  if (status === "not_staff") {
    redirect(getLoginRedirectPath(nextPath, "no-staff-access"));
  }
}
