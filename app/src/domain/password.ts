/**
 * Password strength 0–4, as specified in the design system:
 * +1 length ≥ 8, +1 mixed case, +1 digit, +1 symbol with length ≥ 10.
 * Any non-empty password scores at least 1.
 */
export function passwordScore(p: string): number {
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p) && p.length >= 10) score++;
  if (p.length && !score) score = 1;
  return score;
}

export const STRENGTH_COLORS = ['#EF4444', '#F59E0B', '#B0CEE2', '#22C55E'];
export const STRENGTH_LABELS = ['', 'fraca', 'razoável', 'boa', 'forte'];

/** Colors for the 4-segment meter. */
export const meterBars = (score: number) =>
  [0, 1, 2, 3].map((i) => (i < score ? STRENGTH_COLORS[score - 1] : undefined));
