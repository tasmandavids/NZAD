const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Deterministic NZ display — fixed timezone + 24h avoids SSR/client Intl drift (e.g. am vs AM). */
export function formatSyncTime(iso: string | null | undefined): string {
  if (!iso) return "just now";
  return new Date(iso).toLocaleString("en-NZ", {
    day: "numeric",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Pacific/Auckland",
  });
}

export function formatMonthKey(monthKey: string): string {
  const [, month] = monthKey.split("-");
  const idx = Number(month) - 1;
  return MONTHS_SHORT[idx] ?? monthKey;
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  const day = d.getUTCDate();
  const month = MONTHS_SHORT[d.getUTCMonth()] ?? "";
  const year = String(d.getUTCFullYear()).slice(-2);
  return `${day} ${month} ${year}`;
}
