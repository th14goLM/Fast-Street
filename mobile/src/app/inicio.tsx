import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, CheckCircle, EnvelopeSimpleOpen, SignOut } from 'phosphor-react-native';
import { BrandMark, Button, ScreenTitle, WarningCard } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../features/auth/api';
import { useCooldown } from '../features/auth/useCooldown';
import { colors, radius, space, type } from '../theme';

/**
 * Destino provisório após login/cadastro. As próximas etapas substituem esta tela
 * por UC-16 (dados opcionais) → permissões → UC-01 (primeiro veículo) → Feed.
 */
export default function Inicio() {
  const { usuario, signOut } = useAuth();
  const { novo } = useLocalSearchParams<{ novo?: string }>();
  const insets = useSafeAreaInsets();
  const cooldown = useCooldown();
  const [sending, setSending] = useState(false);

  if (!usuario) return null;
  const firstName = usuario.nomeCompleto.split(' ')[0];

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
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 12) + 22 }]}>
      <View style={styles.body}>
        <BrandMark size={44} />
        <ScreenTitle kicker={novo ? 'Conta criada' : 'Bem-vindo de volta'} title={`Olá, ${firstName}`} />

        {novo && (
          <View style={styles.toast} accessibilityRole="alert">
            <CheckCircle size={20} weight="fill" color={colors.success} />
            <Text style={[type.body, { color: colors.text, flex: 1 }]}>Cadastro concluído · passo 1 de 4</Text>
          </View>
        )}

        {!usuario.emailVerificado && (
          <WarningCard icon={<EnvelopeSimpleOpen size={20} color={colors.warningText} />} title="Confirme seu e-mail">
            <Text style={[type.label, { color: colors.textMuted, lineHeight: 20 }]}>
              Enviamos um link para {usuario.email}. Você precisa confirmar para entrar de novo depois de sair.
            </Text>
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
          <Text style={[type.overline, { color: colors.textSecondary }]}>Próxima etapa</Text>
          <Text style={[type.body, { color: colors.textMuted }]}>
            Dados opcionais do perfil, permissões de localização e notificações, primeiro veículo e Feed.
          </Text>
          <Text style={[type.caption, { color: colors.textTertiary }]}>
            {usuario.cidade.nome}, {usuario.cidade.uf} · perfil {usuario.perfil === 'ambos' ? 'Piloto e Organizador' : usuario.perfil === 'org' ? 'Organizador' : 'Piloto'}
          </Text>
        </View>
      </View>

      <Button label="Sair" variant="secondary" icon={<SignOut size={18} color={colors.text} />} onPress={exit} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: space.gutter, justifyContent: 'space-between' },
  body: { gap: 20 },
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
  card: { gap: 8, padding: 16, borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceElevated },
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
});
