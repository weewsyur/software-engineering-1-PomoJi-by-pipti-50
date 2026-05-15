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

/**
 * Get the start of the year (January 1st at 12:00 AM)
 * @param date - Reference date (defaults to current date)
 * @returns Date object set to January 1st of the year at 12:00 AM
 */
export function getStartOfYear(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setMonth(0);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of the year (January 1st of next year at 12:00 AM)
 * @param date - Reference date (defaults to current date)
 * @returns Date object set to January 1st of next year at 12:00 AM
 */
export function getEndOfYear(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + 1);
  d.setMonth(0);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get current date/time in user's timezone as ISO string
 * @param timezone - User's timezone (defaults to local timezone)
 * @returns ISO string representation of current date/time in user's timezone
 */
export function getLocalISODateTime(timezone?: string): string {
  const now = new Date();
  if (!timezone) {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  // Get the date parts in the user's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: timezone,
  });

  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;
  const second = parts.find(p => p.type === 'second')?.value;

  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

/**
 * Convert a Date object to ISO date string (YYYY-MM-DD) in local timezone
 * @param date - Date object to convert
 * @returns Date string in YYYY-MM-DD format in local timezone
 */
export function getLocalISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
