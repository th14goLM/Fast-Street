import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OnboardingHeader } from './OnboardingHeader';
import { Button } from './ui';
import { colors, space, type } from '../theme';

interface Props {
  kicker: string;
  title: string;
  text: string;
  icon: ReactNode;
  children: ReactNode;
  primary: { label: string; onPress: () => void; loading?: boolean };
  secondary: { label: string; onPress: () => void };
}

/** Pré-permissão (passo 3): explica o porquê antes do prompt do sistema, como no protótipo. */
export function PermissionStep({ kicker, title, text, icon, children, primary, secondary }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      {/* Aproxima o radial-gradient do protótipo (luz no canto superior esquerdo). */}
      <LinearGradient colors={[colors.surface, colors.background]} locations={[0, 0.6]} start={{ x: 0, y: 0.1 }} end={{ x: 0.9, y: 0.7 }} style={StyleSheet.absoluteFill} />
      <OnboardingHeader step={3} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.icon}>{icon}</View>
        <Text style={[type.overline, { color: colors.primaryText }]}>{kicker}</Text>
        <Text accessibilityRole="header" style={[type.displayL, { color: colors.text }]}>{title}</Text>
        <Text style={[type.bodyL, { color: colors.textMuted }]}>{text}</Text>
        <View style={{ gap: 12, marginTop: 4 }}>{children}</View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 22 }]}>
        <Button label={primary.label} onPress={primary.onPress} loading={primary.loading} />
        <Button label={secondary.label} variant="ghost" onPress={secondary.onPress} />
      </View>
    </View>
  );
}

/** Linha com ícone Gulf + texto (garantias de privacidade). */
export function PermissionPoint({ icon, children }: { icon: ReactNode; children: string }) {
  return (
    <View style={styles.point}>
      {icon}
      <Text style={[type.body, { color: colors.textMuted, flex: 1 }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: space.gutterWide, paddingTop: 36, paddingBottom: 24, gap: 20 },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // Brilho laranja suave (box-shadow 0 0 40px do protótipo).
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    backgroundColor: colors.background,
  },
  footer: { paddingHorizontal: space.gutter, paddingTop: 12, gap: 8 },
  point: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
});
