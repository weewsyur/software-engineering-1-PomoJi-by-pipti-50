// ─── dateHelpers.ts ─────────────────────────────────────────────────────
// Date utility functions for week/month calculations
// Timezone-safe handling using JS Date

/**
 * Get the start of the week (Monday at 12:00 AM)
 * @param date - Reference date (defaults to current date)
 * @returns Date object set to Monday 12:00 AM of the given week
 */
export function getStartOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Calculate days to subtract to get to Monday
  // If Sunday (0), subtract 6 days to get to previous Monday
  // Otherwise, subtract (day - 1) days
  const daysToSubtract = day === 0 ? 6 : day - 1;

  d.setDate(d.getDate() - daysToSubtract);
  d.setHours(0, 0, 0, 0);

  return d;
}

/**
 * Get the end of the week (next Monday at 12:00 AM)
 * @param date - Reference date (defaults to current date)
 * @returns Date object set to next Monday 12:00 AM
 */
export function getEndOfWeek(date: Date = new Date()): Date {
  const startOfWeek = getStartOfWeek(date);
  const endOfWeek = new Date(startOfWeek);

  // Add 7 days to get to next Monday
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  endOfWeek.setHours(0, 0, 0, 0);

  return endOfWeek;
}

/**
 * Get the start of the month (1st at 12:00 AM)
 * @param date - Reference date (defaults to current date)
 * @returns Date object set to 1st of the month at 12:00 AM
 */
export function getStartOfMonth(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of the month (1st of next month at 12:00 AM)
 * @param date - Reference date (defaults to current date)
 * @returns Date object set to 1st of next month at 12:00 AM
 */
export function getEndOfMonth(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}
