// ─── sessionFilters.ts ─────────────────────────────────────────────────────
// Session filtering utilities for weekly and monthly analytics
// Reusable functions to filter activities by date ranges

import { Activity } from "@/hooks/useActivities";
import { getStartOfWeek, getEndOfWeek, getStartOfMonth, getEndOfMonth, getStartOfYear, getEndOfYear } from "./dateHelpers";

/**
 * Filter sessions by week (Monday 12:00 AM to next Monday 12:00 AM)
 * @param activities - Array of activities to filter
 * @param date - Reference date (defaults to current date)
 * @returns Filtered activities within the week
 */
export function filterSessionsByWeek(activities: Activity[], date: Date = new Date()): Activity[] {
  const startOfWeek = getStartOfWeek(date);
  const endOfWeek = getEndOfWeek(date);

  return activities.filter((activity) => {
    const activityDate = new Date(activity.createdAt);
    return activityDate >= startOfWeek && activityDate < endOfWeek;
  });
}

/**
 * Filter sessions by month (1st at 12:00 AM to 1st of next month at 12:00 AM)
 * @param activities - Array of activities to filter
 * @param date - Reference date (defaults to current date)
 * @returns Filtered activities within the month
 */
export function filterSessionsByMonth(activities: Activity[], date: Date = new Date()): Activity[] {
  const startOfMonth = getStartOfMonth(date);
  const endOfMonth = getEndOfMonth(date);

  return activities.filter((activity) => {
    const activityDate = new Date(activity.createdAt);
    return activityDate >= startOfMonth && activityDate < endOfMonth;
  });
}

/**
 * Calculate weekly streak count (number of sessions in current week)
 * @param activities - Array of activities
 * @param date - Reference date (defaults to current date)
 * @returns Number of sessions in the current week
 */
export function calculateWeeklyStreak(activities: Activity[], date: Date = new Date()): number {
  const weeklyActivities = filterSessionsByWeek(activities, date);
  return weeklyActivities.reduce((sum, activity) => sum + (activity.sessions || 0), 0);
}

/**
 * Group sessions by day for weekly view
 * @param activities - Array of activities
 * @param date - Reference date (defaults to current date)
 * @returns Array of daily totals for the week (Mon-Sun)
 */
export function groupSessionsByDay(activities: Activity[], date: Date = new Date()): {
  day: string;
  date: Date;
  totalSessions: number;
  totalTime: number;
}[] {
  const startOfWeek = getStartOfWeek(date);
  const weeklyActivities = filterSessionsByWeek(activities, date);

  // Initialize all 7 days with zeros
  const dailyMap = new Map<string, { totalSessions: number; totalTime: number }>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { totalSessions: 0, totalTime: 0 });
  }

  // Aggregate activities by day
  weeklyActivities.forEach((activity) => {
    const key = new Date(activity.createdAt).toISOString().slice(0, 10);
    const existing = dailyMap.get(key) || { totalSessions: 0, totalTime: 0 };
    dailyMap.set(key, {
      totalSessions: existing.totalSessions + (activity.sessions || 0),
      totalTime: existing.totalTime + (activity.totalTime || 0),
    });
  });

  // Convert to array with day labels
  const result = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const data = dailyMap.get(key) || { totalSessions: 0, totalTime: 0 };
    result.push({
      day: d.toLocaleDateString([], { weekday: "short" }),
      date: d,
      totalSessions: data.totalSessions,
      totalTime: data.totalTime,
    });
  }

  return result;
}

/**
 * Group sessions by week for monthly view
 * @param activities - Array of activities
 * @param date - Reference date (defaults to current date)
 * @returns Array of weekly totals for the month
 */
export function groupSessionsByWeekForMonth(activities: Activity[], date: Date = new Date()): {
  weekLabel: string;
  totalSessions: number;
  totalTime: number;
}[] {
  const startOfMonth = getStartOfMonth(date);
  const endOfMonth = getEndOfMonth(date);
  const monthlyActivities = activities.filter((activity) => {
    const activityDate = new Date(activity.createdAt);
    return activityDate >= startOfMonth && activityDate < endOfMonth;
  });

  // Group by week number
  const weekMap = new Map<number, { totalSessions: number; totalTime: number }>();

  monthlyActivities.forEach((activity) => {
    const activityDate = new Date(activity.createdAt);
    const weekNumber = Math.floor((activityDate.getTime() - startOfMonth.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const existing = weekMap.get(weekNumber) || { totalSessions: 0, totalTime: 0 };
    weekMap.set(weekNumber, {
      totalSessions: existing.totalSessions + (activity.sessions || 0),
      totalTime: existing.totalTime + (activity.totalTime || 0),
    });
  });

  // Convert to array with week labels
  const result = [];
  const maxWeeks = Math.ceil((endOfMonth.getTime() - startOfMonth.getTime()) / (7 * 24 * 60 * 60 * 1000));

  for (let i = 0; i < maxWeeks; i++) {
    const data = weekMap.get(i) || { totalSessions: 0, totalTime: 0 };
    const weekStart = new Date(startOfMonth);
    weekStart.setDate(startOfMonth.getDate() + (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    result.push({
      weekLabel: `${weekStart.toLocaleDateString([], { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString([], { month: "short", day: "numeric" })}`,
      totalSessions: data.totalSessions,
      totalTime: data.totalTime,
    });
  }

  return result;
}

/**
 * Filter sessions by year (January 1st at 12:00 AM to January 1st of next year at 12:00 AM)
 * @param activities - Array of activities to filter
 * @param date - Reference date (defaults to current date)
 * @returns Filtered activities within the year
 */
export function filterSessionsByYear(activities: Activity[], date: Date = new Date()): Activity[] {
  const startOfYear = getStartOfYear(date);
  const endOfYear = getEndOfYear(date);

  return activities.filter((activity) => {
    const activityDate = new Date(activity.createdAt);
    return activityDate >= startOfYear && activityDate < endOfYear;
  });
}

/**
 * Group sessions by month for yearly view
 * @param activities - Array of activities
 * @param date - Reference date (defaults to current date)
 * @returns Array of monthly totals for the year
 */
export function groupSessionsByMonthForYear(activities: Activity[], date: Date = new Date()): {
  monthLabel: string;
  totalSessions: number;
  totalTime: number;
}[] {
  const startOfYear = getStartOfYear(date);
  const endOfYear = getEndOfYear(date);
  const yearlyActivities = activities.filter((activity) => {
    const activityDate = new Date(activity.createdAt);
    return activityDate >= startOfYear && activityDate < endOfYear;
  });

  // Group by month number (0-11)
  const monthMap = new Map<number, { totalSessions: number; totalTime: number }>();

  yearlyActivities.forEach((activity) => {
    const activityDate = new Date(activity.createdAt);
    const monthNumber = activityDate.getMonth();
    const existing = monthMap.get(monthNumber) || { totalSessions: 0, totalTime: 0 };
    monthMap.set(monthNumber, {
      totalSessions: existing.totalSessions + (activity.sessions || 0),
      totalTime: existing.totalTime + (activity.totalTime || 0),
    });
  });

  // Convert to array with month labels
  const result = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (let i = 0; i < 12; i++) {
    const data = monthMap.get(i) || { totalSessions: 0, totalTime: 0 };
    result.push({
      monthLabel: monthNames[i],
      totalSessions: data.totalSessions,
      totalTime: data.totalTime,
    });
  }

  return result;
}
