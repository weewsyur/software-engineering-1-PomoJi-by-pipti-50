/**
 * Shared mood scale used by the after-session mood check-in and the
 * before-session check. No runtime dependencies.
 */

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
