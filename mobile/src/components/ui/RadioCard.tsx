import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, type } from '../../theme';

interface Props {
  label: string;
  description: string;
  icon: (color: string) => ReactNode;
  selected: boolean;
  onPress: () => void;
}

/** Card de escolha única (perfil Piloto / Organizador / Ambos). */
export function RadioCard({ label, description, icon, selected, onPress }: Props) {
  const border = selected ? colors.primary : colors.surfaceElevated;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${label}. ${description}`}
      style={({ pressed }) => [
        styles.card,
        { borderColor: border, backgroundColor: selected ? colors.primaryTint : pressed ? colors.ghostPressed : 'transparent' },
      ]}
    >
      <View style={styles.icon}>{icon(selected ? colors.primaryText : colors.textSecondary)}</View>
      <View style={styles.texts}>
        <Text style={[type.button, { color: colors.text }]}>{label}</Text>
        <Text style={[type.caption, { color: colors.textSecondary }]}>{description}</Text>
      </View>
      <View style={[styles.dot, { borderColor: border }]}>
        {selected && <View style={styles.dotFill} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 60,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  // Anel interno de 4px na cor do fundo + miolo laranja.
  dotFill: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.primary },
});
