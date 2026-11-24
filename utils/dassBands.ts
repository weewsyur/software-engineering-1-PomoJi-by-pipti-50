import {
  SEVERITY_CUTOFFS,
  SEVERITY_ORDER,
  type DassSeverity,
  type DassSubscale,
} from '@/constants/dass21';

export interface SeverityBand {
  severity: DassSeverity;
  /** Inclusive lower score bound. */
  min: number;
  /** Inclusive upper score bound. */
  max: number;
}

/**
 * Horizontal score bands for one subscale, derived from SEVERITY_CUTOFFS.
 * Cutoffs are the highest inclusive score of each band, so band edges sit at
 * cutoff + 0.5 to keep integer scores inside their own band.
 */
export function severityBands(subscale: DassSubscale, maxScore = 42): SeverityBand[] {
  const c = SEVERITY_CUTOFFS[subscale];
  const edges = [0, c.normal + 0.5, c.mild + 0.5, c.moderate + 0.5, c.severe + 0.5, maxScore];
  return SEVERITY_ORDER.map((severity, i) => ({
    severity,
    min: edges[i],
    max: edges[i + 1],
  }));
}
