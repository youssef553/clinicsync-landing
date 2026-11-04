import { createHash } from "node:crypto";

export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export type BookingRateLimiter = {
  checkClient(request: Request): RateLimitDecision;
  checkPhone(phoneE164: string): RateLimitDecision;
};

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimiterOptions = {
  now?: () => number;
  maxEntries?: number;
  clientLimit?: number;
  phoneLimit?: number;
  clientWindowMs?: number;
  phoneWindowMs?: number;
};

function digest(scope: string, value: string): string {
  return createHash("sha256").update(`${scope}\0${value}`).digest("hex");
}

export function createBookingRateLimiter(
  options: RateLimiterOptions = {},
): BookingRateLimiter {
  const buckets = new Map<string, Bucket>();
  const now = options.now ?? Date.now;
  const maxEntries = options.maxEntries ?? 4_096;
  const clientLimit = options.clientLimit ?? 12;
  const phoneLimit = options.phoneLimit ?? 3;
  const clientWindowMs = options.clientWindowMs ?? 60_000;
  const phoneWindowMs = options.phoneWindowMs ?? 10 * 60_000;

  function consume(
    scope: string,
    value: string,
    limit: number,
    windowMs: number,
  ): RateLimitDecision {
    const currentTime = now();
    const key = digest(scope, value);
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= currentTime) {
      if (buckets.size >= maxEntries) {
        for (const [candidate, bucket] of buckets) {
          if (bucket.resetAt <= currentTime) buckets.delete(candidate);
        }
        while (buckets.size >= maxEntries) {
          const oldest = buckets.keys().next().value;
          if (oldest === undefined) break;
          buckets.delete(oldest);
        }
      }
      buckets.set(key, { count: 1, resetAt: currentTime + windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (existing.count >= limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - currentTime) / 1_000)),
      };
    }

    existing.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  return {
    checkClient(request) {
      // Vercel sets x-forwarded-for for incoming requests. Only the hashed value
      // is kept in memory; the raw address is neither logged nor retained.
      const forwarded =
        request.headers.get("x-vercel-forwarded-for") ??
        request.headers.get("x-forwarded-for") ??
        request.headers.get("x-real-ip") ??
        "unknown";
      const address = forwarded.split(",", 1)[0]?.trim().slice(0, 128) || "unknown";
      return consume("client", address, clientLimit, clientWindowMs);
    },
    checkPhone(phoneE164) {
      return consume("phone", phoneE164, phoneLimit, phoneWindowMs);
    },
  };
}

declare global {
  var __clinicSyncBookingRateLimiter: BookingRateLimiter | undefined;
}

function sharedRateLimiter(): BookingRateLimiter {
  globalThis.__clinicSyncBookingRateLimiter ??= createBookingRateLimiter();
  return globalThis.__clinicSyncBookingRateLimiter;
}

export function checkBookingClientRateLimit(request: Request): RateLimitDecision {
  return sharedRateLimiter().checkClient(request);
}

export function checkBookingPhoneRateLimit(phoneE164: string): RateLimitDecision {
  return sharedRateLimiter().checkPhone(phoneE164);
}
