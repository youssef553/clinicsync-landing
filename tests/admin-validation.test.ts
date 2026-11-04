import assert from "node:assert/strict";
import test from "node:test";
import {
  canTransitionAppointment,
  escapeLikePattern,
  intervalsOverlap,
  isClinicSlug,
  isUuid,
  maskPhoneNumber,
  normalizeSearchTerm,
  parseAppointmentStatus,
  validateAvailabilityInput,
  validateDoctorInput,
} from "../src/lib/server/admin-validation";

const DOCTOR_ID = "d1000000-0000-4000-8000-000000000001";

test("doctor validation trims values and rejects control characters and invalid status", () => {
  assert.deepEqual(
    validateDoctorInput({ name: "  Dr. Noura  ", specialty: "  Pediatrics " }),
    { ok: true, value: { name: "Dr. Noura", specialty: "Pediatrics", isActive: true } },
  );
  assert.equal(validateDoctorInput({ name: "\nDoctor", specialty: "General" }).ok, false);
  assert.equal(validateDoctorInput({ name: "Doctor", specialty: "x".repeat(121) }).ok, false);
  assert.equal(validateDoctorInput({ name: "Doctor", specialty: "General", isActive: "yes" }).ok, false);
});

test("availability validation enforces ISO weekday, time order, precision, and slot limits", () => {
  const valid = validateAvailabilityInput({
    clinicSlug: "assuit-clinic",
    doctorId: DOCTOR_ID,
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "12:00",
    slotDurationMinutes: 30,
    isActive: true,
  });
  assert.deepEqual(valid, {
    ok: true,
    value: {
      clinicSlug: "assuit-clinic",
      doctorId: DOCTOR_ID,
      dayOfWeek: 1,
      startTime: "09:00:00",
      endTime: "12:00:00",
      slotDurationMinutes: 30,
      isActive: true,
    },
  });

  assert.equal(validateAvailabilityInput({ clinicSlug: "x", doctorId: DOCTOR_ID, dayOfWeek: 0, startTime: "09:00", endTime: "10:00", slotDurationMinutes: 30 }).ok, false);
  assert.equal(validateAvailabilityInput({ clinicSlug: "x", doctorId: DOCTOR_ID, dayOfWeek: 7, startTime: "10:00", endTime: "10:00", slotDurationMinutes: 30 }).ok, false);
  assert.equal(validateAvailabilityInput({ clinicSlug: "x", doctorId: DOCTOR_ID, dayOfWeek: 7, startTime: "09:00:30", endTime: "10:00", slotDurationMinutes: 30 }).ok, false);
  assert.equal(validateAvailabilityInput({ clinicSlug: "x", doctorId: DOCTOR_ID, dayOfWeek: 7, startTime: "09:00", endTime: "10:00", slotDurationMinutes: 7 }).ok, false);
  assert.equal(validateAvailabilityInput({ clinicSlug: "x", doctorId: "not-a-uuid", dayOfWeek: 7, startTime: "09:00", endTime: "10:00", slotDurationMinutes: 30 }).ok, false);
});

test("adjacent availability windows do not overlap; intersecting windows do", () => {
  assert.equal(intervalsOverlap("09:00", "10:00", "10:00:00", "11:00"), false);
  assert.equal(intervalsOverlap("09:00", "10:30", "10:00", "11:00"), true);
  assert.equal(intervalsOverlap("invalid", "10:00", "10:00", "11:00"), true);
});

test("appointment status transitions match the database trigger", () => {
  assert.equal(parseAppointmentStatus("requested"), "requested");
  assert.equal(parseAppointmentStatus("admin"), null);
  assert.equal(canTransitionAppointment("requested", "confirmed"), true);
  assert.equal(canTransitionAppointment("requested", "cancelled"), true);
  assert.equal(canTransitionAppointment("confirmed", "completed"), true);
  assert.equal(canTransitionAppointment("confirmed", "cancelled"), true);
  assert.equal(canTransitionAppointment("requested", "completed"), false);
  assert.equal(canTransitionAppointment("cancelled", "confirmed"), false);
});

test("clinic slugs and UUIDs are constrained before they reach queries", () => {
  assert.equal(isClinicSlug("clinic-01"), true);
  assert.equal(isClinicSlug("../other"), false);
  assert.equal(isClinicSlug("-clinic"), false);
  assert.equal(isUuid(DOCTOR_ID), true);
  assert.equal(isUuid("not-a-uuid"), false);
});

test("search terms are bounded and LIKE metacharacters are escaped", () => {
  assert.equal(normalizeSearchTerm("  Noura  "), "Noura");
  assert.equal(normalizeSearchTerm(""), "");
  assert.equal(normalizeSearchTerm("x".repeat(81)), null);
  assert.equal(normalizeSearchTerm("\u0000"), null);
  assert.equal(escapeLikePattern("a%_b\\c"), "a\\%\\_b\\\\c");
});

test("patient phone masking does not reveal short numbers and shows only a suffix for longer values", () => {
  assert.equal(maskPhoneNumber("+123"), "••••");
  assert.equal(maskPhoneNumber("+201001234567"), "••• ••• 4567");
});
