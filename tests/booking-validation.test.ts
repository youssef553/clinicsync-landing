import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateBookingPayload } from "@/lib/server/booking-validation";

const validPayload = {
  doctorId: "d1000000-0000-4000-8000-000000000001",
  fullName: "  Synthetic Patient  ",
  phoneE164: " +201099900001 ",
  startsAt: "2026-11-04T10:00:00+02:00",
};

describe("validateBookingPayload", () => {
  it("normalizes safe text fields and accepts a Cairo-local minute with the correct offset", () => {
    const result = validateBookingPayload(validPayload);
    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.value.doctorId, "d1000000-0000-4000-8000-000000000001");
    assert.equal(result.value.fullName, "Synthetic Patient");
    assert.equal(result.value.phoneE164, "+201099900001");
    assert.equal(result.value.startsAt.toISOString(), "2026-11-04T08:00:00.000Z");
  });

  it("rejects malformed fields, controls, unknown keys, and invalid calendar dates", () => {
    assert.equal(validateBookingPayload({ ...validPayload, phoneE164: "201099900001" }).ok, false);
    assert.equal(validateBookingPayload({ ...validPayload, fullName: "\nPatient" }).ok, false);
    assert.equal(validateBookingPayload({ ...validPayload, startsAt: "2026-02-30T10:00:00+02:00" }).ok, false);
    assert.equal(validateBookingPayload({ ...validPayload, extra: "not accepted" }).ok, false);
  });

  it("requires an explicit offset and whole-minute precision", () => {
    assert.equal(validateBookingPayload({ ...validPayload, startsAt: "2026-11-04T10:00:00" }).ok, false);
    assert.equal(validateBookingPayload({ ...validPayload, startsAt: "2026-11-04T10:00:01+02:00" }).ok, false);
    assert.equal(validateBookingPayload({ ...validPayload, startsAt: "2026-11-04T10:00:00.001+02:00" }).ok, false);
  });

  it("rejects a timestamp whose written wall time or offset does not match Africa/Cairo", () => {
    assert.equal(validateBookingPayload({ ...validPayload, startsAt: "2026-11-04T10:00:00+03:00" }).ok, false);
    // Cairo skips 00:00–00:59 on the 2027 spring-forward date; this instant is 01:15 local.
    assert.equal(validateBookingPayload({ ...validPayload, startsAt: "2027-04-30T00:15:00+02:00" }).ok, false);
  });

  it("passes both repeated-hour instants to the database, which chooses the canonical one", () => {
    const firstOccurrence = validateBookingPayload({
      ...validPayload,
      startsAt: "2027-10-28T23:15:00+03:00",
    });
    const canonicalOccurrence = validateBookingPayload({
      ...validPayload,
      startsAt: "2027-10-28T23:15:00+02:00",
    });

    assert.equal(firstOccurrence.ok, true);
    assert.equal(canonicalOccurrence.ok, true);
  });
});
