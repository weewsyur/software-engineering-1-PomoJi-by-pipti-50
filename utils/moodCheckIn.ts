/**
 * Mood check-in helpers: prompt guard + Firestore write.
 * Firebase is NOT initialised here; pass in your existing Firestore instance.
 */
import { doc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';
import {
  MOOD_OPTIONS,
  type MoodLabel,
  type MoodOption,
  type MoodRating,
} from '@/constants/mood';

// ───────────────────────── Sessions ─────────────────────────

/** Maps session document field names/values to the normalised shape. */
export interface SessionFieldMap {
  /** Field holding the session type, e.g. "work" | "shortBreak" | "longBreak". */
  typeField: string;
  /** Optional boolean field, true when the session finished successfully. */
  completedField: string;
  /** Optional string field, e.g. "completed" | "cancelled". */
  statusField: string;
  /** Timestamp field set when the session finished. */
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

export type SessionKind = 'work' | 'break' | 'unknown';

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

export function isValidMoodRating(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 5;
}

// ───────────────────────── Mood helpers ─────────────────────────

export type MoodCheckInErrorCode =
  | 'unauthenticated'
  | 'invalid-rating'
  | 'missing-session'
  | 'not-work-session'
  | 'already-recorded'
  | 'firestore-failure';

export class MoodCheckInError extends Error {
  readonly code: MoodCheckInErrorCode;
  constructor(code: MoodCheckInErrorCode, message: string) {
    super(message);
    this.name = 'MoodCheckInError';
    this.code = code;
  }
}

export function getMoodOption(rating: number): MoodOption | null {
  return MOOD_OPTIONS.find((o) => o.rating === rating) ?? null;
}

export function getMoodLabel(rating: number): MoodLabel | null {
  return getMoodOption(rating)?.label ?? null;
}

/** Only completed focus or break sessions may prompt. */
export function shouldPromptMoodCheckIn(
  sessionId: string | null | undefined,
  sessionType: unknown,
  fieldMap: SessionFieldMap = DEFAULT_FIELD_MAP,
): boolean {
  if (typeof sessionId !== 'string' || sessionId.trim() === '') return false;
  return classifySessionKind(sessionType, fieldMap) !== 'unknown';
}

/**
 * Remembers which sessions have already been offered a prompt. `claim` is
 * synchronous, so a completion handler firing twice in the same tick still
 * yields exactly one `true`. Skipped sessions stay claimed: no re-prompting.
 */
export function createMoodPromptGuard() {
  const claimed = new Set<string>();
  return {
    claim(sessionId: string): boolean {
      if (claimed.has(sessionId)) return false;
      claimed.add(sessionId);
      return true;
    },
    has: (sessionId: string): boolean => claimed.has(sessionId),
  };
}
export type MoodPromptGuard = ReturnType<typeof createMoodPromptGuard>;

export interface SaveMoodParams {
  firestore: Firestore;
  /** Authenticated user's uid (e.g. auth.currentUser?.uid). */
  userId: string | null | undefined;
  sessionId: string;
  rating: number;
  fieldMap?: SessionFieldMap;
}

/**
 * Writes moodRating / moodLabel / moodRecordedAt onto
 * users/{userId}/sessions/{sessionId}. Runs in a transaction so it never
 * creates a session doc, never writes to a break session, and never
 * overwrites an existing rating. Skipping = simply not calling this.
 */
export async function saveMoodToSession(
  params: SaveMoodParams,
): Promise<{ rating: MoodRating; label: MoodLabel }> {
  const { firestore, userId, sessionId, rating, fieldMap = DEFAULT_FIELD_MAP } = params;

  if (!userId) throw new MoodCheckInError('unauthenticated', 'You need to be signed in to save a mood.');
  if (!sessionId) throw new MoodCheckInError('missing-session', 'No session to attach this mood to.');
  const option = isValidMoodRating(rating) && Number.isInteger(rating) ? getMoodOption(rating) : null;
  if (!option) throw new MoodCheckInError('invalid-rating', 'Mood rating must be a whole number from 1 to 5.');

  const ref = doc(firestore, 'users', userId, 'sessions', sessionId);
  try {
    await runTransaction(firestore, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new MoodCheckInError('missing-session', 'That session could not be found.');
      const data = snap.data() as Record<string, unknown>;
      if (classifySessionKind(data[fieldMap.typeField], fieldMap) === 'unknown') {
        throw new MoodCheckInError('not-work-session', 'Mood can only be recorded for a completed timer session.');
      }
      if (isValidMoodRating(data[fieldMap.moodRatingField])) {
        throw new MoodCheckInError('already-recorded', 'A mood was already recorded for this session.');
      }
      tx.update(ref, {
        [fieldMap.moodRatingField]: option.rating,
        moodLabel: option.label,
        moodRecordedAt: serverTimestamp(),
      });
    });
    return { rating: option.rating, label: option.label };
  } catch (err) {
    if (err instanceof MoodCheckInError) throw err;
    const code = (err as { code?: string } | null)?.code;
    throw new MoodCheckInError(
      'firestore-failure',
      code === 'permission-denied'
        ? 'Permission denied while saving your mood.'
        : 'Could not save your mood. Please try again.',
    );
  }
}
