const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const SEARCH_WINDOW_MS = 48 * 60 * 60 * 1000;

export type ClinicDayRange = {
  date: string;
  start: Date;
  end: Date;
};

function dateParts(date: Date, timeZone: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .filter((part) => part.type !== "literal");

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function localDateKey(date: Date, timeZone: string): string {
  const parts = dateParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function normalizedDateKey(value: string): string | null {
  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1970 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function nextDateKey(dateKey: string): string {
  const match = DATE_KEY_PATTERN.exec(dateKey);
  if (!match) throw new RangeError("Invalid clinic date");

  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1);

  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, "0"))
    .join("-");
}

/**
 * Find the first UTC millisecond whose local calendar date is at least target.
 * Local date remains monotonic across daylight-saving gaps and repeated hours,
 * so this also handles zones where midnight itself is skipped or repeated.
 */
function findDateBoundary(dateKey: string, timeZone: string): Date {
  const match = DATE_KEY_PATTERN.exec(dateKey);
  if (!match) throw new RangeError("Invalid clinic date");

  const utcMidnight = new Date(0);
  utcMidnight.setUTCHours(0, 0, 0, 0);
  utcMidnight.setUTCFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

  let low = utcMidnight.getTime() - SEARCH_WINDOW_MS;
  let high = utcMidnight.getTime() + SEARCH_WINDOW_MS;
  if (localDateKey(new Date(low), timeZone) >= dateKey || localDateKey(new Date(high), timeZone) <= dateKey) {
    throw new RangeError("Unable to determine clinic day boundaries");
  }

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (localDateKey(new Date(middle), timeZone) >= dateKey) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }

  return new Date(low);
}

export function getClinicLocalDate(date: Date, timeZone: string): string {
  if (!Number.isFinite(date.getTime())) throw new RangeError("Invalid date");
  return localDateKey(date, timeZone);
}

export function getClinicDayRangeForDate(
  dateValue: string,
  timeZone: string,
): ClinicDayRange | null {
  const date = normalizedDateKey(dateValue);
  if (!date) return null;

  try {
    const start = findDateBoundary(date, timeZone);
    const end = findDateBoundary(nextDateKey(date), timeZone);
    if (end <= start) return null;
    return { date, start, end };
  } catch {
    return null;
  }
}

export function getCurrentClinicDayRange(now: Date, timeZone: string): ClinicDayRange {
  const date = getClinicLocalDate(now, timeZone);
  const range = getClinicDayRangeForDate(date, timeZone);
  if (!range) throw new RangeError("Invalid clinic time zone or date");
  return range;
}

export function formatClinicDateTime(value: string | Date, timeZone: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function formatClinicTime(value: string | Date, timeZone: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "Time unavailable";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}
