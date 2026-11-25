/**
 * DASS-21 constants: items, subscale mapping, severity cut-offs, gate config.
 * Standard DASS-21 wording and scoring are kept unchanged on purpose.
 * Scoring rule: sum each 7-item subscale, then multiply by 2.
 */

export type DassSubscale = 'depression' | 'anxiety' | 'stress';

export type DassSeverity =
  | 'normal'
  | 'mild'
  | 'moderate'
  | 'severe'
  | 'extremely_severe';

/** Lowest to highest. Index = rank. */
export const SEVERITY_ORDER: readonly DassSeverity[] = [
  'normal',
  'mild',
  'moderate',
  'severe',
  'extremely_severe',
] as const;

export const SEVERITY_LABELS: Record<DassSeverity, string> = {
  normal: 'Normal',
  mild: 'Mild',
  moderate: 'Moderate',
  severe: 'Severe',
  extremely_severe: 'Extremely Severe',
};

export const SUBSCALE_LABELS: Record<DassSubscale, string> = {
  stress: 'Stress',
  anxiety: 'Anxiety',
  depression: 'Depression',
};

export interface DassItem {
  /** 1-based item number as in the standard questionnaire */
  id: number;
  text: string;
  subscale: DassSubscale;
}

export const DASS21_ITEMS: readonly DassItem[] = [
  { id: 1, subscale: 'stress', text: 'I found it hard to wind down' },
  { id: 2, subscale: 'anxiety', text: 'I was aware of dryness of my mouth' },
  { id: 3, subscale: 'depression', text: "I couldn't seem to experience any positive feeling at all" },
  {
    id: 4,
    subscale: 'anxiety',
    text: 'I experienced breathing difficulty (e.g. excessively rapid breathing, breathlessness in the absence of physical exertion)',
  },
  { id: 5, subscale: 'depression', text: 'I found it difficult to work up the initiative to do things' },
  { id: 6, subscale: 'stress', text: 'I tended to over-react to situations' },
  { id: 7, subscale: 'anxiety', text: 'I experienced trembling (e.g. in the hands)' },
  { id: 8, subscale: 'stress', text: 'I felt that I was using a lot of nervous energy' },
  {
    id: 9,
    subscale: 'anxiety',
    text: 'I was worried about situations in which I might panic and make a fool of myself',
  },
  { id: 10, subscale: 'depression', text: 'I felt that I had nothing to look forward to' },
  { id: 11, subscale: 'stress', text: 'I found myself getting agitated' },
  { id: 12, subscale: 'stress', text: 'I found it difficult to relax' },
  { id: 13, subscale: 'depression', text: 'I felt down-hearted and blue' },
  {
    id: 14,
    subscale: 'stress',
    text: 'I was intolerant of anything that kept me from getting on with what I was doing',
  },
  { id: 15, subscale: 'anxiety', text: 'I felt I was close to panic' },
  { id: 16, subscale: 'depression', text: 'I was unable to become enthusiastic about anything' },
  { id: 17, subscale: 'depression', text: "I felt I wasn't worth much as a person" },
  { id: 18, subscale: 'stress', text: 'I felt that I was rather touchy' },
  {
    id: 19,
    subscale: 'anxiety',
    text: 'I was aware of the action of my heart in the absence of physical exertion (e.g. sense of heart rate increase, heart missing a beat)',
  },
  { id: 20, subscale: 'anxiety', text: 'I felt scared without any good reason' },
  { id: 21, subscale: 'depression', text: 'I felt that life was meaningless' },
] as const;

export const DASS_ITEM_COUNT = 21;

export const ANSWER_OPTIONS: readonly { value: 0 | 1 | 2 | 3; label: string }[] = [
  { value: 0, label: 'Did not apply to me at all' },
  { value: 1, label: 'Applied to me to some degree, or some of the time' },
  { value: 2, label: 'Applied to me to a considerable degree, or a good part of the time' },
  { value: 3, label: 'Applied to me very much, or most of the time' },
] as const;

/**
 * Highest (inclusive) MULTIPLIED score that still belongs to each band.
 * Anything above `severe` is Extremely Severe.
 *
 *            Depression  Anxiety  Stress
 * Normal     0-9         0-7      0-14
 * Mild       10-13       8-9      15-18
 * Moderate   14-20       10-14    19-25
 * Severe     21-27       15-19    26-33
 * Ext.Severe 28+         20+      34+
 */
export const SEVERITY_CUTOFFS: Record<
  DassSubscale,
  { normal: number; mild: number; moderate: number; severe: number }
> = {
  depression: { normal: 9, mild: 13, moderate: 20, severe: 27 },
  anxiety: { normal: 7, mild: 9, moderate: 14, severe: 19 },
  stress: { normal: 14, mild: 18, moderate: 25, severe: 33 },
};

/**
 * GATE CONFIG: if ANY subscale is at or above this severity, the student
 * cannot start a session. Change this one constant to adjust the gate.
 * (Client-side only; the once-per-day limit is enforced by Firestore rules.)
 */
export const DASS_BLOCK_THRESHOLD: DassSeverity = 'severe';

/** A support line is shown at or above this severity (independent of the gate). */
export const DASS_SUPPORT_LINE_MIN_SEVERITY: DassSeverity = 'severe';

/** Standard timeframe instruction; keep the validated item context unchanged. */
export const DASS_INSTRUCTION =
  'For each statement, choose how much it applied to you over the past week.';

/**
 * SUPPORT LINE CONFIG.
 * TODO (before release): confirm the correct, current number and update here.
 * Intentionally left blank so no unverified number ships by accident.
 */
export const SUPPORT_LINE = {
  name: 'TODO: support line name',
  phone: '', // TODO: confirmed, current number
  hours: '', // optional, e.g. "24/7"
  note: 'You can also talk to your school guidance counselor or someone you trust.',
} as const;

/**
 * Copy for the Home "Daily readiness check" card. Keep all user-facing text
 * here so tone stays gentle and consistent.
 */
export const DASS_STATUS_COPY = {
  title: 'Daily readiness check',
  loading: 'Loading…',
  emptyTitle: 'Ready when you are',
  emptyBody: 'Take the short DASS-21 check before your first focus session each day.',
  emptyCta: 'Take readiness check',
  blockedHeadline: 'A lighter day: rest first',
  passedHeadline: "You're ready to focus",
  blockedNote: 'Your check suggests taking it easy. Choose a rest period, then check in again when it ends.',
  passedNote: 'Today’s check is complete. This is a screening tool, not a diagnosis.',
  pausePointLabel: 'pause point',
  /** {threshold} is replaced with the gate severity label, e.g. "Severe". */
  gateHint: 'Sessions pause when any area reaches {threshold} or above.',
  scoreOutOf: '/ 42',
  viewHistory: 'View history',
  /** Short labels for the 5-step axis (avoids "Extremely Severe" wrapping). */
  axisLabels: {
    normal: 'Normal',
    mild: 'Mild',
    moderate: 'Moderate',
    severe: 'Severe',
    extremely_severe: 'Extreme',
  } as Record<DassSeverity, string>,
} as const;
