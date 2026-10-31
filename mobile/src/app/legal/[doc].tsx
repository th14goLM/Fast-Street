import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Info } from 'phosphor-react-native';
import { BackButton, ScreenTitle } from '../../components/ui';
import { LEGAL_DOCS, type LegalDocId } from '../../features/legal/documents';
import { colors, radius, space, type } from '../../theme';

/** Termos de Uso / Política de Privacidade (abertos a partir do aceite no cadastro). */
export default function LegalDocument() {
  const { doc } = useLocalSearchParams<{ doc: LegalDocId }>();
  const insets = useSafeAreaInsets();
  const content = LEGAL_DOCS[doc] ?? LEGAL_DOCS.termos;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/cadastro'))} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <ScreenTitle kicker={`Versão ${content.version}`} title={content.title} size="M" />
        <View style={styles.draft}>
          <Info size={18} color={colors.gulf} />
          <Text style={[type.label, { color: colors.textMuted, flex: 1 }]}>
            Minuta. O texto definitivo, revisado pelo jurídico, será inserido antes da publicação do app.
          </Text>
        </View>
        {content.sections.map((s) => (
          <View key={s.heading} style={{ gap: 6 }}>
            <Text style={[type.button, { color: colors.text }]}>{s.heading}</Text>
            <Text style={[type.body, { color: colors.textSecondary }]}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 12, paddingVertical: 4, flexDirection: 'row' },
  content: { paddingHorizontal: space.gutter, paddingTop: 8, gap: 20 },
  draft: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceElevated,
  },
});
