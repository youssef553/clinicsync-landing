import { validateBookingPayload, type BookingInput } from "@/lib/server/booking-validation";
import type { BookingDatabaseOutcome } from "@/lib/server/booking-types";
import type { RateLimitDecision } from "@/lib/server/rate-limit";

const MAX_BODY_BYTES = 8 * 1024;
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export type BookingHttpDependencies = {
  checkClientRateLimit(request: Request): RateLimitDecision;
  checkPhoneRateLimit(phoneE164: string): RateLimitDecision;
  book(input: BookingInput): Promise<BookingDatabaseOutcome>;
  onDatabaseFailure?(): void;
};

type BodyResult =
  | { ok: true; value: unknown }
  | { ok: false; status: 400 | 413; error: "invalid_json" | "request_too_large" };

function jsonResponse(body: unknown, status: number, extraHeaders?: HeadersInit): Response {
  const headers = new Headers(NO_STORE_HEADERS);
  new Headers(extraHeaders).forEach((value, key) => headers.set(key, value));
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

function rateLimitResponse(decision: RateLimitDecision): Response {
  return jsonResponse(
    { error: "rate_limited" },
    429,
    { "Retry-After": String(decision.retryAfterSeconds) },
  );
}

async function readJsonBody(request: Request): Promise<BodyResult> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const declaredLength = Number(contentLength);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      return { ok: false, status: 413, error: "request_too_large" };
    }
  }

  if (!request.body) return { ok: false, status: 400, error: "invalid_json" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // The response remains a generic 413 if the request stream is already closed.
        }
        return { ok: false, status: 413, error: "request_too_large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, error: "invalid_json" };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, status: 400, error: "invalid_json" };
  }
}

function reportDatabaseFailure(dependencies: BookingHttpDependencies): void {
  try {
    dependencies.onDatabaseFailure?.();
  } catch {
    // Logging must not change the safe API response.
  }
}

function isCompleteSuccess(
  result: BookingDatabaseOutcome,
): result is BookingDatabaseOutcome & {
  appointmentId: string;
  startsAt: Date;
  endsAt: Date;
  expiresAt: Date;
} {
  return (
    typeof result.appointmentId === "string" &&
    result.startsAt instanceof Date &&
    Number.isFinite(result.startsAt.getTime()) &&
    result.endsAt instanceof Date &&
    Number.isFinite(result.endsAt.getTime()) &&
    result.expiresAt instanceof Date &&
    Number.isFinite(result.expiresAt.getTime())
  );
}

export async function handleBookingPost(
  request: Request,
  dependencies: BookingHttpDependencies,
): Promise<Response> {
  const clientLimit = dependencies.checkClientRateLimit(request);
  if (!clientLimit.allowed) return rateLimitResponse(clientLimit);

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.split(";", 1)[0]?.trim() !== "application/json") {
    return jsonResponse({ error: "unsupported_media_type" }, 415);
  }

  const body = await readJsonBody(request);
  if (!body.ok) return jsonResponse({ error: body.error }, body.status);

  const validation = validateBookingPayload(body.value);
  if (!validation.ok) return jsonResponse({ error: validation.error }, 400);

  const phoneLimit = dependencies.checkPhoneRateLimit(validation.value.phoneE164);
  if (!phoneLimit.allowed) return rateLimitResponse(phoneLimit);

  let result: BookingDatabaseOutcome;
  try {
    result = await dependencies.book(validation.value);
  } catch {
    reportDatabaseFailure(dependencies);
    return jsonResponse({ error: "booking_unavailable" }, 503);
  }

  switch (result.outcome) {
    case "requested":
      if (!isCompleteSuccess(result)) {
        reportDatabaseFailure(dependencies);
        return jsonResponse({ error: "booking_unavailable" }, 503);
      }
      return jsonResponse(
        {
          success: true,
          appointment: {
            id: result.appointmentId,
            status: "requested",
            startsAt: result.startsAt.toISOString(),
            endsAt: result.endsAt.toISOString(),
            expiresAt: result.expiresAt.toISOString(),
            timeZone: "Africa/Cairo",
          },
        },
        201,
      );
    case "slot_conflict":
      return jsonResponse({ error: "slot_unavailable" }, 409);
    case "doctor_unavailable":
      return jsonResponse({ error: "doctor_unavailable" }, 404);
    case "invalid_input":
      return jsonResponse({ error: "invalid_request" }, 400);
    case "off_schedule":
    case "misaligned_slot":
    case "invalid_slot":
    case "invalid_local_time":
      return jsonResponse({ error: "invalid_slot" }, 422);
    case "time_not_future":
      return jsonResponse({ error: "start_time_must_be_future" }, 422);
    case "too_close_to_start":
      return jsonResponse({ error: "booking_window_closed" }, 422);
    default:
      reportDatabaseFailure(dependencies);
      return jsonResponse({ error: "booking_unavailable" }, 503);
  }
}
