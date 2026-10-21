import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WarningCircle } from 'phosphor-react-native';
import { colors, radius, type } from '../../theme';

/** Banner de erro (vermelho) usado no login e no resumo de erros do cadastro. */
export function ErrorAlert({ message, compact }: { message: string; compact?: boolean }) {
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[styles.error, compact && styles.compact]}>
      <WarningCircle size={compact ? 18 : 20} color={colors.dangerText} />
      <Text style={[compact ? type.label : type.body, { color: colors.dangerAlertText, flex: 1 }]}>{message}</Text>
    </View>
  );
}

/** Cartão âmbar com título, texto e ações (ex.: "Confirme seu e-mail"). */
export function WarningCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.warning}>
      <View style={styles.row}>
        {icon}
        <Text style={[type.button, { color: colors.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerTint,
  },
  compact: { paddingVertical: 10, gap: 8 },
  warning: {
    padding: 16,
    gap: 10,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    backgroundColor: colors.warningTint,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
