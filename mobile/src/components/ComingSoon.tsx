import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, space, type } from '../theme';
import { BackButton, ScreenTitle } from './ui';

/** Tela provisória das áreas que ainda serão implementadas (Mapa, Garagem, Ranking...). */
export function ComingSoon({ kicker, title, text, icon, onBack }: { kicker: string; title: string; text: string; icon: ReactNode; onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      {onBack && <BackButton onPress={onBack} />}
      <ScreenTitle kicker={kicker} title={title} size="M" />
      <View style={styles.card}>
        <View style={styles.icon}>{icon}</View>
        <Text style={[type.overline, { color: colors.textSecondary }]}>Em breve</Text>
        <Text style={[type.body, { color: colors.textMuted, textAlign: 'center' }]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: space.gutter, gap: 24 },
  card: { alignItems: 'center', gap: 10, padding: 24, borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceElevated },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated },
});
