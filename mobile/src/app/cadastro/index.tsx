import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type ScrollViewInstance, type TextInputInstance } from 'react-native';
import { router, usePreventRemove } from 'expo-router';
import { ClipboardText, Info, SealCheck, SteeringWheel, UsersThree } from 'phosphor-react-native';
import { AuthScreen } from '../../components/AuthScreen';
import {
  BackButton,
  Button,
  Checkbox,
  ConfirmDialog,
  ErrorAlert,
  PasswordField,
  PasswordStrength,
  RadioCard,
  ScreenTitle,
  SelectField,
  StepProgress,
  TextField,
  TextLink,
  type Option,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../features/auth/api';
import {
  errorSummary,
  formatDocumento,
  formatPhone,
  isSignupDirty,
  mapServerFields,
  onlyDigits,
  validateField,
  validateSignup,
  type Perfil,
  type SignupErrors,
  type SignupField,
  type SignupForm,
} from '../../features/auth/validation';
import { ApiError } from '../../lib/http';
import { colors, radius, type } from '../../theme';

const INITIAL: SignupForm = {
  email: '',
  senha: '',
  perfil: 'piloto',
  nomeCompleto: '',
  cidadeId: null,
  orgNome: '',
  orgDocumento: '',
  orgTelefone: '',
  termosAceitos: false,
};

const PERFIS: { id: Perfil; label: string; sub: string; Icon: typeof SteeringWheel }[] = [
  { id: 'piloto', label: 'Piloto', sub: 'Garagem, inscrições e ranking', Icon: SteeringWheel },
  { id: 'org', label: 'Organizador', sub: 'Criar eventos e publicar resultados', Icon: ClipboardText },
  { id: 'ambos', label: 'Piloto e Organizador', sub: 'Os dois papéis na mesma conta', Icon: UsersThree },
];

/** UC-00 · Cadastro (passo 1 de 4). */
export default function Cadastro() {
  const { signUp } = useAuth();
  const [form, setForm] = useState<SignupForm>(INITIAL);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [emailTaken, setEmailTaken] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [leaving, setLeaving] = useState<null | (() => void)>(null);
  const [cidades, setCidades] = useState<Option<number>[]>([]);
  const [cidadesState, setCidadesState] = useState<'loading' | 'ok' | 'error'>('loading');
  const scroll = useRef<ScrollViewInstance>(null);
  const senhaRef = useRef<TextInputInstance>(null);
  const nomeRef = useRef<TextInputInstance>(null);
  const docRef = useRef<TextInputInstance>(null);

  // Saída intencional (conta criada, "Entrar com este e-mail"): a navegação só roda depois que a
  // proteção abaixo for desligada num render já aplicado; navegar no mesmo tick ainda seria bloqueado.
  const [exit, setExit] = useState<null | (() => void)>(null);
  // Pede confirmação antes de descartar um cadastro já começado (botão voltar, gesto ou back do Android).
  usePreventRemove(isSignupDirty(form) && !loading && !exit, ({ repeat }) => setLeaving(() => repeat));
  useEffect(() => {
    exit?.();
  }, [exit]);
  const leaveTo = (go: () => void) => setExit(() => go);

  const fetchCidades = () =>
    authApi
      .cidades()
      .then(({ cidades: list }) => {
        setCidades(list.map((c) => ({ value: c.id, label: `${c.nome}, ${c.uf}` })));
        setCidadesState('ok');
      })
      .catch(() => setCidadesState('error'));
  useEffect(() => {
    void fetchCidades();
  }, []);
  const retryCidades = () => {
    setCidadesState('loading');
    void fetchCidades();
  };

  function set<K extends SignupField>(key: K, value: SignupForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
    if (key === 'email') setEmailTaken(false);
  }

  /** Valida ao sair do campo, mas só se algo foi digitado (não acusa campo vazio antes do envio). */
  const blur = (key: SignupField) => () => {
    const value = form[key];
    if (typeof value === 'string' && !value.trim()) return;
    const message = validateField(key, form);
    if (message) setErrors((e) => ({ ...e, [key]: message }));
  };

  function fail(errs: SignupErrors, message?: string) {
    setErrors(errs);
    setSummary(message ?? errorSummary(Object.values(errs).filter(Boolean).length));
    scroll.current?.scrollTo({ y: 0, animated: true });
  }

  async function submit() {
    const errs = validateSignup(form);
    setEmailTaken(false);
    if (Object.keys(errs).length) return fail(errs);

    setLoading(true);
    setSummary(null);
    try {
      const usuario = await signUp({
        email: form.email.trim(),
        senha: form.senha,
        perfil: form.perfil,
        nomeCompleto: form.nomeCompleto.trim(),
        cidadeId: form.cidadeId!,
        termosAceitos: true,
        ...(form.perfil !== 'piloto'
          ? { organizacao: { nome: form.orgNome.trim(), documento: onlyDigits(form.orgDocumento), telefone: onlyDigits(form.orgTelefone) } }
          : {}),
      });
      leaveTo(() => {
        if (router.canDismiss()) router.dismissAll();
        router.replace({ pathname: '/cadastro/perfil', params: { perfil: usuario.perfil } });
      });
      return; // continua "carregando" até a troca de tela
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_TAKEN') {
        setEmailTaken(true);
        fail({}, 'Este e-mail já tem uma conta.');
      } else if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') {
        fail(mapServerFields(err.fields), err.message);
      } else {
        fail({}, err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.');
      }
    }
    setLoading(false);
  }

  const isOrg = form.perfil !== 'piloto';

  return (
    <AuthScreen
      scrollRef={scroll}
      gap={18}
      stickyFooter
      header={
        <View style={styles.header}>
          <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/onboarding'))} />
          <StepProgress current={1} />
        </View>
      }
      footer={<Button label="Criar conta" onPress={submit} loading={loading} />}
    >
      <ScreenTitle kicker="Passo 1 de 4" title="Criar conta" size="M" />

      {summary && <ErrorAlert compact message={summary} />}

      <TextField
        label="E-mail"
        value={form.email}
        onChangeText={(v) => set('email', v)}
        onBlur={blur('email')}
        placeholder="voce@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => senhaRef.current?.focus()}
        error={errors.email}
        invalid={emailTaken}
        helper={
          emailTaken ? (
            <View style={styles.inline}>
              <Text style={[type.caption, { color: colors.dangerText }]}>E-mail já cadastrado. </Text>
              <TextLink
                label="Entrar com este e-mail"
                style={type.caption}
                onPress={() => leaveTo(() => router.replace({ pathname: '/login', params: { email: form.email.trim() } }))}
              />
            </View>
          ) : null
        }
      />

      <View style={{ gap: 6 }}>
        <PasswordField
          ref={senhaRef}
          label="Senha"
          value={form.senha}
          onChangeText={(v) => set('senha', v)}
          onBlur={blur('senha')}
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => nomeRef.current?.focus()}
          invalid={!!errors.senha}
        />
        <PasswordStrength password={form.senha} error={errors.senha} />
      </View>

      <View style={{ gap: 8 }} accessibilityRole="radiogroup">
        <Text style={[type.label, { color: colors.textMuted }]}>Como você vai usar o Fast Street?</Text>
        {PERFIS.map(({ id, label, sub, Icon }) => (
          <RadioCard
            key={id}
            label={label}
            description={sub}
            selected={form.perfil === id}
            onPress={() => set('perfil', id)}
            icon={(c) => <Icon size={22} color={c} />}
          />
        ))}
      </View>

      <TextField
        ref={nomeRef}
        label="Nome completo"
        value={form.nomeCompleto}
        onChangeText={(v) => set('nomeCompleto', v)}
        placeholder="Como aparece no ranking"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="done"
        error={errors.nomeCompleto}
      />

      <SelectField
        label="Cidade"
        value={form.cidadeId}
        options={cidades}
        loading={cidadesState === 'loading'}
        onOpen={() => cidadesState === 'error' && retryCidades()}
        onChange={(v) => set('cidadeId', v)}
        error={errors.cidadeId ?? (cidadesState === 'error' ? 'Não foi possível carregar as cidades. Toque para tentar de novo.' : undefined)}
      />

      {isOrg && (
        <View style={styles.orgBox}>
          <View style={styles.orgTitle}>
            <SealCheck size={18} weight="fill" color={colors.gulf} />
            <Text style={[type.label, { color: colors.gulf }]}>Dados para verificação do organizador</Text>
          </View>
          <TextField
            label="Nome da organização"
            value={form.orgNome}
            onChangeText={(v) => set('orgNome', v)}
            placeholder="Ex.: Oeste Track Club"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => docRef.current?.focus()}
            error={errors.orgNome}
          />
          <TextField
            ref={docRef}
            label="CPF ou CNPJ"
            value={formatDocumento(form.orgDocumento)}
            onChangeText={(v) => set('orgDocumento', onlyDigits(v).slice(0, 14))}
            onBlur={blur('orgDocumento')}
            placeholder="Somente números"
            keyboardType="number-pad"
            error={errors.orgDocumento}
          />
          <TextField
            label="Telefone"
            value={formatPhone(form.orgTelefone)}
            onChangeText={(v) => set('orgTelefone', onlyDigits(v).slice(0, 11))}
            onBlur={blur('orgTelefone')}
            placeholder="(45) 99999-0000"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            error={errors.orgTelefone}
          />
          <View style={styles.orgNote}>
            <Info size={16} color={colors.textSecondary} />
            <Text style={[type.caption, { color: colors.textSecondary, flex: 1 }]}>
              Você já pode usar o app. O selo “Organizador verificado” aparece depois que a equipe confere os dados.
            </Text>
          </View>
        </View>
      )}

      <View style={{ gap: 6 }}>
        <Checkbox
          checked={form.termosAceitos}
          onChange={(v) => set('termosAceitos', v)}
          invalid={!!errors.termosAceitos}
          accessibilityLabel="Aceitar termos"
        >
          <Text style={[type.body, { color: colors.text }]}>
            Li e aceito os{' '}
            <Text style={styles.link} onPress={() => router.push('/legal/termos')} accessibilityRole="link">
              Termos de Uso
            </Text>{' '}
            e a{' '}
            <Text style={styles.link} onPress={() => router.push('/legal/privacidade')} accessibilityRole="link">
              Política de Privacidade
            </Text>{' '}
            (LGPD).
          </Text>
        </Checkbox>
        {errors.termosAceitos ? (
          <Text style={[type.caption, { color: colors.dangerText, paddingLeft: 34 }]}>{errors.termosAceitos}</Text>
        ) : null}
      </View>

      <ConfirmDialog
        visible={!!leaving}
        title="Descartar cadastro?"
        message="Os dados que você preencheu nesta tela serão perdidos."
        cancelLabel="Continuar"
        confirmLabel="Descartar"
        destructive
        onCancel={() => setLeaving(null)}
        onConfirm={() => {
          const go = leaving;
          setLeaving(null);
          go?.();
        }}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingTop: 4, flexDirection: 'row', alignItems: 'center', gap: 8 },
  inline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  orgBox: {
    gap: 18,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceElevated,
  },
  orgTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orgNote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  link: { color: colors.primaryText },
});
