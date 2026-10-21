import type { TextStyle } from 'react-native';

/** Famílias carregadas em src/app/_layout.tsx via @expo-google-fonts. */
export const fonts = {
  display: 'BarlowCondensed_600SemiBold',
  displayBold: 'BarlowCondensed_700Bold',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;

/** Escala tipográfica do Design System (seção 5.3). */
export const type = {
  brand: { fontFamily: fonts.display, fontSize: 64, lineHeight: 58, letterSpacing: 1.3, textTransform: 'uppercase' },
  displayL: { fontFamily: fonts.display, fontSize: 44, lineHeight: 42, textTransform: 'uppercase' },
  displayM: { fontFamily: fonts.display, fontSize: 40, lineHeight: 38, textTransform: 'uppercase' },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 31, textTransform: 'uppercase' },
  overline: { fontFamily: fonts.display, fontSize: 12, lineHeight: 12, letterSpacing: 1.9, textTransform: 'uppercase' },
  counter: { fontFamily: fonts.display, fontSize: 13, lineHeight: 13, letterSpacing: 2.1 },
  bodyL: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  input: { fontFamily: fonts.body, fontSize: 15 },
  label: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  button: { fontFamily: fonts.medium, fontSize: 15 },
  caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
} satisfies Record<string, TextStyle>;
