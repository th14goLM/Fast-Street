import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'phosphor-react-native';
import { colors, touch } from '../../theme';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  invalid?: boolean;
  accessibilityLabel: string;
  children: ReactNode;
}

/** Checkbox 24px com área de toque de 44px (aceite de termos). */
export function Checkbox({ checked, onChange, invalid, accessibilityLabel, children }: Props) {
  const border = checked ? colors.primary : invalid ? colors.danger : colors.checkboxIdle;
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onChange(!checked)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={accessibilityLabel}
        style={styles.hit}
      >
        <View style={[styles.box, { borderColor: border, backgroundColor: checked ? colors.primary : 'transparent' }]}>
          {checked && <Check size={14} weight="bold" color={colors.background} />}
        </View>
      </Pressable>
      <View style={styles.label}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  hit: { width: touch.min, height: touch.min, marginTop: -10, marginLeft: -10, alignItems: 'center', justifyContent: 'center' },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, marginLeft: 2 },
});
