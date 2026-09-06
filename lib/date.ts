// Today as an ISO "yyyy-mm-dd" string — ported from the web reference's
// todayISO (smkpremiere-app_1.jsx).
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// Pure display formatting for an ISO "yyyy-mm-dd" date string — ported from
// the web reference's formatDayDate (smkpremiere-app_1.jsx).
export function formatDayDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return "";
  const day = d.toLocaleDateString(undefined, { weekday: "long" });
  const date = d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return `${day} · ${date}`;
}

// Short form ("5 Sep") for the compact date pill over a viewer's photo —
// ported from the web reference's formatShortDate (smkpremiere-app_1.jsx).
export function formatShortDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
