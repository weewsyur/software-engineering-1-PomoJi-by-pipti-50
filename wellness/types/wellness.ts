/**
 * Shared types and constants for the PomoJI wellness features.
 * No runtime dependencies (no React, no Firebase).
 */

// ───────────────────────── Mood ─────────────────────────

export type MoodRating = 1 | 2 | 3 | 4 | 5;
export type MoodLabel = 'Very Bad' | 'Bad' | 'Okay' | 'Good' | 'Great';

export interface MoodOption {
  rating: MoodRating;
  label: MoodLabel;
  emoji: string;
}

export const MOOD_OPTIONS: readonly MoodOption[] = [
  { rating: 1, label: 'Very Bad', emoji: '😫' },
  { rating: 2, label: 'Bad', emoji: '😕' },
  { rating: 3, label: 'Okay', emoji: '😐' },
  { rating: 4, label: 'Good', emoji: '🙂' },
  { rating: 5, label: 'Great', emoji: '😄' },
] as const;

// ───────────────────────── Sessions ─────────────────────────

export type SessionKind = 'work' | 'break' | 'unknown';

/** Normalised session shape used by all calculations. */
export interface WellnessSession {
  id: string;
  kind: SessionKind;
  completed: boolean;
  completedAt: Date | null;
  /** Valid 1–5 rating, or null when missing / skipped / invalid. */
  moodRating: number | null;
}

/**
 * Maps YOUR Firestore session field names/values to the normalised shape.
 * Every entry is an ASSUMPTION; override whatever differs in PomoJI.
 */
export interface SessionFieldMap {
  /** Field holding the session type, e.g. "work" | "shortBreak" | "longBreak". */
  typeField: string;
  /** Optional boolean field, true when the session finished successfully. */
  completedField: string;
  /** Optional string field, e.g. "completed" | "cancelled". */
  statusField: string;
  /** Timestamp field set when the session finished. Used for range queries. */
  completedAtField: string;
  moodRatingField: string;
  /** Matched case-insensitively after stripping spaces, "_" and "-". */
  workTypes: readonly string[];
  breakTypes: readonly string[];
  completedStatuses: readonly string[];
}

export const DEFAULT_FIELD_MAP: SessionFieldMap = {
  typeField: 'mode',
  completedField: 'completed',
  statusField: 'status',
  completedAtField: 'completedAt',
  moodRatingField: 'moodRating',
  workTypes: ['focus'],
  breakTypes: ['short', 'long'],
  completedStatuses: ['completed', 'complete', 'done'],
};

// ───────────────────────── Wellness score ─────────────────────────

export type WellnessStatus = 'Excellent' | 'Good' | 'Fair' | 'Needs Attention';

export interface WellnessWeights {
  mood: number;
  breakCompliance: number;
  sessionFrequency: number;
}

export interface WellnessConfig {
  /** Rolling window length in calendar days, including today. Default 7. */
  periodDays: number;
  /**
   * Work sessions per day that count as a "full" day. Sessions beyond this on
   * a single day add nothing, so heavy study volume is never rewarded.
   * Default 3.
   */
  dailySessionTarget: number;
  /**
   * A just-finished work session does not yet "owe" a break: sessions
   * completed within this many minutes of now are excluded from the
   * break-compliance denominator. Default 30.
   */
  breakGraceMinutes: number;
  weights: WellnessWeights;
}

export const DEFAULT_WELLNESS_CONFIG: WellnessConfig = {
  periodDays: 7,
  dailySessionTarget: 3,
  breakGraceMinutes: 30,
  weights: { mood: 0.4, breakCompliance: 0.3, sessionFrequency: 0.3 },
};

export interface WellnessResult {
  /** Final 0–100 integer, or null when there is no work-session data. */
  score: number | null;
  status: WellnessStatus | null;
  hasData: boolean;
  /** Each factor normalised to 0–100, or null when it cannot be measured. */
  components: {
    mood: number | null;
    breakCompliance: number | null;
    sessionFrequency: number | null;
  };
  /** Weights actually used after dropping unmeasurable factors and re-normalising (sum to 1, or all 0). */
  weightsApplied: WellnessWeights;
  averageMood: number | null;
  counts: {
    completedWorkSessions: number;
    completedBreaks: number;
    moodRatings: number;
  };
  periodDays: number;
  periodStart: Date;
}

export type WellnessScoreState =
  | { status: 'unauthenticated'; result: null; error: null }
  | { status: 'loading'; result: null; error: null }
  | { status: 'empty'; result: WellnessResult; error: null }
  | { status: 'ready'; result: WellnessResult; error: null }
  | { status: 'error'; result: null; error: Error };
