import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_URL_VARIABLE = "NEXT_PUBLIC_SUPABASE_URL";
const SUPABASE_PUBLISHABLE_KEY_VARIABLE = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

export class SupabaseServerConfigurationError extends Error {
  constructor() {
    super(
      `Supabase server configuration is missing or invalid. Set ${SUPABASE_URL_VARIABLE} and ${SUPABASE_PUBLISHABLE_KEY_VARIABLE}.`,
    );
    this.name = "SupabaseServerConfigurationError";
  }
}

function getSupabaseConfiguration(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    throw new SupabaseServerConfigurationError();
  }

  try {
    const parsedUrl = new URL(url);
    const isLocalHttp =
      parsedUrl.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(parsedUrl.hostname);

    if (parsedUrl.protocol !== "https:" && !isLocalHttp) {
      throw new SupabaseServerConfigurationError();
    }
  } catch {
    throw new SupabaseServerConfigurationError();
  }

  return { url, publishableKey };
}

export async function createSupabaseServerClient() {
  const { url, publishableKey } = getSupabaseConfiguration();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Next.js Server Components cannot set response headers. The separate
        // session-refresh phase will propagate Supabase's cache headers in Proxy.
        void headers;

        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // In a Server Component render, the cookie store is read-only.
          // Refresh-cookie persistence is intentionally deferred to the Proxy phase.
        }
      },
    },
  });
}
