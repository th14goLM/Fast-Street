import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, touch, type } from '../../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'warning';

const VARIANTS: Record<Variant, { border: string; text: string; pressed: string; height: number }> = {
  // Primário em contorno (Nocturne): nunca preenchido.
  primary: { border: colors.primary, text: colors.primaryText, pressed: colors.primaryPressedTint, height: touch.cta },
  secondary: { border: colors.line, text: colors.text, pressed: colors.neutralPressed, height: touch.input },
  ghost: { border: 'transparent', text: colors.text, pressed: colors.ghostPressed, height: touch.input },
  warning: { border: colors.warning, text: colors.warningText, pressed: colors.warningPressed, height: touch.min },
};

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, compact, style, accessibilityHint }: Props) {
  const v = VARIANTS[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        { minHeight: v.height, borderColor: v.border, borderWidth: variant === 'ghost' ? 0 : 1 },
        compact && styles.compact,
        pressed && { backgroundColor: v.pressed },
        disabled && !loading && styles.disabled,
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? <ActivityIndicator size="small" color={v.text} /> : icon}
        <Text style={[type.button, compact && { fontSize: 14 }, { color: v.text }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.control, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  compact: { alignSelf: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  disabled: { opacity: 0.45 },
});
