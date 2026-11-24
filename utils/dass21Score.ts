import {
  DASS21_ITEMS,
  DASS_BLOCK_THRESHOLD,
  DASS_ITEM_COUNT,
  SEVERITY_CUTOFFS,
  SEVERITY_ORDER,
  type DassSeverity,
  type DassSubscale,
} from '../constants/dass21';

export interface DassScores {
  depression: number;
  anxiety: number;
  stress: number;
}

export interface DassResult {
  /** Already multiplied by 2 */
  scores: DassScores;
  severities: Record<DassSubscale, DassSeverity>;
}

/** Map a MULTIPLIED subscale score to its severity band. */
export function getSeverity(subscale: DassSubscale, score: number): DassSeverity {
  if (!Number.isFinite(score) || score < 0) {
    throw new RangeError(`Invalid ${subscale} score: ${score}`);
  }
  const c = SEVERITY_CUTOFFS[subscale];
  if (score <= c.normal) return 'normal';
  if (score <= c.mild) return 'mild';
  if (score <= c.moderate) return 'moderate';
  if (score <= c.severe) return 'severe';
  return 'extremely_severe';
}

/**
 * Pure scoring function.
 * @param answers 21 integers 0-3, in item order (index 0 = item 1).
 */
export function scoreDass21(answers: readonly number[]): DassResult {
  if (answers.length !== DASS_ITEM_COUNT) {
    throw new RangeError(`Expected ${DASS_ITEM_COUNT} answers, got ${answers.length}`);
  }
  const sums: DassScores = { depression: 0, anxiety: 0, stress: 0 };
  DASS21_ITEMS.forEach((item, i) => {
    const a = answers[i];
    if (!Number.isInteger(a) || a < 0 || a > 3) {
      throw new RangeError(`Answer for item ${item.id} must be an integer 0-3, got ${a}`);
    }
    sums[item.subscale] += a;
  });
  const scores: DassScores = {
    depression: sums.depression * 2,
    anxiety: sums.anxiety * 2,
    stress: sums.stress * 2,
  };
  return {
    scores,
    severities: {
      depression: getSeverity('depression', scores.depression),
      anxiety: getSeverity('anxiety', scores.anxiety),
      stress: getSeverity('stress', scores.stress),
    },
  };
}

export function severityRank(s: DassSeverity): number {
  return SEVERITY_ORDER.indexOf(s);
}

export function isAtOrAbove(s: DassSeverity, min: DassSeverity): boolean {
  return severityRank(s) >= severityRank(min);
}

/** True if ANY subscale is at or above the threshold. */
export function isBlocked(
  severities: Record<DassSubscale, DassSeverity>,
  threshold: DassSeverity = DASS_BLOCK_THRESHOLD,
): boolean {
  return (Object.values(severities) as DassSeverity[]).some((s) => isAtOrAbove(s, threshold));
}
