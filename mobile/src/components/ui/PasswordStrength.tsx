import { StyleSheet, Text, View } from 'react-native';
import { colors, strengthColors, type } from '../../theme';
import { passwordStrength } from '../../features/auth/passwordStrength';

/** Medidor de 4 barras + dica (RN-CAD-03). */
export function PasswordStrength({ password, error }: { password: string; error?: string }) {
  const { score, hint } = passwordStrength(password);
  const color = score ? strengthColors[score - 1] : colors.surfaceElevated;
  const text = password.length ? hint : (error ?? hint);
  return (
    <View style={styles.wrap} accessible accessibilityLabel={text} accessibilityLiveRegion="polite">
      <View style={styles.bars}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.bar, { backgroundColor: i < score ? color : colors.surfaceElevated }]} />
        ))}
      </View>
      <Text style={[type.caption, { color: error ? colors.dangerText : colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
});
