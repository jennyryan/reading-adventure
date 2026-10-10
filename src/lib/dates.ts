// Reading dates are plain calendar days ("2026-10-09") with no time zone.
//
// The prototype's bug came from `new Date().toISOString().slice(0, 10)`,
// which gives the UTC date: after about 5pm in California, that's already
// tomorrow. These helpers only ever use local date parts.

const pad = (n: number) => String(n).padStart(2, "0");

/** Today's date on this device, as "YYYY-MM-DD". */
export function todayLocalISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "2026-10-09" -> "Oct 9, 2026", without any time zone shifting. */
export function formatReadDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  // Formatting in UTC from a UTC-midnight instant always lands on the same
  // calendar day, wherever the server or browser is.
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
