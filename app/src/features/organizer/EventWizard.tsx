import { useRef, useState, type PointerEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@/ui/Icon';
import { Button, Chip } from '@/ui/controls';
import { Field, Input, Textarea } from '@/ui/form';
import { Overline, Tag, Title } from '@/ui/display';
import { ImageSlot } from '@/ui/ImageSlot';
import { PLACES, type OrgEvent } from '@/data/organizer';
import { EVENT_TYPES, LOCAL_ICON, LOCAL_TYPES } from '@/domain/catalog';
import { formatEventDate, todayIso } from '@/domain/format';
import { validateEventStep, type EventForm } from '@/domain/validation';
import { CATEGORIES, type EventType } from '@/domain/types';
import { useDemoFill } from '@/lib/demoFill';
import { useOrganizer } from '@/store/organizer';
import { useApp } from '@/store/app';
import s from './organizer.module.css';

export const EMPTY_EVENT_FORM: EventForm = { nome: '', tipo: '', desc: '', regras: '', cats: [], vagas: '', date: '', time: '', addr: '', place: null, pinX: 50, pinY: 50, localType: '', vis: 'pub' };

export const DEMO_EVENT_FORM: EventForm = {
  nome: 'Track Day Zilmar Beux · Etapa 4',
  tipo: 'td',
  desc: 'Quarta etapa do campeonato regional. Baterias de 20 minutos por categoria.',
  regras: 'Capacete homologado, macacão e luvas. Briefing obrigatório às 7h30.',
  cats: ['Turismo', 'Turbo', 'Aspirado'],
  vagas: '40',
  date: '2026-11-14',
  time: '08:00',
  addr: 'Autódromo Zilmar Beux',
  place: 0,
  pinX: 38,
  pinY: 42,
  localType: 'Autódromo',
  vis: 'pub',
};

const STEP_LABELS = ['Informações', 'Categorias e vagas', 'Data e local', 'Visibilidade e revisão'];

/** UC-25 · Criar evento em 4 passos, with per-step validation and a live card preview. */
export function EventWizard() {
  const navigate = useNavigate();
  const draft = (useLocation().state as { draft?: OrgEvent } | null)?.draft;
  const [f, setF] = useState<EventForm>(() => (draft ? { ...EMPTY_EVENT_FORM, nome: draft.name, tipo: draft.type, cats: ['Clássicos'] } : EMPTY_EVENT_FORM));
  const [step, setStep] = useState(1);
  const [tried, setTried] = useState<Record<number, boolean>>({});
  const [sug, setSug] = useState(false);
  const dragging = useRef(false);
  const today = todayIso();

  useDemoFill(() => {
    setF((cur) => ({ ...DEMO_EVENT_FORM, vis: cur.vis }));
    setTried({});
  });

  const E = tried[step] ? validateEventStep(f, step, today) : {};
  const errCount = Object.keys(E).length;
  const set = <K extends keyof EventForm>(k: K, v: EventForm[K]) => setF((cur) => ({ ...cur, [k]: v }));
  const place = f.place !== null ? PLACES[f.place] : null;
  const q = f.addr.toLowerCase();
  const sugs = PLACES.map((p, i) => ({ p, i }))
    .filter(({ p }) => !q || p[0].toLowerCase().includes(q) || q.split(' ').some((w) => w.length > 2 && p[0].toLowerCase().includes(w)))
    .slice(0, 3);
  const lat = (-24.95 - (f.pinY - 50) * 0.0004).toFixed(4);
  const lng = (-53.46 + (f.pinX - 50) * 0.0006).toFixed(4);

  const pinAt = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.max(4, Math.min(96, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.max(18, Math.min(96, ((e.clientY - r.top) / r.height) * 100));
    setF((cur) => ({ ...cur, pinX: x, pinY: y }));
  };

  const next = () => {
    const errs = validateEventStep(f, step, today);
    if (Object.keys(errs).length) return setTried((t) => ({ ...t, [step]: true }));
    if (step < 4) return setStep(step + 1);
    const ev: OrgEvent = {
      id: `ev${Date.now()}`,
      name: f.nome.trim(),
      type: f.tipo as EventType,
      date: formatEventDate(f.date, f.time),
      local: place ? place[0] : f.addr,
      localType: f.localType || 'Autódromo',
      pub: f.vis === 'pub',
      cap: Number(f.vagas),
      status: 'aberto',
      live: true,
      filled: 0,
      pending: 0,
    };
    useOrganizer.getState().addEvent(ev);
    useApp.getState().setMode('org');
    navigate('/organizador/publicado', { state: { id: ev.id, name: ev.name, pub: ev.pub }, replace: true });
  };

  const review: [string, string, number][] = [
    ['Nome', f.nome || '—', 1],
    ['Tipo', f.tipo ? EVENT_TYPES[f.tipo as EventType].label : '—', 1],
    ['Categorias', f.cats.join(', ') || '—', 2],
    ['Vagas', f.vagas || '—', 2],
    ['Data e hora', formatEventDate(f.date, f.time), 3],
    ['Local', `${f.localType || '—'} · ${place ? `${place[0]}, ${place[1]}` : f.addr || '—'}`, 3],
  ];

  return (
    <div className={s.page}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link to="/organizador" className={s.crumb}>
          <Icon name="arrow-left" size={16} />
          Meus eventos
        </Link>
        <span style={{ flex: 1 }} />
        <span className="fs-caption">Rascunho salvo automaticamente</span>
      </div>
      <div className={s.titleBlock}>
        <Overline>UC-25 · Criar evento</Overline>
        <Title as="h1" size={44}>
          Novo evento
        </Title>
      </div>
      <div className={s.steps}>
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const state = n < step ? 'done' : n === step ? 'current' : 'todo';
          return (
            <button key={label} type="button" className={s.step} data-state={state} style={{ cursor: n < step ? 'pointer' : 'default' }} onClick={() => n < step && setStep(n)} aria-current={state === 'current' ? 'step' : undefined}>
              <div className={s.stepBar} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={s.stepMark}>{state === 'done' ? <Icon name="check" weight="bold" size={12} /> : n}</span>
                <span style={{ fontSize: 13, color: state === 'current' ? 'var(--fs-text)' : 'var(--fs-text-secondary)', fontWeight: state === 'current' ? 500 : 400 }}>{label}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className={s.wizardGrid}>
        <div className={s.form}>
          {step === 1 && (
            <>
              <Field label="Nome do evento" error={E.nome}>
                {(id) => <Input id={id} value={f.nome} invalid={!!E.nome} placeholder="Ex.: Track Day Zilmar Beux · Etapa 4" onChange={(e) => set('nome', e.target.value)} />}
              </Field>
              <div className="fs-field" style={{ gap: 8 }}>
                <span className="fs-field__label">Tipo de evento</span>
                <div role="radiogroup" aria-label="Tipo de evento" className={s.choiceGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                  {(Object.keys(EVENT_TYPES) as EventType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={f.tipo === t}
                      data-error={E.tipo ? '' : undefined}
                      className={s.choice}
                      style={{ minHeight: 72, padding: '10px 12px', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 6 }}
                      onClick={() => set('tipo', t)}
                    >
                      <Icon name={EVENT_TYPES[t].icon} size={22} color={f.tipo === t ? 'var(--fs-primary-text)' : 'var(--fs-text-secondary)'} />
                      {EVENT_TYPES[t].label}
                    </button>
                  ))}
                </div>
                {E.tipo && <span className="fs-field__error">{E.tipo}</span>}
              </div>
              <Field label="Descrição">{(id) => <Textarea id={id} value={f.desc} placeholder="O que os pilotos devem saber sobre o evento" style={{ resize: 'vertical' }} onChange={(e) => set('desc', e.target.value)} />}</Field>
              <Field label="Regras" error={E.regras}>
                {(id) => <Textarea id={id} value={f.regras} invalid={!!E.regras} placeholder="Equipamentos obrigatórios, briefing, horários" style={{ resize: 'vertical' }} onChange={(e) => set('regras', e.target.value)} />}
              </Field>
              <div className="fs-field">
                <span className="fs-field__label">Capa</span>
                <div style={{ height: 180, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
                  <ImageSlot id="org-cover" placeholder="Arraste a capa: autódromo, box ou grid de largada" pick />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="fs-field" style={{ gap: 8 }}>
                <span className="fs-field__label" style={{ justifyContent: 'flex-start' }}>
                  Categorias aceitas <span className="fs-muted">· escolha ao menos 1</span>
                </span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CATEGORIES.map((c) => {
                    const on = f.cats.includes(c);
                    return (
                      <Chip key={c} on={on} error={!!E.cats} icon={on ? undefined : 'plus'} check style={{ minHeight: 44, padding: '0 16px', fontSize: 14, borderRadius: 10 }} onClick={() => set('cats', on ? f.cats.filter((x) => x !== c) : [...f.cats, c])}>
                        {c}
                      </Chip>
                    );
                  })}
                </div>
                {E.cats && <span className="fs-field__error">{E.cats}</span>}
              </div>
              <Field label="Limite de vagas" error={E.vagas} hint={E.vagas ? undefined : 'Total do evento, somando todas as categorias.'} style={{ maxWidth: 260 }}>
                {(id) => <Input id={id} type="number" min={1} value={f.vagas} invalid={!!E.vagas} placeholder="Ex.: 40" onChange={(e) => set('vagas', e.target.value)} />}
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 460 }}>
                <Field label="Data">{(id) => <Input id={id} type="date" value={f.date} invalid={!!E.date} onChange={(e) => set('date', e.target.value)} />}</Field>
                <Field label="Horário">{(id) => <Input id={id} type="time" value={f.time} invalid={!!E.time} onChange={(e) => set('time', e.target.value)} />}</Field>
              </div>
              {(E.date || E.time) && (
                <span role="alert" className="fs-field__error" style={{ marginTop: -12, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Icon name="warning-circle" />
                  {E.date ?? E.time}
                </span>
              )}
              <div className="fs-field" style={{ position: 'relative' }}>
                <label className="fs-field__label" htmlFor="org-addr">
                  Local
                </label>
                <Input
                  id="org-addr"
                  icon="magnifying-glass"
                  value={f.addr}
                  invalid={!!E.addr}
                  autoComplete="off"
                  placeholder="Buscar autódromo, pista ou área privada"
                  style={{ paddingLeft: 42 }}
                  onChange={(e) => {
                    setF((cur) => ({ ...cur, addr: e.target.value, place: null }));
                    setSug(e.target.value.length >= 2);
                  }}
                  onFocus={() => f.addr.length >= 2 && f.place === null && setSug(true)}
                />
                {sug && sugs.length > 0 && (
                  <div className={s.suggestions} role="listbox">
                    {sugs.map(({ p, i }) => (
                      <button
                        key={p[0]}
                        type="button"
                        role="option"
                        aria-selected={false}
                        className={s.suggestion}
                        onClick={() => {
                          setSug(false);
                          setF((cur) => ({ ...cur, addr: p[0], place: i, pinX: p[3], pinY: p[4], localType: p[2] }));
                        }}
                      >
                        <Icon name={LOCAL_ICON[p[2]]} size={18} color="var(--fs-secondary)" />
                        <span style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 14 }}>{p[0]}</span>
                          <span className="fs-caption">{p[1]}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {E.addr && <span className="fs-field__error">{E.addr}</span>}
              </div>
              <div
                className={s.pinMap}
                onPointerDown={(e) => {
                  dragging.current = true;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  pinAt(e);
                }}
                onPointerMove={(e) => dragging.current && pinAt(e)}
                onPointerUp={() => (dragging.current = false)}
                aria-label="Mapa: arraste para ajustar o pin"
              >
                <svg width="100%" height="100%" viewBox="0 0 700 260" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden>
                  <path d="M-10 80 C 150 40, 260 120, 420 90 S 640 50, 710 70" fill="none" stroke="#223441" strokeWidth="1.2" />
                  <path d="M-10 190 C 120 160, 300 230, 460 190 S 640 170, 710 200" fill="none" stroke="#223441" strokeWidth="1.2" />
                  <path d="M120 -10 C 150 80, 90 170, 140 270" fill="none" stroke="#1D3140" strokeWidth="5" />
                </svg>
                <div className={s.pin} style={{ left: `${f.pinX}%`, top: `${f.pinY}%` }}>
                  <span>
                    <Icon name={f.localType ? LOCAL_ICON[f.localType] : 'map-pin'} />
                  </span>
                  <span />
                </div>
                <div className={s.pinHint}>
                  <Icon name="hand-grabbing" />
                  Arraste para ajustar o pin · {lat}, {lng}
                </div>
              </div>
              <div className="fs-field" style={{ gap: 8 }}>
                <span className="fs-field__label" style={{ justifyContent: 'flex-start' }}>
                  Tipo de local autorizado <span style={{ color: 'var(--fs-danger-text)' }}>*</span>
                </span>
                <div role="radiogroup" aria-label="Tipo de local" className={s.choiceGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
                  {LOCAL_TYPES.map((l) => (
                    <button key={l} type="button" role="radio" aria-checked={f.localType === l} data-error={E.localType ? '' : undefined} className={s.choice} style={{ minHeight: 56, padding: '0 14px' }} onClick={() => set('localType', l)}>
                      <Icon name={LOCAL_ICON[l]} size={20} color="var(--fs-secondary)" />
                      {l}
                    </button>
                  ))}
                </div>
                {E.localType && <span className="fs-field__error">{E.localType}</span>}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="fs-field" style={{ gap: 8 }}>
                <span className="fs-field__label">Visibilidade</span>
                <div role="radiogroup" aria-label="Visibilidade" className={s.choiceGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  {(
                    [
                      ['pub', 'Público', 'Inscrições confirmadas automaticamente até esgotar as vagas.', 'globe-simple'],
                      ['priv', 'Privado', 'Cada inscrição exige sua aprovação na Central.', 'lock-simple'],
                    ] as const
                  ).map(([id, label, sub, icon]) => (
                    <button key={id} type="button" role="radio" aria-checked={f.vis === id} className={s.choice} style={{ padding: 16, borderRadius: 14, flexDirection: 'column', alignItems: 'flex-start', gap: 6 }} onClick={() => set('vis', id)}>
                      <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 15 }}>
                        <Icon name={icon} size={20} color={f.vis === id ? 'var(--fs-primary-text)' : 'var(--fs-text-secondary)'} />
                        {label}
                      </span>
                      <span style={{ fontSize: 13, lineHeight: 1.5, fontWeight: 400 }} className="fs-muted">
                        {sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="fs-card">
                {review.map(([k, v, n]) => (
                  <div key={k} className={s.reviewRow}>
                    <span style={{ fontSize: 13 }} className="fs-muted">
                      {k}
                    </span>
                    <span style={{ fontSize: 14 }}>{v}</span>
                    <Button variant="ghost" size="xs" onClick={() => setStep(n)}>
                      Editar
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            {step > 1 && (
              <Button variant="secondary" size="md" style={{ fontSize: 14, padding: '0 18px' }} onClick={() => setStep(step - 1)}>
                Voltar
              </Button>
            )}
            <Button size="md" icon={step === 4 ? 'paper-plane-tilt' : 'arrow-right'} style={{ fontSize: 14, padding: '0 22px' }} onClick={next}>
              {step === 4 ? 'Publicar' : 'Continuar'}
            </Button>
            {errCount > 0 && <span style={{ fontSize: 13, color: 'var(--fs-danger-text)' }}>{errCount} campo(s) para revisar</span>}
          </div>
        </div>

        <aside className={s.preview} aria-label="Prévia do card no app">
          <span className="fs-caption">Prévia do card no app</span>
          <article className="fs-card" style={{ overflow: 'hidden' }}>
            <div style={{ height: 150, position: 'relative', background: 'var(--fs-surface-elevated)', display: 'grid', placeItems: 'center', color: 'var(--fs-text-muted)' }}>
              <ImageSlot id="org-cover" placeholder=" " editable={false} />
              <span style={{ position: 'absolute', top: 10, right: 10 }}>
                <span className={`fs-badge fs-badge--overlay ${f.vis === 'pub' ? 'fs-badge--outline' : 'fs-badge--outline-warning'}`}>{f.vis === 'pub' ? 'Público' : 'Requer aprovação'}</span>
              </span>
            </div>
            <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Overline>{f.tipo ? EVENT_TYPES[f.tipo as EventType].label : 'Tipo do evento'}</Overline>
              <span className="fs-display" style={{ fontSize: 24, lineHeight: 1.05 }}>
                {f.nome || 'Nome do evento'}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }} className="fs-body">
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Icon name="calendar-blank" color="var(--fs-text-secondary)" />
                  {formatEventDate(f.date, f.time)}
                </span>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Icon name={f.localType ? LOCAL_ICON[f.localType] : 'map-pin'} color="var(--fs-secondary)" />
                  {(f.localType || 'Tipo de local') + (place ? ` · ${place[1].split(',')[0]}` : '')}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {f.cats.map((c) => (
                  <Tag key={c}>{c}</Tag>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span className="fs-muted">Vagas</span>
                <span>{f.vagas ? `${f.vagas} vagas` : '—'}</span>
              </div>
            </div>
          </article>
        </aside>
      </div>
    </div>
  );
}

/** UC-25 · Sucesso: evento publicado. */
export function EventPublished() {
  const navigate = useNavigate();
  const st = (useLocation().state as { id: string; name: string; pub: boolean } | null) ?? { id: '', name: 'O evento', pub: true };
  return (
    <div className={s.page} style={{ padding: '96px 40px', maxWidth: 640, background: 'radial-gradient(60% 60% at 0% 0%, rgba(34,197,94,.10), transparent 70%)', gap: 16 }}>
      <div className="fs-icon-tile fs-icon-tile--hero" style={{ borderColor: 'var(--fs-success)', color: 'var(--fs-success)', boxShadow: 'none' }}>
        <Icon name="check-circle" />
      </div>
      <Overline style={{ color: 'var(--fs-success-text)' }}>UC-25 · Sucesso</Overline>
      <Title as="h1" size={52}>
        Evento publicado · pilotos da região notificados
      </Title>
      <p style={{ fontSize: 15, lineHeight: 1.55 }} className="fs-body">
        {st.name} já aparece no Feed e no Mapa. {st.pub ? 'Inscrições são confirmadas automaticamente.' : 'Você receberá cada inscrição para aprovar.'}
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        <Button size="md" style={{ fontSize: 14 }} onClick={() => navigate('/organizador')}>
          Ver em Meus eventos
        </Button>
        <Button variant="secondary" size="md" style={{ fontSize: 14 }} onClick={() => navigate(`/organizador/eventos/${st.id}/inscricoes`)} disabled={!st.id}>
          Gerenciar inscrições
        </Button>
      </div>
    </div>
  );
}
