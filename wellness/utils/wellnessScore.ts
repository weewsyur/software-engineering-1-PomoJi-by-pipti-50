/**
 * Pure wellness-score logic. No React / Firebase imports, so it is trivially testable.
 *
 * wellnessScore = breakCompliance*0.30 + mood*0.40 + sessionFrequency*0.30
 *
 * Every factor is normalised to 0–100 first. A factor that cannot be measured
 * (e.g. no mood ratings yet) is EXCLUDED and the remaining weights are
 * re-normalised; it is never treated as 0. With all three factors present the
 * result is exactly the formula above.
 */
import {
  DEFAULT_FIELD_MAP,
  DEFAULT_WELLNESS_CONFIG,
  type SessionFieldMap,
  type SessionKind,
  type WellnessConfig,
  type WellnessResult,
  type WellnessSession,
  type WellnessStatus,
  type WellnessWeights,
} from '../types/wellness';

const MS_PER_MINUTE = 60_000;

export function clamp(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Accepts Date, epoch-ms number, ISO string, or a Firestore Timestamp-like object. */
export function toDate(value: unknown): Date | null {
  let date: Date | null = null;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    date = new Date(value);
  } else if (typeof value === 'string' && value.trim() !== '') {
    date = new Date(value);
  } else if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const candidate = (value as { toDate?: unknown }).toDate;
    if (typeof candidate === 'function') {
      try {
        date = (candidate as () => Date).call(value);
      } catch {
        return null;
      }
    }
  }
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

export function isValidMoodRating(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 5;
}

const squash = (s: string): string => s.toLowerCase().replace(/[\s_-]+/g, '');

export function classifySessionKind(
  rawType: unknown,
  fieldMap: SessionFieldMap = DEFAULT_FIELD_MAP,
): SessionKind {
  if (typeof rawType !== 'string') return 'unknown';
  const t = squash(rawType);
  if (fieldMap.breakTypes.some((b) => squash(b) === t)) return 'break';
  if (fieldMap.workTypes.some((w) => squash(w) === t)) return 'work';
  return 'unknown';
}

/** Converts a raw Firestore document into the normalised session shape. */
export function normalizeSession(
  id: string,
  data: Record<string, unknown>,
  fieldMap: SessionFieldMap = DEFAULT_FIELD_MAP,
): WellnessSession {
  const completedAt = toDate(data[fieldMap.completedAtField]);
  const flag = data[fieldMap.completedField];
  const status = data[fieldMap.statusField];

  let completed: boolean;
  if (typeof flag === 'boolean') {
    completed = flag;
  } else if (typeof status === 'string') {
    completed = fieldMap.completedStatuses.some((s) => squash(s) === squash(status));
  } else {
    // Neither flag nor status exists: fall back to "has a valid completion timestamp".
    completed = completedAt !== null;
  }

  const rating = data[fieldMap.moodRatingField];
  return {
    id,
    kind: classifySessionKind(data[fieldMap.typeField], fieldMap),
    completed,
    completedAt,
    moodRating: isValidMoodRating(rating) ? rating : null,
  };
}

export function mergeConfig(partial?: Partial<WellnessConfig>): WellnessConfig {
  const d = DEFAULT_WELLNESS_CONFIG;
  const positive = (v: number | undefined, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback;
  const nonNegative = (v: number | undefined, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;
  return {
    periodDays: Math.max(1, Math.floor(positive(partial?.periodDays, d.periodDays))),
    dailySessionTarget: positive(partial?.dailySessionTarget, d.dailySessionTarget),
    breakGraceMinutes: nonNegative(partial?.breakGraceMinutes, d.breakGraceMinutes),
    weights: {
      mood: nonNegative(partial?.weights?.mood, d.weights.mood),
      breakCompliance: nonNegative(partial?.weights?.breakCompliance, d.weights.breakCompliance),
      sessionFrequency: nonNegative(partial?.weights?.sessionFrequency, d.weights.sessionFrequency),
    },
  };
}

/** Local midnight at the start of the rolling window (window includes today). */
export function getPeriodStart(now: Date, periodDays: number): Date {
  const start = new Date(now.getTime());
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (Math.max(1, periodDays) - 1));
  return start;
}

export function getWellnessStatus(score: number): WellnessStatus {
  const s = clamp(score);
  if (s >= 80) return 'Excellent';
  if (s >= 60) return 'Good';
  if (s >= 40) return 'Fair';
  return 'Needs Attention';
}

const dayKey = (d: Date): string => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Baseline mood score: (averageMood / 5) * 100. Null when there are no ratings. */
export function calculateMoodScore(ratings: readonly number[]): { score: number | null; average: number | null } {
  const valid = ratings.filter(isValidMoodRating);
  if (valid.length === 0) return { score: null, average: null };
  const average = valid.reduce((a, b) => a + b, 0) / valid.length;
  return { score: clamp((average / 5) * 100), average };
}

/**
 * Frequency score: per-day counts are capped at `dailySessionTarget`, then
 * summed over the whole window and divided by target * periodDays. Extra
 * sessions on a day, or marathon days, cannot push the score up.
 */
export function calculateFrequencyScore(
  workSessions: readonly WellnessSession[],
  periodDays: number,
  dailySessionTarget: number,
): number {
  const perDay = new Map<string, number>();
  for (const s of workSessions) {
    if (!s.completedAt) continue;
    const k = dayKey(s.completedAt);
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
  }
  let credited = 0;
  perDay.forEach((count) => {
    credited += Math.min(count, dailySessionTarget);
  });
  return clamp((credited / (dailySessionTarget * periodDays)) * 100);
}

/** Share of expected breaks actually taken, capped at 100. Null when nothing is owed yet. */
export function calculateBreakCompliance(completedBreaks: number, expectedBreaks: number): number | null {
  if (!Number.isFinite(expectedBreaks) || expectedBreaks <= 0) return null;
  return clamp((Math.min(Math.max(completedBreaks, 0), expectedBreaks) / expectedBreaks) * 100);
}

export function calculateWellnessScore(
  sessions: readonly WellnessSession[],
  config?: Partial<WellnessConfig>,
  now: Date = new Date(),
): WellnessResult {
  const cfg = mergeConfig(config);
  const periodStart = getPeriodStart(now, cfg.periodDays);
  const periodEnd = new Date(now.getTime());
  periodEnd.setHours(23, 59, 59, 999);

  const inPeriod = (Array.isArray(sessions) ? sessions : []).filter(
    (s) =>
      s.completed &&
      s.completedAt !== null &&
      s.completedAt >= periodStart &&
      s.completedAt <= periodEnd,
  );
  const work = inPeriod.filter((s) => s.kind === 'work');
  const breaks = inPeriod.filter((s) => s.kind === 'break');

  const zeroWeights: WellnessWeights = { mood: 0, breakCompliance: 0, sessionFrequency: 0 };
  if (work.length === 0) {
    return {
      score: null,
      status: null,
      hasData: false,
      components: { mood: null, breakCompliance: null, sessionFrequency: null },
      weightsApplied: zeroWeights,
      averageMood: null,
      counts: { completedWorkSessions: 0, completedBreaks: breaks.length, moodRatings: 0 },
      periodDays: cfg.periodDays,
      periodStart,
    };
  }

  const graceCutoff = now.getTime() - cfg.breakGraceMinutes * MS_PER_MINUTE;
  const expectedBreaks = work.filter((s) => (s.completedAt as Date).getTime() <= graceCutoff).length;

  const ratings = work.map((s) => s.moodRating).filter(isValidMoodRating);
  const mood = calculateMoodScore(ratings);
  const breakCompliance = calculateBreakCompliance(breaks.length, expectedBreaks);
  const sessionFrequency = calculateFrequencyScore(work, cfg.periodDays, cfg.dailySessionTarget);

  const factors: Array<[keyof WellnessWeights, number | null]> = [
    ['mood', mood.score],
    ['breakCompliance', breakCompliance],
    ['sessionFrequency', sessionFrequency],
  ];
  const available = factors.filter((f): f is [keyof WellnessWeights, number] => f[1] !== null);
  const totalWeight = available.reduce((sum, [key]) => sum + cfg.weights[key], 0);

  const weightsApplied: WellnessWeights = { ...zeroWeights };
  let raw = 0;
  if (totalWeight > 0) {
    for (const [key, value] of available) {
      weightsApplied[key] = cfg.weights[key] / totalWeight;
      raw += value * weightsApplied[key];
    }
  } else {
    // All remaining weights are 0: fall back to a plain average of what exists.
    for (const [key, value] of available) {
      weightsApplied[key] = 1 / available.length;
      raw += value * weightsApplied[key];
    }
  }

  const score = Math.round(clamp(raw));
  return {
    score,
    status: getWellnessStatus(score),
    hasData: true,
    components: {
      mood: mood.score === null ? null : Math.round(mood.score),
      breakCompliance: breakCompliance === null ? null : Math.round(breakCompliance),
      sessionFrequency: Math.round(sessionFrequency),
    },
    weightsApplied,
    averageMood: mood.average,
    counts: {
      completedWorkSessions: work.length,
      completedBreaks: breaks.length,
      moodRatings: ratings.length,
    },
    periodDays: cfg.periodDays,
    periodStart,
  };
}
