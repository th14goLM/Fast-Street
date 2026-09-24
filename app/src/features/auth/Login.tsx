import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@/ui/Icon';
import { Button } from '@/ui/controls';
import { Field, Input } from '@/ui/form';
import { Overline, Title } from '@/ui/display';
import { BackButton, Screen, TopBar } from '@/layout/Screen';
import { checkLogin, type LoginOutcome } from '@/domain/validation';
import { useDemoFill } from '@/lib/demoFill';
import { toast } from '@/lib/toast';
import { useApp } from '@/store/app';
import s from './auth.module.css';

/** UC-10 · Login, with the generic error and the unverified-account state. */
export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const signIn = useApp((st) => st.signIn);
  const [email, setEmail] = useState((location.state as { email?: string } | null)?.email ?? '');
  const [pwd, setPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [outcome, setOutcome] = useState<LoginOutcome | null>(null);
  const [resent, setResent] = useState(false);
  const [busy, setBusy] = useState(false);

  useDemoFill(() => {
    setEmail('lucas.andrade@gmail.com');
    setPwd('Pista2026!');
    setOutcome(null);
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      const r = checkLogin(email, pwd);
      if (r === 'ok') {
        signIn();
        navigate('/feed', { replace: true });
        return;
      }
      setResent(false);
      setOutcome(r);
    }, 500);
  };

  const social = () => {
    signIn();
    navigate('/feed', { replace: true });
  };

  return (
    <Screen
      header={
        <TopBar>
          <BackButton to="/onboarding" />
        </TopBar>
      }
    >
      <form className={s.form} style={{ gap: 20 }} onSubmit={submit} noValidate>
        <div className={s.heading}>
          <Overline>UC-10</Overline>
          <Title as="h1" size={44}>
            Entrar
          </Title>
        </div>

        {outcome === 'error' && (
          <div role="alert" className="fs-banner fs-banner--error">
            <Icon name="warning-circle" />
            E-mail ou senha incorretos
          </div>
        )}
        {outcome === 'unverified' && (
          <div role="alert" className="fs-banner fs-banner--warning" style={{ gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Icon name="envelope-simple-open" size={20} color="var(--fs-warning-text)" />
              <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--fs-text)' }}>Confirme seu e-mail</span>
            </div>
            <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--fs-text-body)' }}>
              Sua conta ainda não foi verificada. Abra o link que enviamos para {email || 'seu e-mail'} (confira também o spam).
            </span>
            {resent ? (
              <span style={{ fontSize: 13, color: 'var(--fs-success-text)', display: 'flex', gap: 6, alignItems: 'center' }}>
                <Icon name="check" weight="bold" />
                E-mail reenviado. Você pode reenviar de novo em 60 s.
              </span>
            ) : (
              <Button variant="warning" style={{ alignSelf: 'flex-start' }} onClick={() => setResent(true)}>
                Reenviar e-mail de verificação
              </Button>
            )}
          </div>
        )}

        <Field label="E-mail">
          {(id) => <Input id={id} type="email" autoComplete="email" placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="Senha">
          {(id) => (
            <Input
              id={id}
              type={showPwd ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Sua senha"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              trailing={
                <button type="button" className={s.eye} aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPwd((v) => !v)}>
                  <Icon name={showPwd ? 'eye-slash' : 'eye'} />
                </button>
              }
            />
          )}
        </Field>
        <a
          href="#"
          style={{ alignSelf: 'flex-start', fontSize: 14, marginTop: -8, padding: '6px 0' }}
          onClick={(e) => {
            e.preventDefault();
            toast('Enviamos um link de redefinição para o seu e-mail.', { tone: 'info' });
          }}
        >
          Esqueci minha senha
        </a>
        <Button type="submit" size="lg" loading={busy}>
          Entrar
        </Button>
        <div className={s.divider}>ou</div>
        <Button variant="secondary" size="md" icon="google-logo" iconSize={20} onClick={social}>
          Entrar com Google
        </Button>
        <Button variant="secondary" size="md" icon="apple-logo" iconWeight="fill" iconSize={20} onClick={social}>
          Entrar com Apple
        </Button>
      </form>
      <div className={s.bottomLink}>
        Não tem conta? <Link to="/cadastro">Criar conta</Link>
      </div>
    </Screen>
  );
}
