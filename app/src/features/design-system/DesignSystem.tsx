import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/ui/Icon';
import { Button, Checkbox, Chip, IconButton, Segmented, Switch } from '@/ui/controls';
import { Field, Input, PasswordMeter, Select } from '@/ui/form';
import { Badge, EventStatusBadge, LocalBadge, MainBadge, Overline, PosBadge, RegistrationBadge, StepBar, Title, Variation, VerifiedSeal, VisibilityBadge } from '@/ui/display';
import { EmptyState, ErrorCard, OfflineBanner } from '@/ui/feedback';
import { EventCard, EventCardSkeleton } from '@/ui/EventCard';
import { EVENTS } from '@/data/events';
import { passwordScore, STRENGTH_LABELS } from '@/domain/password';
import { CATEGORIES } from '@/domain/types';
import s from './ds.module.css';

const PALETTE = [
  ['background', '#1A2730'],
  ['neutral-warm', '#424048'],
  ['line / slate', '#45586C'],
  ['secondary · gulf', '#B0CEE2'],
  ['primary-pressed', '#A63E1B'],
  ['primary · racing orange', '#E95D2C'],
];
const DERIVED = [
  ['surface', '#22323E'],
  ['surface-elevated', '#2C3D4B'],
  ['primary-text', '#F28A62'],
  ['text', '#F5F7FA'],
  ['text-secondary', '#9AA4B2'],
  ['success', '#22C55E'],
  ['warning', '#F59E0B'],
  ['danger', '#EF4444'],
];

function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className={s.section}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <span className="fs-overline" style={{ fontSize: 14, letterSpacing: '.1em' }}>
          {n}
        </span>
        <Title as="h2" size={36} lh={1}>
          {title}
        </Title>
      </div>
      <hr className="fs-rule" style={{ background: 'linear-gradient(to right, transparent, var(--fs-line) 48px, var(--fs-line) calc(100% - 48px), transparent)' }} />
      {children}
    </section>
  );
}

/** Living design system: every sample is the production component. */
export function DesignSystem() {
  const [cats, setCats] = useState<string[]>(['Turbo', 'Aspirado']);
  const [seg, setSeg] = useState<'geral' | 'cat'>('geral');
  const [radius, setRadius] = useState(50);
  const [pwd, setPwd] = useState('');
  const [terms, setTerms] = useState(true);
  const [sw, setSw] = useState(true);
  const score = passwordScore(pwd);

  return (
    <div className={s.page}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 880 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="fs-icon-tile" style={{ width: 40, height: 40, borderRadius: 12, borderColor: 'var(--fs-primary)', color: 'var(--fs-primary-text)', fontSize: 22 }}>
            <Icon name="flag-checkered" />
          </span>
          <span className="fs-display" style={{ fontSize: 20, lineHeight: 1, letterSpacing: '.12em' }}>
            Fast Street
          </span>
          <span className="fs-caption" style={{ padding: '4px 10px', border: '1px solid var(--fs-line)', borderRadius: 8 }}>
            Design System · v0.1
          </span>
          <span style={{ flex: 1 }} />
          <Link to="/feed" style={{ fontSize: 13 }}>
            Voltar ao app
          </Link>
        </div>
        <Title as="h1" size={72}>
          Tokens e componentes
        </Title>
        <p style={{ fontSize: 16, lineHeight: 1.6 }} className="fs-muted">
          Estrutura do Nocturne (bordas que esmaecem, primário em contorno, sombras discretas) com a paleta extraída da foto de referência. Grid de 8pt, raios de 12–16px, alvos de toque ≥ 44px. Todos os exemplos abaixo são os componentes reais do app.
        </p>
      </header>

      <Section n="01" title="Cor">
        <div className={s.swatches}>
          {PALETTE.map(([name, hex]) => (
            <div key={name} className={s.swatch}>
              <div style={{ height: 112, background: hex, borderRadius: 12, boxShadow: '0 0 0 1px var(--fs-line)' }} />
              <b>{name}</b>
              <code>{hex}</code>
            </div>
          ))}
        </div>
        <div className={s.swatches} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
          {DERIVED.map(([name, hex]) => (
            <div key={name} className={s.swatch}>
              <div style={{ height: 64, background: hex, borderRadius: 12 }} />
              <b>{name}</b>
              <code>{hex}</code>
            </div>
          ))}
        </div>
        <p className="fs-muted" style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 760 }}>
          Contraste: #E95D2C sobre o fundo fica em ~4,4:1, então é usado em bordas, ícones e títulos grandes. Texto laranja em tamanho de corpo usa #F28A62 (≥ 5,5:1). O azul Gulf é reservado a pódio, conquistas, selos e o badge "Principal".
        </p>
      </Section>

      <Section n="02" title="Tipografia">
        <div className={s.typeGrid}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              ['display-xl 56/1', 56, 'Track Day Cascavel'],
              ['display-l 40/1', 40, 'Ranking mensal'],
              ['title 28/1.1', 28, 'Perto de você'],
              ['subtitle 20/1.2', 20, 'Arrancada Autorizada'],
            ].map(([k, size, text]) => (
              <div key={k as string} className={s.typeRow}>
                <code>{k}</code>
                <Title as="span" size={size as number} lh={1}>
                  {text}
                </Title>
              </div>
            ))}
            <div className={s.typeRow}>
              <code>overline 12/1</code>
              <Overline>Desafio em pista</Overline>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className={s.typeStack}>
              <code>body-l · Inter 16/1.6</code>
              <span style={{ fontSize: 16, lineHeight: 1.6 }}>Track day no Autódromo Zilmar Beux com baterias por categoria e briefing obrigatório às 7h30.</span>
            </div>
            <div className={s.typeStack}>
              <code>body · Inter 14/1.5</code>
              <span>Sua inscrição foi enviada ao organizador. Você será notificado quando for aprovada.</span>
            </div>
            <div className={s.typeStack}>
              <code>caption · Inter 12/1.4</code>
              <span className="fs-caption">Atualizado há 12 min · 4,2 km</span>
            </div>
            <div className={s.typeStack}>
              <code>numeric · Barlow Condensed 600, tabular</code>
              <span className="fs-num" style={{ fontSize: 32, lineHeight: 1 }}>
                1.240 PTS · P3 ↑2
              </span>
            </div>
          </div>
        </div>
      </Section>

      <Section n="03" title="Botões">
        <div className={s.row}>
          <Button>Inscrever-se</Button>
          <Button loading>Enviando</Button>
          <Button disabled>Inscrever-se</Button>
          <Button variant="secondary">Ver detalhes</Button>
          <Button variant="ghost" icon="navigation-arrow">
            Abrir no Maps/Waze
          </Button>
          <Button variant="danger" icon="flag">
            Denunciar evento
          </Button>
          <Button variant="state-success" icon="check" iconWeight="bold" disabled>
            Inscrito
          </Button>
          <Button variant="state-warning" icon="hourglass-medium" disabled>
            Inscrição pendente
          </Button>
          <Button variant="state-off" icon="prohibit" disabled>
            Vagas esgotadas
          </Button>
        </div>
        <div className={s.row}>
          <IconButton icon="bell" label="Notificações" dot />
          <IconButton icon="sliders-horizontal" label="Filtros" count={3} active />
          <Button size="md" style={{ width: 320 }}>
            Criar conta
          </Button>
        </div>
      </Section>

      <Section n="04" title="Inputs e controles">
        <div className={s.formGrid}>
          <Field label="E-mail · padrão" hint="Usaremos para confirmar sua conta.">
            {(id) => <Input id={id} placeholder="voce@email.com" />}
          </Field>
          <Field label="E-mail · erro" error="E-mail já cadastrado.">
            {(id) => <Input id={id} defaultValue="lucas.andrade@gmail.com" invalid />}
          </Field>
          <Field label="Senha · medidor de força (digite)">
            {(id) => (
              <>
                <Input id={id} type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Mínimo 8 caracteres" />
                <PasswordMeter score={score} />
                <span className="fs-caption">Força: {STRENGTH_LABELS[score] || 'digite uma senha'}</span>
              </>
            )}
          </Field>
          <Field label="Categoria · select">{(id) => <Select id={id} options={CATEGORIES} defaultValue="Turbo" />}</Field>
        </div>
        <div className={s.row} style={{ alignItems: 'flex-start', gap: 48 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 420 }}>
            {CATEGORIES.map((c) => (
              <Chip key={c} on={cats.includes(c)} check onClick={() => setCats((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))}>
                {c}
              </Chip>
            ))}
          </div>
          <Segmented value={seg} onChange={setSeg} options={[{ value: 'geral', label: 'Geral' }, { value: 'cat', label: 'Por categoria' }]} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 14 }}>Novo evento na minha região</span>
            <Switch checked={sw} onChange={setSw} label="Novo evento na minha região" />
          </div>
        </div>
        <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="fs-caption">Slider · raio de busca</span>
            <span className="fs-num" style={{ fontSize: 22, lineHeight: 1 }}>
              {radius} KM
            </span>
          </div>
          <input type="range" min={5} max={200} step={5} value={radius} onChange={(e) => setRadius(+e.target.value)} aria-label="Raio" />
        </div>
        <Checkbox checked={terms} onChange={setTerms} label="Aceitar termos">
          Li e aceito os <a href="#termos">Termos de Uso</a> e a <a href="#privacidade">Política de Privacidade</a> (LGPD).
        </Checkbox>
        <div style={{ maxWidth: 520 }}>
          <StepBar total={4} current={1} />
        </div>
      </Section>

      <Section n="05" title="Badges e selos">
        <div className={s.row}>
          <EventStatusBadge status="aberto" />
          <EventStatusBadge status="andamento" />
          <EventStatusBadge status="encerrado" />
          <EventStatusBadge status="cancelado" />
          <RegistrationBadge status="confirmed" />
          <RegistrationBadge status="pending" />
          <RegistrationBadge status="rejected" />
          <VisibilityBadge pub />
          <VisibilityBadge pub={false} />
        </div>
        <div className={s.row}>
          <LocalBadge type="Autódromo" />
          <LocalBadge type="Pista de Arrancada" />
          <LocalBadge type="Área Privada" />
          <VerifiedSeal />
          <MainBadge md />
          <PosBadge pos={1} />
          <Variation delta={2} />
          <Variation delta={-1} />
          <span className="fs-count">3</span>
          <Badge tone="secondary" icon="trophy" iconWeight="fill">
            Conquista
          </Badge>
        </div>
      </Section>

      <Section n="06" title="Cards">
        <div className={s.row} style={{ alignItems: 'flex-start' }}>
          <EventCard event={EVENTS[0]} left={18} width={358} />
          <EventCard event={EVENTS[1]} left={3} width={358} />
          <EventCardSkeleton width={358} />
        </div>
      </Section>

      <Section n="07" title="Feedback">
        <div className={s.formGrid}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="fs-toast" style={{ position: 'static' }}>
              <Icon name="check-circle" weight="fill" color="var(--fs-success)" />
              <span className="fs-toast__text">Inscrição confirmada</span>
            </div>
            <div className="fs-toast" style={{ position: 'static' }}>
              <Icon name="trophy" weight="fill" color="var(--fs-secondary)" />
              <span className="fs-toast__text">Conquista desbloqueada: Primeiro pódio</span>
            </div>
            <OfflineBanner />
            <ErrorCard title="Não foi possível carregar os eventos" text="Verifique sua conexão e tente de novo." onRetry={() => undefined} />
          </div>
          <EmptyState icon="garage" title="Sua garagem está vazia" text="Cadastre seu primeiro veículo para se inscrever em eventos.">
            <Button icon="plus">Cadastrar veículo</Button>
          </EmptyState>
        </div>
      </Section>
    </div>
  );
}
