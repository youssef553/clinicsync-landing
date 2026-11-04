const DEFAULT_NEXT_PATH = "/admin";

/**
 * Accept only same-origin, root-relative destinations for post-auth navigation.
 * The returned value is a path/query/hash, never an absolute external URL.
 */
export function getSafeNextPath(
  candidate: string | null | undefined,
  baseUrl: string | URL,
): string {
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(candidate)
  ) {
    return DEFAULT_NEXT_PATH;
  }

  try {
    const base = typeof baseUrl === "string" ? new URL(baseUrl) : baseUrl;
    const destination = new URL(candidate, base);

    if (destination.origin !== base.origin) {
      return DEFAULT_NEXT_PATH;
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return DEFAULT_NEXT_PATH;
  }
}
