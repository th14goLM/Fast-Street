/**
 * Força da senha (RN-CAD-03), idêntica ao protótipo:
 * +1 se ≥ 8 caracteres; +1 maiúscula e minúscula; +1 dígito; +1 símbolo com ≥ 10 caracteres.
 * Senha não vazia sem pontos vale 1.
 */
const LABELS = ['', 'fraca', 'razoável', 'boa', 'forte'] as const;

export function passwordStrength(pwd: string): { score: 0 | 1 | 2 | 3 | 4; hint: string } {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd) && pwd.length >= 10) score++;
  if (pwd.length && !score) score = 1;
  const s = score as 0 | 1 | 2 | 3 | 4;
  if (!pwd.length) return { score: 0, hint: 'Mínimo 8 caracteres' };
  return { score: s, hint: `Força ${LABELS[s]}${s < 3 ? ' · combine maiúsculas, números e símbolos' : ''}` };
}
