/**
 * Tokens de cor do Fast Street (docs/FAST_STREET_ESPECIFICACAO.md, seção 5).
 * Nunca use hex direto nas telas: importe daqui.
 */
export const colors = {
  // Paleta-base (foto de referência)
  background: '#1A2730',
  neutralWarm: '#424048',
  line: '#45586C',
  gulf: '#B0CEE2', // pódio, conquistas, selos, "Principal"
  primary: '#E95D2C', // bordas, ícones, títulos grandes
  primaryPressed: '#A63E1B',

  // Derivadas
  surface: '#22323E',
  surfaceElevated: '#2C3D4B',
  chrome: '#0F171D',
  primaryText: '#F28A62', // texto laranja em corpo (≥ 5,5:1)
  text: '#F5F7FA',
  textMuted: '#C9D2DC',
  textSecondary: '#9AA4B2',
  textTertiary: '#6B7F95',
  checkboxIdle: '#6B7F95',

  // Semânticas
  success: '#22C55E',
  successText: '#4ADE80',
  warning: '#F59E0B',
  warningText: '#FBBF24',
  danger: '#EF4444',
  dangerText: '#F87171',
  dangerAlertText: '#FCA5A5',

  // Tints translúcidos
  primaryTint: 'rgba(233,93,44,0.08)',
  primaryTintStrong: 'rgba(233,93,44,0.12)',
  primaryPressedTint: 'rgba(166,62,27,0.35)',
  focusRing: 'rgba(233,93,44,0.25)',
  neutralPressed: 'rgba(245,247,250,0.07)',
  ghostPressed: 'rgba(245,247,250,0.06)',
  dangerTint: 'rgba(239,68,68,0.10)',
  dangerBorder: 'rgba(239,68,68,0.4)',
  dangerFieldBg: 'rgba(239,68,68,0.06)',
  warningTint: 'rgba(245,158,11,0.10)',
  warningBorder: 'rgba(245,158,11,0.4)',
  warningPressed: 'rgba(245,158,11,0.12)',
  scrim: 'rgba(26,39,48,0.7)',
  overlay: 'rgba(8,13,17,0.6)',
} as const;

/** Cores das 4 barras do medidor de força de senha (RN-CAD-03). */
export const strengthColors = [colors.danger, colors.warning, colors.gulf, colors.success] as const;
