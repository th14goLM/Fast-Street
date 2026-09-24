import { useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { Icon } from '@/ui/Icon';
import { Button, IconButton, RadioDot, Segmented } from '@/ui/controls';
import { Avatar, EventStatusBadge, LocalBadge, Overline, PosBadge, Progress, SectionHeader, Title, VerifiedSeal, VisibilityBadge } from '@/ui/display';
import { OfflineBanner, Skeleton } from '@/ui/feedback';
import { ImageSlot } from '@/ui/ImageSlot';
import { BottomSheet, RouteSheet } from '@/ui/overlays';
import { Textarea } from '@/ui/form';
import { BackButton } from '@/layout/Screen';
import { EVENTS } from '@/data/events';
import { EVENT_TYPES, LOCAL_ICON } from '@/domain/catalog';
import { vacanciesByCategory } from '@/domain/events';
import { km } from '@/domain/format';
import type { Category, EventItem } from '@/domain/types';
import { useLoad } from '@/lib/network';
import { toast } from '@/lib/toast';
import { useApp } from '@/store/app';
import { useEventCta } from './useEventCta';
import s from './detail.module.css';

const REPORT_REASONS = ['Local não é autorizado', 'Atividade fora do local informado', 'Informações falsas ou enganosas', 'Conteúdo impróprio', 'Outro motivo'];
const AVATARS = ['Rafael Kowalski', 'Ana Moraes', 'Thiago Nishimura', 'Camila Rocha', 'Diego Farias'];

export function EventDetail() {
  const { id } = useParams();
  const event = EVENTS.find((e) => e.id === id);
  if (!event) return <Navigate to="/feed" replace />;
  return <EventDetailView key={event.id} event={event} />;
}

type SheetKind = 'report' | 'cancel' | 'results' | 'org' | null;

function EventDetailView({ event }: { event: EventItem }) {
  const { pathname } = useLocation();
  const load = useLoad(`event:${event.id}`);
  const cta = useEventCta(event, pathname);
  const vehicles = useApp((st) => st.vehicles);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [route, setRoute] = useState(false);
  const [reason, setReason] = useState<number | null>(null);

  const closed = cta.state === 'closed';
  const full = cta.state === 'full';
  const vehicle = vehicles.find((v) => v.id === cta.reg?.vehicleId);
  const vagas = vacanciesByCategory(event);

  const note: Partial<Record<typeof cta.state, [string, string, string]>> = {
    pending: [`Aguardando aprovação do ${event.org}`, 'var(--fs-warning-text)', 'info'],
    confirmed: [`Confirmada · ${vehicle?.name ?? 'seu veículo'} · ${vehicle?.cat ?? ''}`, 'var(--fs-success-text)', 'check'],
    full: ['Todas as categorias estão completas', 'var(--fs-text-secondary)', 'info'],
    closed: [`Evento encerrado em ${event.closedOn ?? event.day}`, 'var(--fs-text-secondary)', 'flag-checkered'],
  };
  const n = note[cta.state];

  const share = async () => {
    const url = location.href;
    try {
      if (navigator.share) await navigator.share({ title: event.name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('Link do evento copiado.', { tone: 'info' });
      }
    } catch {
      /* share cancelled */
    }
  };

  if (load.status === 'loading') {
    return (
      <div className={s.screen} aria-busy="true" aria-label="Carregando evento">
        <Skeleton h={300} r={0} />
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Skeleton w="30%" h={12} r={4} />
          <Skeleton w="85%" h={30} />
          <Skeleton w="60%" h={14} r={4} />
          <Skeleton h={64} r={14} style={{ marginTop: 8 }} />
          <Skeleton h={120} r={14} />
        </div>
      </div>
    );
  }

  if (load.status === 'error') {
    return (
      <div className={s.screen} style={{ padding: 'calc(64px + env(safe-area-inset-top)) 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ position: 'absolute', top: 'calc(8px + env(safe-area-inset-top))', left: 12 }}>
          <BackButton />
        </div>
        <Icon name="cloud-warning" size={40} color="var(--fs-danger-text)" />
        <Title as="h1" size={34} lh={1}>
          Não foi possível carregar o evento
        </Title>
        <p style={{ fontSize: 14, lineHeight: 1.5 }} className="fs-muted">
          Verifique sua conexão e tente de novo.
        </p>
        <Button variant="secondary" size="md" icon="arrow-clockwise" style={{ alignSelf: 'flex-start' }} onClick={load.retry}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className={s.screen}>
      <div className={s.scroll}>
        <div className={s.hero}>
          <ImageSlot id={`ev-${event.id}`} placeholder="Hero: autódromo, grid de largada ou pit lane" />
          <div className={s.heroShade} />
          <div className={s.heroBar}>
            <BackButton variant="glass" />
            <IconButton icon="share-network" label="Compartilhar" variant="glass" size={20} onClick={share} />
          </div>
        </div>
        <div className={s.content}>
          {load.offline && <OfflineBanner solid updated="há 7 min" />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Overline>{EVENT_TYPES[event.type].label}</Overline>
              <EventStatusBadge status={event.status} small />
              <VisibilityBadge pub={event.pub} small />
            </div>
            <Title as="h1" size={40}>
              {event.name}
            </Title>
          </div>

          <button type="button" className={s.org} onClick={() => setSheet('org')}>
            <Avatar name={event.org} size={40} />
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{event.org}</span>
              <VerifiedSeal />
            </span>
            <Icon name="caret-right" color="var(--fs-text-secondary)" />
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className={s.info}>
              <Icon name="calendar-blank" size={20} color="var(--fs-text-secondary)" />
              <span>
                <span className={s.infoMain}>{event.dateLong}</span>
                <span className={s.infoSub}>{event.timeLabel}</span>
              </span>
            </div>
            <div className={s.info}>
              <Icon name={LOCAL_ICON[event.localType]} size={20} color="var(--fs-secondary)" />
              <span style={{ gap: 4 }}>
                <span className={s.infoMain}>{event.local}</span>
                <span className={s.infoSub}>
                  {event.city} · {km(event.dist)} de você
                </span>
                <span style={{ alignSelf: 'flex-start', marginTop: 2 }}>
                  <LocalBadge type={event.localType} prefix="Local autorizado" />
                </span>
              </span>
            </div>
            <Button variant="ghost" icon="navigation-arrow" iconSize={18} style={{ alignSelf: 'flex-start', marginLeft: 24, paddingLeft: 8 }} onClick={() => setRoute(true)}>
              Abrir no Maps/Waze
            </Button>
          </div>

          <hr className="fs-rule" />

          <section className={s.section}>
            <SectionHeader title="Sobre" size={22} />
            <p className="fs-body" style={{ fontSize: 14, lineHeight: 1.6 }}>
              {event.about}
            </p>
          </section>

          <section className={s.section} style={{ gap: 10 }}>
            <SectionHeader title="Regras" size={22} />
            <ul className={s.rules}>
              {(rulesOpen ? event.rules : event.rules.slice(0, 2)).map((r) => (
                <li key={r}>
                  <Icon name="check" color="var(--fs-primary-text)" style={{ marginTop: 3 }} />
                  {r}
                </li>
              ))}
            </ul>
            {event.rules.length > 2 && (
              <button type="button" className={s.more} onClick={() => setRulesOpen((v) => !v)} aria-expanded={rulesOpen}>
                {rulesOpen ? 'Mostrar menos' : 'Ver todas as regras'}
              </button>
            )}
          </section>

          <section className={s.section} style={{ gap: 12 }}>
            <SectionHeader
              title="Vagas por categoria"
              size={22}
              action={
                <span style={{ fontSize: 13 }} className="fs-muted">
                  {closed ? `${event.enrolled} pilotos participaram` : full ? 'Esgotado' : `${cta.left} de ${event.total} livres`}
                </span>
              }
            />
            {vagas.map(([cat, left, total]) => {
              const l = full ? 0 : left;
              return (
                <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span>{cat}</span>
                    <span style={{ color: l || closed ? 'var(--fs-text-secondary)' : 'var(--fs-danger-text)' }}>{closed ? `${total} pilotos` : l ? `${l} de ${total} livres` : 'Esgotada'}</span>
                  </div>
                  <Progress pct={closed ? 100 : ((total - l) / total) * 100} color={closed ? 'var(--fs-line)' : l ? 'var(--fs-primary)' : 'var(--fs-danger)'} />
                </div>
              );
            })}
          </section>

          <section className={s.section} style={{ gap: 10 }}>
            <SectionHeader title="Inscritos" size={22} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', paddingLeft: 8 }}>
                {AVATARS.map((a, i) => (
                  <Avatar key={a} name={a} style={{ marginLeft: -8, border: '2px solid var(--fs-bg)', background: ['#45586C', '#424048', '#2C3D4B'][i % 3], fontSize: 11 }} />
                ))}
              </div>
              <span className="fs-body" style={{ fontSize: 13 }}>
                {closed ? `${event.enrolled} pilotos participaram` : `${full ? event.total : event.enrolled + (cta.reg ? 1 : 0)} pilotos inscritos`}
              </span>
            </div>
          </section>

          <Button variant="danger-soft" icon="flag" style={{ alignSelf: 'flex-start', padding: '0 14px', marginTop: 4 }} onClick={() => (setReason(null), setSheet('report'))}>
            Denunciar evento
          </Button>
        </div>
      </div>

      <div className={s.ctaBar}>
        {n && (
          <span className={s.ctaNote} style={{ color: n[1] }}>
            <Icon name={n[2]} weight={n[2] === 'check' ? 'bold' : 'regular'} />
            {n[0]}
          </span>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          {(cta.state === 'pending' || cta.state === 'confirmed') && (
            <Button variant="secondary" size="lg" style={{ padding: '0 16px', fontSize: 14 }} onClick={() => setSheet('cancel')}>
              Cancelar inscrição
            </Button>
          )}
          <Button
            variant={cta.view.variant}
            size="lg"
            icon={cta.view.icon}
            iconWeight={cta.view.iconWeight}
            iconSize={18}
            disabled={cta.view.disabled}
            style={{ flex: 1 }}
            onClick={() => (closed ? setSheet('results') : cta.start())}
          >
            {cta.view.label}
          </Button>
        </div>
      </div>

      <BottomSheet open={sheet === 'report'} onClose={() => setSheet(null)} label="Denunciar evento">
        <Title as="h3" size={26} lh={1}>
          Denunciar evento
        </Title>
        <p style={{ fontSize: 13, lineHeight: 1.5 }} className="fs-muted">
          A denúncia é anônima para o organizador. Nossa equipe analisa em até 24 h.
        </p>
        <div role="radiogroup" aria-label="Motivo" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {REPORT_REASONS.map((r, i) => (
            <button key={r} type="button" role="radio" aria-checked={reason === i} className="fs-option fs-option--danger" style={{ minHeight: 48, padding: '0 12px', fontSize: 14, borderColor: reason === i ? undefined : 'var(--fs-line)' }} onClick={() => setReason(i)}>
              <RadioDot on={reason === i} tone="danger" />
              {r}
            </button>
          ))}
        </div>
        <Textarea small placeholder="Detalhes (opcional)" aria-label="Detalhes" style={{ background: 'var(--fs-bg)' }} />
        <Button
          variant="danger"
          size="lg"
          disabled={reason === null}
          onClick={() => {
            setSheet(null);
            toast('Denúncia enviada. Nossa equipe analisa em até 24 h.');
          }}
        >
          Enviar denúncia
        </Button>
      </BottomSheet>

      <BottomSheet open={sheet === 'cancel'} onClose={() => setSheet(null)} label="Cancelar inscrição">
        <Title as="h3" size={26} lh={1}>
          Cancelar inscrição?
        </Title>
        <p style={{ fontSize: 14, lineHeight: 1.5 }} className="fs-body">
          Sua vaga volta a ficar disponível e o organizador é avisado. Você pode se inscrever de novo enquanto houver vagas.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="lg" style={{ flex: 1 }} onClick={() => setSheet(null)}>
            Manter
          </Button>
          <Button
            variant="danger"
            size="lg"
            style={{ flex: 1 }}
            onClick={() => {
              useApp.getState().cancelRegistration(event.id);
              setSheet(null);
              toast('Inscrição cancelada. O organizador foi avisado.');
            }}
          >
            Cancelar inscrição
          </Button>
        </div>
      </BottomSheet>

      {event.results && <ResultsSheet open={sheet === 'results'} onClose={() => setSheet(null)} results={event.results} />}

      <BottomSheet open={sheet === 'org'} onClose={() => setSheet(null)} label={event.org}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <Avatar name={event.org} size={56} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Title as="h3" size={26} lh={1}>
              {event.org}
            </Title>
            <VerifiedSeal />
          </div>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.5 }} className="fs-body">
          Organizador com documentação verificada pelo Fast Street. Todos os eventos acontecem em locais autorizados.
        </p>
        <span className="fs-caption">Eventos deste organizador</span>
        {EVENTS.filter((e) => e.org === event.org).map((e) => (
          <Link key={e.id} to={`/eventos/${e.id}`} onClick={() => setSheet(null)} className="fs-row" style={{ boxShadow: 'inset 0 -1px 0 var(--fs-surface-elevated)' }}>
            <span className="fs-row__main">
              <span className="fs-row__title">{e.name}</span>
              <span className="fs-row__sub">{e.dateLabel}</span>
            </span>
            <Icon name="caret-right" />
          </Link>
        ))}
      </BottomSheet>

      <RouteSheet open={route} onClose={() => setRoute(false)} place={event.local} />
    </div>
  );
}

function ResultsSheet({ open, onClose, results }: { open: boolean; onClose: () => void; results: NonNullable<EventItem['results']> }) {
  const cats = Object.keys(results.byCat) as Category[];
  const [cat, setCat] = useState<Category>(results.mine?.cat ?? cats[0]);
  const rows = results.byCat[cat] ?? [];
  return (
    <BottomSheet open={open} onClose={onClose} label="Resultados">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Title as="h3" size={26} lh={1}>
          Resultados
        </Title>
        <span className="fs-caption">Publicado em {results.publishedOn}</span>
      </div>
      {results.mine && (
        <div className={s.mine}>
          <PosBadge pos={results.mine.pos} size={18} podium />
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Seu resultado · {results.mine.cat}</span>
            <span className="fs-body" style={{ fontSize: 12 }}>
              {results.mine.car} · +{results.mine.pts} pts no ranking
            </span>
          </span>
          <Icon name="trophy" weight="fill" size={22} color="var(--fs-secondary)" />
        </div>
      )}
      <Segmented block dark label="Categoria" value={cat} onChange={setCat} options={cats.map((c) => ({ value: c, label: c }))} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((r, i) => (
          <div key={r.name} className={s.resRow} style={{ background: r.me ? 'rgba(176,206,226,.06)' : undefined }}>
            <span className="fs-num" style={{ fontSize: 20, color: i < 3 ? 'var(--fs-secondary)' : 'var(--fs-text-secondary)' }}>
              P{i + 1}
            </span>
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{r.me ? `${r.name} (você)` : r.name}</span>
              <span className="fs-caption">{r.car}</span>
            </span>
            <span className="fs-num" style={{ fontSize: 16 }}>
              {r.pts} PTS
            </span>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}
