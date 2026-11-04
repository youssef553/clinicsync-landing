import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSafeNextPath } from "@/lib/supabase/redirects";

describe("getSafeNextPath", () => {
  const baseUrl = "https://clinicsync.example";

  it("preserves a safe local destination, query, and fragment", () => {
    assert.equal(
      getSafeNextPath("/admin/appointments?date=today#calendar", baseUrl),
      "/admin/appointments?date=today#calendar",
    );
  });

  it("rejects absolute and protocol-relative destinations", () => {
    assert.equal(getSafeNextPath("https://attacker.example/", baseUrl), "/admin");
    assert.equal(getSafeNextPath("//attacker.example/", baseUrl), "/admin");
  });

  it("rejects ambiguous backslash paths and control characters", () => {
    assert.equal(getSafeNextPath("/\\\\attacker.example", baseUrl), "/admin");
    assert.equal(getSafeNextPath("/admin\n/other", baseUrl), "/admin");
  });
});
