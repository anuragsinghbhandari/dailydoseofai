const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const LONG_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const LONG_DATE_WITH_WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "short",
});

export function toUtcDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

export function formatShortUtcDate(value: Date | string) {
  return SHORT_DATE_FORMATTER.format(toUtcDate(value));
}

export function formatLongUtcDate(value: Date | string) {
  return LONG_DATE_FORMATTER.format(toUtcDate(value));
}

export function formatLongUtcDateWithWeekday(value: Date | string) {
  return LONG_DATE_WITH_WEEKDAY_FORMATTER.format(toUtcDate(value));
}

export function formatUtcMonthYear(value: Date | string) {
  return MONTH_YEAR_FORMATTER.format(toUtcDate(value));
}

export function formatUtcWeekday(value: Date | string) {
  return WEEKDAY_FORMATTER.format(toUtcDate(value));
}

export function getUtcDateKey(value: Date | string) {
  const date = toUtcDate(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function parseUtcDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const parsed = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getCurrentUtcDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function getUtcWeekStart(value?: Date | string) {
  const date = value ? toUtcDate(value) : getCurrentUtcDate();
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayOfWeek = start.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  start.setUTCDate(start.getUTCDate() + diffToMonday);
  return start;
}

export function getUtcMonthStart(value?: Date | string) {
  const date = value ? toUtcDate(value) : getCurrentUtcDate();
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}
