/** Student's LOCAL calendar date as YYYY-MM-DD (not UTC). */
export function getLocalDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** "Nov 3" style label for a YYYY-MM-DD local date string. */
export function formatShortDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? dateStr
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
