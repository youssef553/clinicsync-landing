import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSafeNextPath } from "./redirects";

const LOGIN_PATH = "/login";

function getSupabaseConfiguration(): {
  url: string;
  publishableKey: string;
} | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    const isLocalHttp =
      parsedUrl.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(parsedUrl.hostname);

    if (parsedUrl.protocol !== "https:" && !isLocalHttp) {
      return null;
    }
  } catch {
    return null;
  }

  return { url, publishableKey };
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isAuthEntryPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/auth/callback" ||
    pathname.startsWith("/auth/callback/")
  );
}

function redirectToLogin(
  request: NextRequest,
  supabaseResponse: NextResponse,
  supabaseHeaders: Record<string, string>,
): NextResponse {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = LOGIN_PATH;
  loginUrl.search = "";
  loginUrl.hash = "";

  const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set(
    "next",
    getSafeNextPath(requestedPath, request.nextUrl.origin),
  );

  const redirectResponse = NextResponse.redirect(loginUrl);

  // Preserve Supabase's refreshed/deleted auth cookies on the redirect.
  for (const cookie of supabaseResponse.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }

  // Forward only Supabase's response headers (not Next's internal proxy headers).
  for (const [name, value] of Object.entries(supabaseHeaders)) {
    if (name.toLowerCase() !== "set-cookie" && name.toLowerCase() !== "location") {
      redirectResponse.headers.set(name, value);
    }
  }

  // Auth-dependent redirects must not be cached, including when no cookie refresh occurred.
  if (!redirectResponse.headers.has("cache-control")) {
    redirectResponse.headers.set("Cache-Control", "private, no-store");
  }

  return redirectResponse;
}

/** Refresh Supabase session cookies and gate admin pages on verified JWT claims. */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const requiresAuthentication =
    isAdminPath(pathname) && !isAuthEntryPath(pathname);
  const configuration = getSupabaseConfiguration();

  if (!configuration) {
    const response = NextResponse.next({ request });
    return requiresAuthentication
      ? redirectToLogin(request, response, {})
      : response;
  }

  let supabaseResponse = NextResponse.next({ request });
  const supabaseHeaders: Record<string, string> = {};

  try {
    const supabase = createServerClient(
      configuration.url,
      configuration.publishableKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet, headers) {
            // Make refreshed cookies available to the downstream Server Components.
            for (const { name, value } of cookiesToSet) {
              request.cookies.set(name, value);
            }

            supabaseResponse = NextResponse.next({ request });

            // Keep the cookie attributes (expiry, path, secure, sameSite, etc.).
            for (const { name, value, options } of cookiesToSet) {
              supabaseResponse.cookies.set(name, value, options);
            }

            Object.assign(supabaseHeaders, headers);
            for (const [name, value] of Object.entries(supabaseHeaders)) {
              supabaseResponse.headers.set(name, value);
            }
          },
        },
      },
    );

    const { data, error } = await supabase.auth.getClaims();

    if (requiresAuthentication && (error || !data?.claims)) {
      return redirectToLogin(request, supabaseResponse, supabaseHeaders);
    }
  } catch {
    // Fail closed for admin routes; public, login, and callback routes remain reachable.
    if (requiresAuthentication) {
      return redirectToLogin(request, supabaseResponse, supabaseHeaders);
    }
  }

  return supabaseResponse;
}
