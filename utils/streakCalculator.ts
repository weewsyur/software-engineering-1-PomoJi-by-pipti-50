// ─── streakCalculator.ts ─────────────────────────────────────────────────────
// Streak calculation logic with timezone-aware date handling
// Handles day boundaries correctly across timezones

import { Timestamp } from 'firebase/firestore';

/**
 * Converts a Firestore Timestamp to a Date object (normalized to midnight UTC)
 */
export function firestampToDate(timestamp: Timestamp): Date {
  return new Date(timestamp.toMillis());
}

/**
 * Get today's date at midnight in the user's timezone
 * @param timezone - IANA timezone string (e.g., 'America/New_York')
 */
export function getTodayAtMidnight(timezone: string = 'UTC'): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  });

  const parts = formatter.formatToParts(new Date());
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '2026');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');

  return new Date(year, month, day, 0, 0, 0, 0);
}

/**
 * Get yesterday's date at midnight
 */
export function getYesterdayAtMidnight(timezone: string = 'UTC'): Date {
  const today = getTodayAtMidnight(timezone);
  today.setDate(today.getDate() - 1);
  return today;
}

/**
 * Calculate days difference between two dates (ignoring time)
 * @returns Number of days between dates (can be negative)
 */
export function daysDifference(date1: Date, date2: Date): number {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  const diff = d2.getTime() - d1.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date is today
 */
export function isToday(date: Date, timezone: string = 'UTC'): boolean {
  const today = getTodayAtMidnight(timezone);
  const dateToCheck = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return dateToCheck.getTime() === today.getTime();
}

/**
 * Check if a date is yesterday
 */
export function isYesterday(date: Date, timezone: string = 'UTC'): boolean {
  const yesterday = getYesterdayAtMidnight(timezone);
  const dateToCheck = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return dateToCheck.getTime() === yesterday.getTime();
}

export interface StreakData {
  currentStreak: number;
  lastActiveDate: Date | null;
  highestStreak: number;
}

/**
 * Calculate streak based on last activity date
 *
 * LOGIC:
 * - If active TODAY → streak continues
 * - If last activity was YESTERDAY → increment streak
 * - If gap > 1 day → reset to 1 (lost streak)
 * - If no activity → streak is 0
 */
export function calculateStreak(
  lastActiveDate: Date | null,
  currentStreak: number = 0,
  timezone: string = 'UTC'
): StreakData {
  if (!lastActiveDate) {
    return {
      currentStreak: 0,
      lastActiveDate: null,
      highestStreak: 0,
    };
  }

  const today = getTodayAtMidnight(timezone);
  const yesterday = getYesterdayAtMidnight(timezone);
  const lastActiveDateNormalized = new Date(
    lastActiveDate.getFullYear(),
    lastActiveDate.getMonth(),
    lastActiveDate.getDate()
  );

  let newStreak = currentStreak;

  // User active today - maintain streak
  if (lastActiveDateNormalized.getTime() === today.getTime()) {
    newStreak = Math.max(currentStreak, 1);
  }
  // Last activity yesterday - increment streak
  else if (lastActiveDateNormalized.getTime() === yesterday.getTime()) {
    newStreak = currentStreak + 1;
  }
  // Gap > 1 day - reset streak
  else {
    const daysSince = daysDifference(lastActiveDateNormalized, today);
    newStreak = daysSince > 1 ? 1 : 0;
  }

  return {
    currentStreak: newStreak,
    lastActiveDate: lastActiveDateNormalized,
    highestStreak: Math.max(currentStreak, newStreak),
  };
}

/**
 * Format streak display text
 */
export function formatStreakDisplay(count: number, unit: string = 'Days'): string {
  if (count === 0) return 'No streak';
  if (count === 1) return `${count} ${unit.slice(0, -1)}`;
  return `${count} ${unit}`;
}
