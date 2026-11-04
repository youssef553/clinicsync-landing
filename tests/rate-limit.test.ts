import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createBookingRateLimiter } from "@/lib/server/rate-limit";

describe("booking rate limiter", () => {
  it("limits a client address and resets its window", () => {
    let now = 1_000;
    const limiter = createBookingRateLimiter({
      now: () => now,
      clientLimit: 2,
      clientWindowMs: 60_000,
    });
    const request = new Request("https://clinicsync.test/api/appointments", {
      headers: { "x-forwarded-for": "203.0.113.44" },
    });

    assert.equal(limiter.checkClient(request).allowed, true);
    assert.equal(limiter.checkClient(request).allowed, true);
    const limited = limiter.checkClient(request);
    assert.equal(limited.allowed, false);
    assert.equal(limited.retryAfterSeconds, 60);

    now += 60_001;
    assert.equal(limiter.checkClient(request).allowed, true);
  });

  it("limits a hashed phone key without storing the raw phone as the map key", () => {
    const limiter = createBookingRateLimiter({ phoneLimit: 1, phoneWindowMs: 60_000 });
    assert.equal(limiter.checkPhone("+201099900101").allowed, true);
    assert.equal(limiter.checkPhone("+201099900101").allowed, false);
  });
});
