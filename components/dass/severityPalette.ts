import type { DassSeverity } from '@/constants/dass21';

/**
 * Severity hues for the readiness history screen.
 * SEVERITY_COLORS are the vivid palette — used for bands, dots and large
 * graphics only. SEVERITY_TEXT_COLORS are contrast-checked variants (>= 4.5:1
 * on the card background) for chips, labels and scores in each theme.
 */
export const SEVERITY_COLORS: Record<DassSeverity, string> = {
  normal: '#2E9E5B',
  mild: '#7CB518',
  moderate: '#C98A12',
  severe: '#D96C2C',
  extremely_severe: '#C94C3C',
};

export const SEVERITY_TEXT_COLORS: Record<'light' | 'dark', Record<DassSeverity, string>> = {
  light: {
    normal: '#1E7A44',
    mild: '#5C7A0C',
    moderate: '#8F5E0B',
    severe: '#B44A1E',
    extremely_severe: '#A93B32',
  },
  dark: {
    normal: '#5CC98F',
    mild: '#B7D455',
    moderate: '#F0B95C',
    severe: '#F2995F',
    extremely_severe: '#F08080',
  },
};

/** Band fill opacity: subtle on white cards, a bit stronger on dark cards. */
export const BAND_FILL_OPACITY = { light: 0.1, dark: 0.18 } as const;

export function severityTextColor(severity: DassSeverity, isDark: boolean): string {
  return SEVERITY_TEXT_COLORS[isDark ? 'dark' : 'light'][severity];
}
