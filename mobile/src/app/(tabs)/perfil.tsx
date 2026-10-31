import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, CheckCircle, EnvelopeSimpleOpen, SealCheck, SignOut } from 'phosphor-react-native';
import { Button, ScreenTitle, WarningCard } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../features/auth/api';
import { useCooldown } from '../../features/auth/useCooldown';
import { useEmailVerification } from '../../features/auth/useEmailVerification';
import { colors, radius, space, type } from '../../theme';

const PERFIL = { piloto: 'Piloto', org: 'Organizador', ambos: 'Piloto e Organizador' } as const;

/** Perfil provisório: dados da conta, confirmação de e-mail e Sair. */
export default function Perfil() {
  const { usuario, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const cooldown = useCooldown();
  const [sending, setSending] = useState(false);
  const verificacao = useEmailVerification();

  if (!usuario) return null;

  async function resend() {
    setSending(true);
    try {
      const { retryAfterSeconds } = await authApi.resendVerification(usuario!.email);
      cooldown.start(retryAfterSeconds);
    } catch (err) {
      Alert.alert('Não foi possível reenviar', err instanceof Error ? err.message : 'Tente novamente.');
    } finally {
      setSending(false);
    }
  }

  async function exit() {
    await signOut();
    router.replace('/login');
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      <ScreenTitle kicker="Sua conta" title={usuario.nomeCompleto.split(' ')[0] ?? 'Perfil'} size="M" />

      {verificacao.justVerified && (
        <View style={styles.toast} accessibilityRole="alert">
          <CheckCircle size={20} weight="fill" color={colors.success} />
          <Text style={[type.body, { color: colors.text, flex: 1 }]}>E-mail confirmado · sua conta está ativa</Text>
        </View>
      )}

      {verificacao.pending && (
        <WarningCard icon={<EnvelopeSimpleOpen size={20} color={colors.warningText} />} title="Confirme seu e-mail">
          <Text style={[type.label, { color: colors.textMuted, lineHeight: 20 }]}>
            Enviamos um link para {usuario.email}. Abra o e-mail e toque em “Confirmar e-mail” (confira também o spam).
          </Text>
          {verificacao.notYet && (
            <Text style={[type.label, { color: colors.warningText }]}>Ainda não recebemos a confirmação. Abra o link do e-mail e tente de novo.</Text>
          )}
          <Button label="Já confirmei" variant="secondary" compact loading={verificacao.checking} onPress={verificacao.checkNow} />
          {cooldown.left > 0 ? (
            <View style={styles.row}>
              <Check size={14} weight="bold" color={colors.successText} />
              <Text style={[type.label, { color: colors.successText }]}>E-mail reenviado. Reenvie de novo em {cooldown.left} s.</Text>
            </View>
          ) : (
            <Button label="Reenviar e-mail de verificação" variant="warning" compact loading={sending} onPress={resend} />
          )}
        </WarningCard>
      )}

      <View style={styles.card}>
        <Linha label="Nome" valor={usuario.nomeCompleto} />
        <Linha
          label="E-mail"
          valor={usuario.email}
          extra={usuario.emailVerificado ? <SealCheck size={16} weight="fill" color={colors.successText} /> : null}
        />
        <Linha label="Cidade" valor={`${usuario.cidade.nome}, ${usuario.cidade.uf}`} />
        <Linha label="Perfil" valor={PERFIL[usuario.perfil]} ultima />
      </View>

      <Text style={[type.caption, { color: colors.textTertiary }]}>Edição do perfil, Garagem e preferências chegam nas próximas etapas.</Text>

      <Button label="Sair" variant="secondary" icon={<SignOut size={18} color={colors.text} />} onPress={exit} />
    </ScrollView>
  );
}

function Linha({ label, valor, extra, ultima }: { label: string; valor: string; extra?: React.ReactNode; ultima?: boolean }) {
  return (
    <View style={[styles.linha, !ultima && styles.divisor]}>
      <Text style={[type.overline, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.row}>
        <Text style={[type.body, { color: colors.text, flexShrink: 1 }]}>{valor}</Text>
        {extra}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: space.gutter, paddingBottom: 32, gap: 20 },
  toast: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    padding: 14,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  card: { paddingHorizontal: 16, borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceElevated },
  linha: { gap: 6, paddingVertical: 14 },
  divisor: { borderBottomWidth: 1, borderBottomColor: colors.surfaceElevated },
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
});
