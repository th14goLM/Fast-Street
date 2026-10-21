import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, FlagCheckered } from 'phosphor-react-native';
import { colors, radius, touch, type } from '../../theme';

/** Botão "Voltar" 44×44 do cabeçalho. */
export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      style={({ pressed }) => [styles.back, pressed && { backgroundColor: colors.ghostPressed }]}
    >
      <ArrowLeft size={22} color={colors.text} />
    </Pressable>
  );
}

/** Barra de progresso segmentada (Passo N de 4). */
export function StepProgress({ current, total = 4 }: { current: number; total?: number }) {
  return (
    <View style={styles.steps} accessibilityRole="progressbar" accessibilityLabel={`Passo ${current} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.step, { backgroundColor: i < current ? colors.primary : colors.surfaceElevated }]} />
      ))}
    </View>
  );
}

/** Divisor "ou" com linhas que esmaecem nas pontas (assinatura do Nocturne). */
export function OrDivider() {
  return (
    <View style={styles.or}>
      <LinearGradient colors={['transparent', colors.line]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.orLine} />
      <Text style={[type.caption, { color: colors.textSecondary }]}>ou</Text>
      <LinearGradient colors={[colors.line, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.orLine} />
    </View>
  );
}

/** Kicker (overline laranja) + título display. */
export function ScreenTitle({ kicker, title, size = 'L' }: { kicker: string; title: string; size?: 'L' | 'M' }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[type.overline, { color: colors.primaryText }]}>{kicker}</Text>
      <Text accessibilityRole="header" style={[size === 'L' ? type.displayL : type.displayM, { color: colors.text }]}>
        {title}
      </Text>
    </View>
  );
}

/** Marca: quadrado com borda laranja e bandeira quadriculada. */
export function BrandMark({ size = 56 }: { size?: number }) {
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size > 40 ? radius.card : radius.sm }]}>
      <FlagCheckered size={Math.round(size * 0.54)} color={colors.primaryText} />
    </View>
  );
}

/** Linha de acento: laranja sólido esmaecendo para a direita. */
export function AccentRule({ width = 120 }: { width?: number }) {
  return <LinearGradient colors={[colors.primary, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width, height: 2, borderRadius: 1 }} />;
}

export function InlineRow({ children }: { children: ReactNode }) {
  return <View style={styles.inline}>{children}</View>;
}

const styles = StyleSheet.create({
  back: { width: touch.min, height: touch.min, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center' },
  steps: { flex: 1, flexDirection: 'row', gap: 4, paddingRight: 16 },
  step: { flex: 1, height: 3, borderRadius: 2 },
  or: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orLine: { flex: 1, height: 1 },
  mark: { borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(26,39,48,0.6)' },
  inline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
});
