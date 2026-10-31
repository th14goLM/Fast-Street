import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StepProgress } from './ui';
import { colors, radius, touch, type } from '../theme';

/** Cabeçalho dos passos 2–4: barra de progresso + ação opcional ("Pular", "Fazer depois"). */
export function OnboardingHeader({ step, action }: { step: number; action?: { label: string; onPress: () => void; outlined?: boolean } }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.row, { paddingTop: insets.top + 4, paddingBottom: action ? 0 : 12 }]}>
      <StepProgress current={step} />
      {action && (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.action,
            action.outlined && { borderWidth: 1, borderColor: colors.line },
            pressed && { backgroundColor: colors.neutralPressed },
          ]}
        >
          <Text style={[type.button, { fontSize: 14, color: colors.text }]}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 24, paddingRight: 12, minHeight: touch.min },
  action: { minHeight: touch.min, paddingHorizontal: 14, borderRadius: radius.control, justifyContent: 'center' },
});
