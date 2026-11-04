import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handleBookingPost, type BookingHttpDependencies } from "@/lib/server/booking-http";

const bookingPayload = {
  doctorId: "d1000000-0000-4000-8000-000000000001",
  fullName: "Synthetic API Patient",
  phoneE164: "+201099900101",
  startsAt: "2026-11-04T10:00:00+02:00",
};

const allowed = { allowed: true, retryAfterSeconds: 0 };
const requestedOutcome = {
  outcome: "requested",
  appointmentId: "b1000000-0000-4000-8000-000000000001",
  startsAt: new Date("2026-11-04T08:00:00.000Z"),
  endsAt: new Date("2026-11-04T08:30:00.000Z"),
  expiresAt: new Date("2026-11-03T08:00:00.000Z"),
};

function makeRequest(
  payload: unknown = bookingPayload,
  options: { contentType?: string; contentLength?: string } = {},
): Request {
  const headers = new Headers({
    "content-type": options.contentType ?? "application/json",
    "x-forwarded-for": "203.0.113.15",
  });
  if (options.contentLength) headers.set("content-length", options.contentLength);
  return new Request("https://clinicsync.test/api/appointments", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

function dependencies(
  overrides: Partial<BookingHttpDependencies> = {},
): BookingHttpDependencies {
  return {
    checkClientRateLimit: () => allowed,
    checkPhoneRateLimit: () => allowed,
    book: async () => requestedOutcome,
    ...overrides,
  };
}

describe("handleBookingPost", () => {
  it("returns only safe appointment data for a successful synthetic booking", async () => {
    let receivedPhone = "";
    const response = await handleBookingPost(
      makeRequest(),
      dependencies({
        book: async (input) => {
          receivedPhone = input.phoneE164;
          return requestedOutcome;
        },
      }),
    );

    assert.equal(response.status, 201);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = (await response.json()) as Record<string, unknown>;
    assert.equal(receivedPhone, bookingPayload.phoneE164);
    assert.deepEqual(body, {
      success: true,
      appointment: {
        id: requestedOutcome.appointmentId,
        status: "requested",
        startsAt: "2026-11-04T08:00:00.000Z",
        endsAt: "2026-11-04T08:30:00.000Z",
        expiresAt: "2026-11-03T08:00:00.000Z",
        timeZone: "Africa/Cairo",
      },
    });
    assert.equal(JSON.stringify(body).includes(bookingPayload.phoneE164), false);
    assert.equal(JSON.stringify(body).includes(bookingPayload.fullName), false);
  });

  it("maps a database conflict to 409 without exposing database details", async () => {
    const response = await handleBookingPost(
      makeRequest(),
      dependencies({
        book: async () => ({
          outcome: "slot_conflict",
          appointmentId: null,
          startsAt: null,
          endsAt: null,
          expiresAt: null,
        }),
      }),
    );

    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: "slot_unavailable" });
  });

  it("rejects invalid input before calling the database", async () => {
    let called = false;
    const response = await handleBookingPost(
      makeRequest({ ...bookingPayload, phoneE164: "not-a-phone" }),
      dependencies({ book: async () => { called = true; return requestedOutcome; } }),
    );

    assert.equal(response.status, 400);
    assert.equal(called, false);
    assert.deepEqual(await response.json(), { error: "invalid_request" });
  });

  it("applies client rate limiting before reading or booking", async () => {
    let called = false;
    const response = await handleBookingPost(
      makeRequest(),
      dependencies({
        checkClientRateLimit: () => ({ allowed: false, retryAfterSeconds: 37 }),
        book: async () => { called = true; return requestedOutcome; },
      }),
    );

    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), "37");
    assert.equal(called, false);
  });

  it("rejects oversized JSON and unsupported media types", async () => {
    const tooLarge = await handleBookingPost(
      makeRequest({}, { contentLength: "9000" }),
      dependencies(),
    );
    assert.equal(tooLarge.status, 413);

    const wrongType = await handleBookingPost(
      makeRequest(bookingPayload, { contentType: "text/plain" }),
      dependencies(),
    );
    assert.equal(wrongType.status, 415);
  });

  it("returns a generic 503 and logs no error details on database failure", async () => {
    let logged = 0;
    const response = await handleBookingPost(
      makeRequest(),
      dependencies({
        book: async () => { throw new Error(`private test detail ${bookingPayload.phoneE164}`); },
        onDatabaseFailure: () => { logged += 1; },
      }),
    );

    assert.equal(response.status, 503);
    assert.equal(logged, 1);
    const body = JSON.stringify(await response.json());
    assert.equal(body.includes(bookingPayload.phoneE164), false);
    assert.equal(body.includes("private test detail"), false);
  });
});
