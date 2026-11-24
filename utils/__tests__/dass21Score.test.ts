import {
  DASS21_ITEMS,
  SEVERITY_CUTOFFS,
  type DassSeverity,
  type DassSubscale,
} from '../../constants/dass21';
import { getSeverity, isBlocked, scoreDass21 } from '../dass21Score';

// [multiplied score, expected severity] for every boundary of every subscale
const BOUNDARIES: Record<DassSubscale, [number, DassSeverity][]> = {
  depression: [
    [0, 'normal'], [9, 'normal'], [10, 'mild'], [13, 'mild'], [14, 'moderate'],
    [20, 'moderate'], [21, 'severe'], [27, 'severe'], [28, 'extremely_severe'], [42, 'extremely_severe'],
  ],
  anxiety: [
    [0, 'normal'], [7, 'normal'], [8, 'mild'], [9, 'mild'], [10, 'moderate'],
    [14, 'moderate'], [15, 'severe'], [19, 'severe'], [20, 'extremely_severe'], [42, 'extremely_severe'],
  ],
  stress: [
    [0, 'normal'], [14, 'normal'], [15, 'mild'], [18, 'mild'], [19, 'moderate'],
    [25, 'moderate'], [26, 'severe'], [33, 'severe'], [34, 'extremely_severe'], [42, 'extremely_severe'],
  ],
};

describe('getSeverity boundaries', () => {
  (Object.keys(BOUNDARIES) as DassSubscale[]).forEach((sub) => {
    test.each(BOUNDARIES[sub])(`${sub} %i -> %s`, (score, expected) => {
      expect(getSeverity(sub, score)).toBe(expected);
    });
  });

  test('cut-off constants match the brief table', () => {
    expect(SEVERITY_CUTOFFS.depression).toEqual({ normal: 9, mild: 13, moderate: 20, severe: 27 });
    expect(SEVERITY_CUTOFFS.anxiety).toEqual({ normal: 7, mild: 9, moderate: 14, severe: 19 });
    expect(SEVERITY_CUTOFFS.stress).toEqual({ normal: 14, mild: 18, moderate: 25, severe: 33 });
  });

  test('rejects negative / non-finite scores', () => {
    expect(() => getSeverity('stress', -1)).toThrow(RangeError);
    expect(() => getSeverity('stress', NaN)).toThrow(RangeError);
  });
});

/** Build 21 answers whose RAW subscale sums are exactly d / a / s (each 0-21). */
function build(d: number, a: number, s: number): number[] {
  const remaining: Record<DassSubscale, number> = { depression: d, anxiety: a, stress: s };
  return DASS21_ITEMS.map((item) => {
    const give = Math.min(3, remaining[item.subscale]);
    remaining[item.subscale] -= give;
    return give;
  });
}

describe('scoreDass21', () => {
  test('item mapping has 7 items per subscale', () => {
    (['depression', 'anxiety', 'stress'] as DassSubscale[]).forEach((sub) => {
      expect(DASS21_ITEMS.filter((i) => i.subscale === sub)).toHaveLength(7);
    });
  });

  test('all zeros -> all Normal, scores 0', () => {
    const r = scoreDass21(new Array(21).fill(0));
    expect(r.scores).toEqual({ depression: 0, anxiety: 0, stress: 0 });
    expect(Object.values(r.severities).every((s) => s === 'normal')).toBe(true);
  });

  test('all threes -> 42 each, Extremely Severe', () => {
    const r = scoreDass21(new Array(21).fill(3));
    expect(r.scores).toEqual({ depression: 42, anxiety: 42, stress: 42 });
    expect(Object.values(r.severities).every((s) => s === 'extremely_severe')).toBe(true);
  });

  test('multiplies each subscale sum by 2', () => {
    const r = scoreDass21(build(5, 4, 7));
    expect(r.rawScores).toEqual({ depression: 5, anxiety: 4, stress: 7 });
    expect(r.scores).toEqual({ depression: 10, anxiety: 8, stress: 14 });
  });

  // Reachable (even) boundary values via real answer sets (raw sum, multiplied = raw*2)
  test.each([
    [4, 'normal'], [5, 'mild'], [6, 'mild'], [7, 'moderate'], [10, 'moderate'],
    [11, 'severe'], [13, 'severe'], [14, 'extremely_severe'],
  ] as [number, DassSeverity][])('depression raw %i -> %s', (raw, expected) => {
    expect(scoreDass21(build(raw, 0, 0)).severities.depression).toBe(expected);
  });

  test.each([
    [3, 'normal'], [4, 'mild'], [5, 'moderate'], [7, 'moderate'], [8, 'severe'],
    [9, 'severe'], [10, 'extremely_severe'],
  ] as [number, DassSeverity][])('anxiety raw %i -> %s', (raw, expected) => {
    expect(scoreDass21(build(0, raw, 0)).severities.anxiety).toBe(expected);
  });

  test.each([
    [7, 'normal'], [8, 'mild'], [9, 'mild'], [10, 'moderate'], [12, 'moderate'],
    [13, 'severe'], [16, 'severe'], [17, 'extremely_severe'],
  ] as [number, DassSeverity][])('stress raw %i -> %s', (raw, expected) => {
    expect(scoreDass21(build(0, 0, raw)).severities.stress).toBe(expected);
  });

  test('validates input', () => {
    expect(() => scoreDass21([0, 1])).toThrow(RangeError);
    expect(() => scoreDass21(new Array(21).fill(4))).toThrow(RangeError);
    expect(() => scoreDass21(new Array(21).fill(1.5))).toThrow(RangeError);
  });
});

describe('isBlocked', () => {
  const sev = (d: DassSeverity, a: DassSeverity, s: DassSeverity) => ({
    depression: d, anxiety: a, stress: s,
  });
  test('default threshold is Severe', () => {
    expect(isBlocked(sev('normal', 'normal', 'normal'))).toBe(false);
    expect(isBlocked(sev('moderate', 'moderate', 'moderate'))).toBe(false);
    expect(isBlocked(sev('normal', 'severe', 'normal'))).toBe(true);
    expect(isBlocked(sev('normal', 'normal', 'extremely_severe'))).toBe(true);
  });
  test('threshold is configurable', () => {
    expect(isBlocked(sev('normal', 'moderate', 'normal'), 'moderate')).toBe(true);
    expect(isBlocked(sev('severe', 'normal', 'normal'), 'extremely_severe')).toBe(false);
  });
});
