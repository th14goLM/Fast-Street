import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, type } from '../../theme';

/** Chip selecionável (categoria). Raio 8, altura 40, tint laranja quando ativo. */
export function Chip({ label, selected, onPress, invalid }: { label: string; selected: boolean; onPress: () => void; invalid?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: selected ? colors.primary : invalid ? colors.danger : colors.line,
          backgroundColor: selected ? colors.primaryTintStrong : pressed ? colors.ghostPressed : 'transparent',
        },
      ]}
    >
      <Text style={[type.label, { fontFamily: 'Inter_500Medium', color: selected ? colors.primaryText : colors.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.chip, borderWidth: 1, justifyContent: 'center' },
});
