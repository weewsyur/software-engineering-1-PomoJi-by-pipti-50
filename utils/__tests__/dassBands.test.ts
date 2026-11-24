import { severityBands } from '../dassBands';
import { SEVERITY_ORDER } from '@/constants/dass21';

describe('severityBands', () => {
  it('returns one band per severity in order', () => {
    for (const sub of ['depression', 'anxiety', 'stress'] as const) {
      const bands = severityBands(sub);
      expect(bands.map((b) => b.severity)).toEqual([...SEVERITY_ORDER]);
    }
  });

  it('matches the documented DASS-21 cutoffs', () => {
    const dep = severityBands('depression');
    expect(dep.map((b) => [b.min, b.max])).toEqual([
      [0, 9.5],
      [9.5, 13.5],
      [13.5, 20.5],
      [20.5, 27.5],
      [27.5, 42],
    ]);

    const anx = severityBands('anxiety');
    expect(anx.map((b) => [b.min, b.max])).toEqual([
      [0, 7.5],
      [7.5, 9.5],
      [9.5, 14.5],
      [14.5, 19.5],
      [19.5, 42],
    ]);

    const str = severityBands('stress');
    expect(str.map((b) => [b.min, b.max])).toEqual([
      [0, 14.5],
      [14.5, 18.5],
      [18.5, 25.5],
      [25.5, 33.5],
      [33.5, 42],
    ]);
  });

  it('keeps every integer score inside exactly one band', () => {
    for (const sub of ['depression', 'anxiety', 'stress'] as const) {
      for (let score = 0; score <= 42; score++) {
        const hits = severityBands(sub).filter((b) => score >= b.min && score <= b.max);
        expect(hits).toHaveLength(1);
      }
    }
  });
});
