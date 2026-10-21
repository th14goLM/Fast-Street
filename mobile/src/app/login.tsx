import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View, type TextInputInstance } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppleLogo, Check, EnvelopeSimpleOpen, GoogleLogo } from 'phosphor-react-native';
import { AuthScreen } from '../components/AuthScreen';
import { BackButton, Button, ErrorAlert, OrDivider, PasswordField, ScreenTitle, TextField, TextLink, WarningCard } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../features/auth/api';
import { useCooldown } from '../features/auth/useCooldown';
import { isValidEmail } from '../features/auth/validation';
import { ApiError } from '../lib/http';
import { colors, type } from '../theme';

type Banner = { kind: 'error'; message: string } | { kind: 'unverified'; email: string } | null;

/** UC-10 · Login. */
export default function Login() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { signIn } = useAuth();
  const [email, setEmail] = useState(params.email ?? '');
  const [senha, setSenha] = useState('');
  const [fieldErr, setFieldErr] = useState<{ email?: string; senha?: string }>({});
  const [banner, setBanner] = useState<Banner>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const cooldown = useCooldown();
  const senhaRef = useRef<TextInputInstance>(null);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/onboarding'));

  async function submit() {
    const errs: typeof fieldErr = {};
    if (!isValidEmail(email)) errs.email = 'Informe um e-mail válido.';
    if (!senha) errs.senha = 'Informe sua senha.';
    setFieldErr(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    setBanner(null);
    try {
      await signIn(email.trim(), senha);
      if (router.canDismiss()) router.dismissAll();
      router.replace('/inicio');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        setBanner({ kind: 'unverified', email: String(err.details.email ?? email.trim().toLowerCase()) });
      } else if (err instanceof ApiError && err.code === 'INVALID_CREDENTIALS') {
        setBanner({ kind: 'error', message: 'E-mail ou senha incorretos' });
      } else {
        setBanner({ kind: 'error', message: err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.' });
      }
    } finally {
      setLoading(false);
    }
  }

  async function resend(target: string) {
    setResending(true);
    try {
      const { retryAfterSeconds } = await authApi.resendVerification(target);
      cooldown.start(retryAfterSeconds);
    } catch (err) {
      Alert.alert('Não foi possível reenviar', err instanceof Error ? err.message : 'Tente novamente.');
    } finally {
      setResending(false);
    }
  }

  const soon = (what: string) => Alert.alert(what, 'Disponível em uma próxima etapa do desenvolvimento.');

  return (
    <AuthScreen
      header={
        <View style={styles.header}>
          <BackButton onPress={goBack} />
        </View>
      }
      footer={
        <View style={styles.footerRow}>
          <Text style={[type.body, { color: colors.textSecondary }]}>Não tem conta? </Text>
          <TextLink label="Criar conta" onPress={() => router.replace('/cadastro')} />
        </View>
      }
    >
      <ScreenTitle kicker="Fast Street" title="Entrar" />

      {banner?.kind === 'error' && <ErrorAlert message={banner.message} />}
      {banner?.kind === 'unverified' && (
        <WarningCard icon={<EnvelopeSimpleOpen size={20} color={colors.warningText} />} title="Confirme seu e-mail">
          <Text style={[type.label, { color: colors.textMuted, lineHeight: 20 }]}>
            Sua conta ainda não foi verificada. Abra o link que enviamos para {banner.email} (confira também o spam).
          </Text>
          {cooldown.left > 0 ? (
            <View style={styles.resent}>
              <Check size={14} weight="bold" color={colors.successText} />
              <Text style={[type.label, { color: colors.successText, flex: 1 }]}>
                E-mail reenviado. Você pode reenviar de novo em {cooldown.left} s.
              </Text>
            </View>
          ) : (
            <Button label="Reenviar e-mail de verificação" variant="warning" compact loading={resending} onPress={() => resend(banner.email)} />
          )}
        </WarningCard>
      )}

      <TextField
        label="E-mail"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (fieldErr.email) setFieldErr((e) => ({ ...e, email: undefined }));
        }}
        error={fieldErr.email}
        placeholder="voce@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => senhaRef.current?.focus()}
        submitBehavior="submit"
      />
      <PasswordField
        ref={senhaRef}
        label="Senha"
        value={senha}
        onChangeText={(v) => {
          setSenha(v);
          if (fieldErr.senha) setFieldErr((e) => ({ ...e, senha: undefined }));
        }}
        error={fieldErr.senha}
        placeholder="Sua senha"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <View style={styles.forgot}>
        <TextLink label="Esqueci minha senha" onPress={() => soon('Recuperar senha (UC-11)')} />
      </View>

      <Button label="Entrar" onPress={submit} loading={loading} />
      <OrDivider />
      <Button label="Entrar com Google" variant="secondary" icon={<GoogleLogo size={20} color={colors.text} />} onPress={() => soon('Entrar com Google')} />
      <Button label="Entrar com Apple" variant="secondary" icon={<AppleLogo size={20} weight="fill" color={colors.text} />} onPress={() => soon('Entrar com Apple')} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingVertical: 4, flexDirection: 'row' },
  forgot: { alignSelf: 'flex-start', marginTop: -8, paddingVertical: 6 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  resent: { flexDirection: 'row', gap: 6, alignItems: 'center' },
});
