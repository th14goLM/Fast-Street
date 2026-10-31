import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, CheckCircle, EnvelopeSimpleOpen, Info, SignOut } from 'phosphor-react-native';
import { BrandMark, Button, ScreenTitle, WarningCard } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../features/auth/api';
import { useCooldown } from '../features/auth/useCooldown';
import { colors, radius, space, type } from '../theme';

/** Avisos de chegada vindos do fim do onboarding (mesmos textos do protótipo). */
function avisoDe(aviso: string | undefined): { kind: 'ok' | 'info'; text: string } | null {
  if (!aviso) return null;
  if (aviso === 'org') return { kind: 'ok', text: 'Conta criada · bem-vindo à Central do Organizador' };
  if (aviso === 'sem-veiculo') return { kind: 'info', text: 'Cadastre um veículo na Garagem para se inscrever em eventos.' };
  if (aviso.startsWith('veiculo:')) return { kind: 'ok', text: `Garagem pronta · ${aviso.slice(8)} é seu veículo principal` };
  return null;
}

/**
 * Destino provisório após login e fim do cadastro, no lugar do Feed (UC-03),
 * que é a próxima tela a ser implementada.
 */
export default function Inicio() {
  const { usuario, signOut } = useAuth();
  const { aviso: avisoParam } = useLocalSearchParams<{ aviso?: string }>();
  const aviso = avisoDe(avisoParam);
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
        <ScreenTitle kicker={aviso ? 'Cadastro concluído' : 'Bem-vindo de volta'} title={`Olá, ${firstName}`} />

        {aviso && (
          <View style={styles.toast} accessibilityRole="alert">
            {aviso.kind === 'ok' ? <CheckCircle size={20} weight="fill" color={colors.success} /> : <Info size={20} weight="fill" color={colors.gulf} />}
            <Text style={[type.body, { color: colors.text, flex: 1 }]}>{aviso.text}</Text>
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
            Feed de eventos perto de você, Mapa e Garagem.
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
