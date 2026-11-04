export type BookingInput = {
  doctorId: string;
  fullName: string;
  phoneE164: string;
  startsAt: Date;
};

export type BookingValidationResult =
  | { ok: true; value: BookingInput }
  | { ok: false; error: "invalid_request" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const E164_PATTERN = /^\+[1-9][0-9]{1,14}$/;
const CAIRO_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?(Z|[+-]\d{2}:\d{2})$/i;
const ALLOWED_FIELDS = new Set(["doctorId", "fullName", "phoneE164", "startsAt"]);
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCairoLocalMinute(value: string): Date | null {
  const match = CAIRO_TIMESTAMP_PATTERN.exec(value);
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fraction, zone] =
    match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = secondText === undefined ? 0 : Number(secondText);

  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    second !== 0 ||
    (fraction !== undefined && /[1-9]/u.test(fraction))
  ) {
    return null;
  }

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month - 1];

  if (day > daysInMonth) return null;

  if (zone.toUpperCase() !== "Z") {
    const offsetHours = Number(zone.slice(1, 3));
    const offsetMinutes = Number(zone.slice(4, 6));
    if (
      offsetHours > 14 ||
      offsetMinutes > 59 ||
      (offsetHours === 14 && offsetMinutes !== 0)
    ) {
      return null;
    }
  }

  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime())) return null;

  // The browser must send an ISO instant whose written wall time corresponds to
  // Africa/Cairo on that date. The database remains authoritative for schedule
  // rules and rejects the non-canonical instant during a repeated DST hour.
  let cairoParts: Record<string, string>;
  try {
    cairoParts = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Cairo",
        calendar: "gregory",
        numberingSystem: "latn",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(instant)
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    );
  } catch {
    return null;
  }

  if (
    Number(cairoParts.year) !== year ||
    Number(cairoParts.month) !== month ||
    Number(cairoParts.day) !== day ||
    Number(cairoParts.hour) !== hour ||
    Number(cairoParts.minute) !== minute
  ) {
    return null;
  }

  return instant;
}

export function validateBookingPayload(value: unknown): BookingValidationResult {
  if (!isRecord(value) || Object.keys(value).some((field) => !ALLOWED_FIELDS.has(field))) {
    return { ok: false, error: "invalid_request" };
  }

  const { doctorId, fullName, phoneE164, startsAt } = value;
  if (
    typeof doctorId !== "string" ||
    typeof fullName !== "string" ||
    typeof phoneE164 !== "string" ||
    typeof startsAt !== "string"
  ) {
    return { ok: false, error: "invalid_request" };
  }

  const normalizedDoctorId = doctorId.trim();
  const normalizedName = fullName.trim();
  const normalizedPhone = phoneE164.trim();
  const nameLength = Array.from(normalizedName).length;
  const parsedStart = isCairoLocalMinute(startsAt);

  if (
    !UUID_PATTERN.test(normalizedDoctorId) ||
    nameLength < 1 ||
    nameLength > 120 ||
    CONTROL_CHARACTERS.test(fullName) ||
    CONTROL_CHARACTERS.test(phoneE164) ||
    !E164_PATTERN.test(normalizedPhone) ||
    parsedStart === null
  ) {
    return { ok: false, error: "invalid_request" };
  }

  return {
    ok: true,
    value: {
      doctorId: normalizedDoctorId.toLowerCase(),
      fullName: normalizedName,
      phoneE164: normalizedPhone,
      startsAt: parsedStart,
    },
  };
}
