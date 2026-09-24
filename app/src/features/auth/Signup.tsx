import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@/ui/Icon';
import { Button, Checkbox } from '@/ui/controls';
import { Field, Input, PasswordMeter, Select } from '@/ui/form';
import { Overline, StepBar, Title, VerifiedSeal } from '@/ui/display';
import { BackButton, Screen, TopBar } from '@/layout/Screen';
import { passwordScore, STRENGTH_LABELS } from '@/domain/password';
import { signupErrorSummary, validateSignup, type SignupErrors, type SignupForm } from '@/domain/validation';
import type { Perfil } from '@/domain/types';
import { useDemoFill } from '@/lib/demoFill';
import { useApp } from '@/store/app';
import s from './auth.module.css';

const EMPTY: SignupForm = { email: '', pwd: '', perfil: 'piloto', nome: '', cidade: '', org: '', doc: '', tel: '', terms: false };
const DEMO: SignupForm = { email: 'lucas.andrade@gmail.com', pwd: 'Pista2026!', perfil: 'piloto', nome: 'Lucas Andrade', cidade: 'Cascavel, PR', org: '', doc: '', tel: '', terms: true };

const PERFIS: { id: Perfil; label: string; sub: string; icon: string }[] = [
  { id: 'piloto', label: 'Piloto', sub: 'Garagem, inscrições e ranking', icon: 'steering-wheel' },
  { id: 'org', label: 'Organizador', sub: 'Criar eventos e publicar resultados', icon: 'clipboard-text' },
  { id: 'ambos', label: 'Piloto e Organizador', sub: 'Os dois papéis na mesma conta', icon: 'users-three' },
];

export const SIGNUP_CITIES = ['Cascavel, PR', 'Curitiba, PR', 'Londrina, PR', 'Maringá, PR'];

/** UC-00 · Cadastro (passo 1 de 4). Organizer fields appear for the organizer profiles. */
export function Signup() {
  const navigate = useNavigate();
  const signIn = useApp((st) => st.signIn);
  const [f, setF] = useState<SignupForm>(EMPTY);
  const [err, setErr] = useState<SignupErrors>({});
  const [busy, setBusy] = useState(false);
  const body = useRef<HTMLDivElement>(null);

  useDemoFill(() => {
    setF(DEMO);
    setErr({});
  });

  const set = <K extends keyof SignupForm>(k: K, v: SignupForm[K]) => {
    setF((cur) => ({ ...cur, [k]: v }));
    if (err[k]) setErr((e) => ({ ...e, [k]: undefined }));
  };

  const score = passwordScore(f.pwd);
  const errCount = Object.values(err).filter(Boolean).length;
  const isOrg = f.perfil !== 'piloto';
  const fieldErr = (k: keyof SignupForm) => (err[k] && err[k] !== 'exists' ? err[k] : undefined);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const errors = validateSignup(f);
    if (Object.keys(errors).length) {
      setErr(errors);
      body.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setBusy(true);
    setTimeout(() => {
      signIn({ name: f.nome.trim(), email: f.email.trim(), city: f.cidade, perfil: f.perfil, bio: '', instagram: '', youtube: '', orgName: isOrg ? f.org.trim() : undefined }, { withDemoData: false });
      navigate('/cadastro/perfil');
    }, 500);
  };

  const pwdHint = f.pwd.length
    ? `Força ${STRENGTH_LABELS[score]}${score < 3 ? ' · combine maiúsculas, números e símbolos' : ''}`
    : err.pwd || 'Mínimo 8 caracteres';

  return (
    <Screen
      ref={body}
      header={
        <TopBar>
          <BackButton to="/onboarding" />
          <StepBar total={4} current={0} style={{ flex: 1, paddingRight: 16 }} />
        </TopBar>
      }
      footer={
        <Button size="lg" block loading={busy} onClick={() => submit()}>
          Criar conta
        </Button>
      }
    >
      <form className={s.form} style={{ paddingTop: 12 }} onSubmit={submit} noValidate>
        <div className={s.heading}>
          <Overline>UC-00 · Passo 1 de 4</Overline>
          <Title as="h1" size={40}>
            Criar conta
          </Title>
        </div>
        {errCount > 0 && (
          <div role="alert" className="fs-banner fs-banner--error" style={{ fontSize: 13, padding: '10px 14px' }}>
            <Icon name="warning-circle" size={18} />
            {signupErrorSummary(err)}
          </div>
        )}
        <Field
          label="E-mail"
          error={
            err.email === 'exists' ? (
              <>
                E-mail já cadastrado.{' '}
                <Link to="/entrar" state={{ email: f.email }}>
                  Entrar com este e-mail
                </Link>
              </>
            ) : (
              err.email
            )
          }
        >
          {(id, d) => <Input id={id} aria-describedby={d} type="email" autoComplete="email" placeholder="voce@email.com" value={f.email} invalid={!!err.email} onChange={(e) => set('email', e.target.value)} />}
        </Field>
        <Field label="Senha">
          {(id) => (
            <>
              <Input id={id} type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={f.pwd} invalid={!!err.pwd} onChange={(e) => set('pwd', e.target.value)} />
              <PasswordMeter score={score} />
              <span style={{ fontSize: 12, color: err.pwd ? 'var(--fs-danger-text)' : 'var(--fs-text-secondary)' }} aria-live="polite">
                {pwdHint}
              </span>
            </>
          )}
        </Field>
        <div className="fs-field">
          <span className="fs-field__label">Como você vai usar o Fast Street?</span>
          <div role="radiogroup" aria-label="Perfil" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PERFIS.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={f.perfil === p.id} className={`fs-option ${s.perfil}`} onClick={() => set('perfil', p.id)}>
                <span className={s.perfilIcon}>
                  <Icon name={p.icon} />
                </span>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{p.label}</span>
                  <span className="fs-caption">{p.sub}</span>
                </span>
                <span className={`fs-radio-dot${f.perfil === p.id ? ' fs-radio-dot--on' : ''}`} />
              </button>
            ))}
          </div>
        </div>
        <Field label="Nome completo" error={fieldErr('nome')}>
          {(id, d) => <Input id={id} aria-describedby={d} autoComplete="name" placeholder="Como aparece no ranking" value={f.nome} invalid={!!err.nome} onChange={(e) => set('nome', e.target.value)} />}
        </Field>
        <Field label="Cidade" error={fieldErr('cidade')}>
          {(id, d) => <Select id={id} aria-describedby={d} value={f.cidade} invalid={!!err.cidade} onChange={(e) => set('cidade', e.target.value)} options={SIGNUP_CITIES} />}
        </Field>
        {isOrg && (
          <div className={s.orgBox}>
            <VerifiedSeal size={17}>Dados para verificação do organizador</VerifiedSeal>
            <Field label="Nome da organização" error={fieldErr('org')}>
              {(id, d) => <Input id={id} aria-describedby={d} placeholder="Ex.: Oeste Track Club" value={f.org} invalid={!!err.org} onChange={(e) => set('org', e.target.value)} />}
            </Field>
            <Field label="CPF ou CNPJ" error={fieldErr('doc')}>
              {(id, d) => <Input id={id} aria-describedby={d} inputMode="numeric" placeholder="Somente números" value={f.doc} invalid={!!err.doc} onChange={(e) => set('doc', e.target.value)} />}
            </Field>
            <Field label="Telefone" error={fieldErr('tel')}>
              {(id, d) => <Input id={id} aria-describedby={d} inputMode="tel" autoComplete="tel" placeholder="(45) 99999-0000" value={f.tel} invalid={!!err.tel} onChange={(e) => set('tel', e.target.value)} />}
            </Field>
          </div>
        )}
        <Checkbox checked={f.terms} onChange={(v) => set('terms', v)} label="Aceitar termos" error={err.terms}>
          Li e aceito os <a href="#termos">Termos de Uso</a> e a <a href="#privacidade">Política de Privacidade</a> (LGPD).
        </Checkbox>
      </form>
    </Screen>
  );
}
