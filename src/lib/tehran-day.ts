// Shared "calendar day in Asia/Tehran" key (YYYY-MM-DD). The whole app runs on
// Tehran's day boundary, so this formatter is the single source of truth and
// is reused everywhere instead of being re-created per call.
const tehranDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function tehranDayKey(date: Date = new Date()): string {
  return tehranDayFormatter.format(date);
}
