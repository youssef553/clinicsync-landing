import assert from "node:assert/strict";
import test from "node:test";
import {
  formatClinicDateTime,
  getClinicDayRangeForDate,
  getClinicLocalDate,
  getCurrentClinicDayRange,
} from "../src/lib/server/date-time";

const CAIRO = "Africa/Cairo";

test("clinic day boundaries use Cairo local midnight for a normal day", () => {
  const day = getClinicDayRangeForDate("2026-11-03", CAIRO);
  assert.ok(day);
  assert.equal(day.start.toISOString(), "2026-11-02T22:00:00.000Z");
  assert.equal(day.end.toISOString(), "2026-11-03T22:00:00.000Z");
  assert.equal(getClinicLocalDate(new Date("2026-11-03T12:00:00.000Z"), CAIRO), "2026-11-03");
});

test("clinic day boundaries handle Cairo's skipped midnight at the DST change", () => {
  const day = getClinicDayRangeForDate("2027-04-30", CAIRO);
  assert.ok(day);
  assert.equal(day.start.toISOString(), "2027-04-29T22:00:00.000Z");
  assert.equal(day.end.toISOString(), "2027-04-30T21:00:00.000Z");
  assert.equal(day.end.getTime() - day.start.getTime(), 23 * 60 * 60 * 1000);
  assert.equal(getClinicLocalDate(day.start, CAIRO), "2027-04-30");
});

test("clinic-day helpers reject impossible dates and unsupported zones", () => {
  assert.equal(getClinicDayRangeForDate("2026-02-29", CAIRO), null);
  assert.equal(getClinicDayRangeForDate("2026-13-01", CAIRO), null);
  assert.equal(getClinicDayRangeForDate("2026-11-03", "Not/A_Zone"), null);
  assert.throws(() => getCurrentClinicDayRange(new Date("invalid"), CAIRO), RangeError);
});

test("date-time formatting always uses the requested clinic timezone", () => {
  assert.match(formatClinicDateTime("2026-11-03T12:00:00.000Z", CAIRO), /14:00/u);
});
