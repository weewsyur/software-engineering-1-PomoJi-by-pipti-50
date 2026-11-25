import { REST_DURATIONS, type RestDurationMinutes } from '@/constants/restPeriod';

export interface RestTimeValue {
  toMillis?: () => number;
  toDate?: () => Date;
}

export function timestampToMillis(value: unknown): number | null {
  if (value == null) return null;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : time;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? null : time;
  }
  if (typeof value === 'object') {
    const candidate = value as RestTimeValue;
    if (typeof candidate.toMillis === 'function') return candidate.toMillis();
    if (typeof candidate.toDate === 'function') return candidate.toDate().getTime();
    if (typeof (candidate as { seconds?: unknown }).seconds === 'number') {
      const seconds = (candidate as { seconds: number }).seconds;
      const nanoseconds = typeof (candidate as { nanoseconds?: unknown }).nanoseconds === 'number'
        ? (candidate as { nanoseconds: number }).nanoseconds
        : 0;
      return seconds * 1000 + nanoseconds / 1_000_000;
    }
  }
  return null;
}

export function isRestDuration(minutes: number): minutes is RestDurationMinutes {
  return (REST_DURATIONS as readonly number[]).includes(minutes);
}

export function restRemainingSeconds(restEndTime: unknown, now = Date.now()): number {
  const end = timestampToMillis(restEndTime);
  if (end == null) return 0;
  return Math.max(0, Math.ceil((end - now) / 1000));
}

export function formatRestCountdown(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatRestEndTime(restEndTime: unknown): string | null {
  const end = timestampToMillis(restEndTime);
  if (end == null) return null;
  return new Date(end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
