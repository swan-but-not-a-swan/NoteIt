// A Date's *local* calendar day as "yyyy-mm-dd". Not toISOString(), which
// converts to UTC first: in Myanmar (UTC+6:30) local midnight is still the
// previous day in UTC, so every picked date used to be saved a day early.
export function toLocalISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Today as an ISO "yyyy-mm-dd" string, in the device's time zone — ported
// from the web reference's todayISO (smkpremiere-app_1.jsx).
export function todayISO(): string {
  return toLocalISODate(new Date());
}

// The day a photo was taken, read off its EXIF tags as "yyyy-mm-dd", or null
// when the file carries no date at all.
//
// EXIF spells a timestamp "2026:09:20 14:33:02", in the camera's own local
// time with no zone attached — so the first ten characters already are the
// date. Building a Date out of it and formatting that back would push the day
// around by the device's offset, which is the same trap toLocalISODate exists
// for.
export function exifCaptureDate(exif: Record<string, unknown> | null | undefined): string | null {
  if (exif == null) return null;

  //* DateTimeOriginal is when the shutter fired. The other two are when the
  //* file was written and when it was last changed — the same moment for a
  //* photo straight off a camera, and the best guess left when it isn't
  const raw = exif.DateTimeOriginal ?? exif.DateTimeDigitized ?? exif.DateTime;
  if (typeof raw !== "string") return null;

  const match = /^(\d{4}):(\d{2}):(\d{2})/.exec(raw);
  return match != null ? `${match[1]}-${match[2]}-${match[3]}` : null;
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
