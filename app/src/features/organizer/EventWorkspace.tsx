import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/ui/Icon';
import { Button, Segmented } from '@/ui/controls';
import { Avatar, Badge, EventStatusBadge, Overline, Progress, Tag, Title } from '@/ui/display';
import { Input } from '@/ui/form';
import { Modal } from '@/ui/overlays';
import { RESULT_CATEGORIES, type OrgEvent, type OrgRegStatus, type OrgRegistration } from '@/data/organizer';
import { EVENT_TYPES, LOCAL_ICON, ORGANIZER_AWARDS, POINTS_BY_POSITION } from '@/domain/catalog';
import { pointsFor } from '@/domain/ranking';
import type { Category } from '@/domain/types';
import { cx } from '@/lib/cx';
import { toast } from '@/lib/toast';
import { eventCounts, eventRegs, initialOrder, useOrganizer } from '@/store/organizer';
import s from './organizer.module.css';

type View = 'manage' | 'results' | 'review';

const REG_STATUS: Record<OrgRegStatus, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral'; icon: string; weight?: 'bold' }> = {
  conf: { label: 'Confirmada', tone: 'success', icon: 'check', weight: 'bold' },
  pend: { label: 'Pendente', tone: 'warning', icon: 'hourglass-medium' },
  rec: { label: 'Recusada', tone: 'danger', icon: 'x', weight: 'bold' },
  rem: { label: 'Removida', tone: 'neutral', icon: 'user-minus' },
};

/** Header + tabs shared by Inscrições / Resultados / Revisão of one organizer event. */
export function EventWorkspace({ view }: { view: View }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const event = useOrganizer((st) => st.events.find((e) => e.id === id));
  const [closing, setClosing] = useState(false);
  if (!event) return <Navigate to="/organizador" replace />;

  const closed = event.status === 'encerrado';
  const canClose = event.status === 'aberto' || event.status === 'andamento';
  const base = `/organizador/eventos/${event.id}`;

  return (
    <div className={s.page} style={{ gap: 20, paddingTop: 28 }}>
      <Link to="/organizador" className={s.crumb}>
        <Icon name="arrow-left" size={16} />
        Meus eventos
      </Link>
      <div className={s.titleRow}>
        <div className={s.titleBlock}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Overline>{EVENT_TYPES[event.type].label}</Overline>
            <EventStatusBadge status={event.status} small />
          </div>
          <Title as="h1" size={44}>
            {event.name}
          </Title>
          <span className="fs-body" style={{ fontSize: 13, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Icon name="calendar-blank" color="var(--fs-text-secondary)" />
              {event.date}
            </span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Icon name={LOCAL_ICON[event.localType]} color="var(--fs-secondary)" />
              {event.localType} · {event.local}
            </span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Icon name={event.pub ? 'globe-simple' : 'lock-simple'} color="var(--fs-text-secondary)" />
              {event.pub ? 'Público' : 'Privado'}
            </span>
          </span>
        </div>
        {canClose && (
          <Button variant="secondary" icon="flag-checkered" onClick={() => setClosing(true)}>
            Encerrar evento
          </Button>
        )}
      </div>
      <div role="tablist" className="fs-tabs">
        <button type="button" role="tab" className="fs-tab" aria-selected={view === 'manage'} onClick={() => navigate(`${base}/inscricoes`)}>
          Inscrições
        </button>
        <button type="button" role="tab" className="fs-tab" aria-selected={view !== 'manage'} onClick={() => navigate(`${base}/resultados`)}>
          {!closed && <Icon name="lock-simple" size={14} />}
          Resultados
        </button>
      </div>

      {view === 'manage' && <ManageRegistrations event={event} closed={closed} onGoResults={() => navigate(`${base}/resultados`)} />}
      {view !== 'manage' && !closed && (
        <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start', maxWidth: 560 }}>
          <div className="fs-icon-tile" style={{ color: 'var(--fs-text-secondary)' }}>
            <Icon name="lock-simple" />
          </div>
          <Title as="h2" size={32} lh={1}>
            Resultados disponíveis após o encerramento
          </Title>
          <p style={{ fontSize: 15, lineHeight: 1.55 }} className="fs-body">
            Este evento está com status {event.status === 'andamento' ? 'Em andamento' : event.status === 'aberto' ? 'Aberto' : 'Rascunho'}. Os resultados só podem ser registrados quando o status for Encerrado, para que o ranking reflita apenas provas concluídas.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
            {canClose && <Button onClick={() => setClosing(true)}>Encerrar evento</Button>}
            <Button variant="secondary" onClick={() => navigate(`${base}/inscricoes`)}>
              Ver inscrições
            </Button>
          </div>
        </div>
      )}
      {view === 'results' && closed && <ResultsEditor onReview={() => navigate(`${base}/resultados/revisao`)} />}
      {view === 'review' && closed && (
        <ResultsReview
          onBack={() => navigate(`${base}/resultados`)}
          onPublish={() => {
            useOrganizer.getState().publishResults(event.id);
            navigate('/organizador/ranking', { state: { justPublished: true } });
          }}
        />
      )}

      <Modal
        open={closing}
        onClose={() => setClosing(false)}
        title="Encerrar evento?"
        width={440}
        actions={
          <>
            <Button variant="secondary" onClick={() => setClosing(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                useOrganizer.getState().closeEvent(event.id);
                setClosing(false);
                toast('Evento encerrado. Resultados liberados.');
              }}
            >
              Encerrar evento
            </Button>
          </>
        }
      >
        <p style={{ fontSize: 14, lineHeight: 1.55 }} className="fs-body">
          O status passa para Encerrado. Inscrições ficam bloqueadas e o registro de resultados é liberado.
        </p>
      </Modal>
    </div>
  );
}

type Filter = 'all' | 'pend' | 'conf' | 'rec';

/** UC-33 · Gerenciar inscrições; UC-34 · Remover piloto. */
function ManageRegistrations({ event, closed, onGoResults }: { event: OrgEvent; closed: boolean; onGoResults: () => void }) {
  const allRegs = useOrganizer((st) => st.regs);
  const regs = eventRegs(event.id, allRegs);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [alert, setAlert] = useState<string | null>(null);
  const [removing, setRemoving] = useState<OrgRegistration | null>(null);
  const counts = eventCounts(event, allRegs);
  const conf = regs.filter((r) => r.status === 'conf').length;
  const pend = regs.filter((r) => r.status === 'pend').length;
  const rec = regs.filter((r) => r.status === 'rec' || r.status === 'rem').length;
  const pct = Math.min(100, Math.round((counts.filled / event.cap) * 100));
  const ql = q.trim().toLowerCase();
  const rows = regs.filter((r) => (filter === 'all' || r.status === filter || (filter === 'rec' && r.status === 'rem')) && (!ql || `${r.name} ${r.car}`.toLowerCase().includes(ql)));
  const { setRegStatus } = useOrganizer.getState();

  const approve = (r: OrgRegistration) => {
    if (conf >= event.cap) return setAlert(`Não foi possível aprovar ${r.name}: vagas esgotadas (${conf}/${event.cap}). Aumente o limite ou remova uma inscrição.`);
    setRegStatus(r.id, 'conf');
    setAlert(null);
    toast(`${r.name} aprovado e notificado.`);
  };

  return (
    <>
      <div className={s.stats}>
        <div className={s.stat}>
          <span className="fs-caption">Confirmadas / vagas</span>
          <span className="fs-num" style={{ fontSize: 32, lineHeight: 1 }}>
            {counts.filled} <span style={{ color: 'var(--fs-text-secondary)', fontSize: 22 }}>/ {event.cap}</span>
          </span>
          <Progress pct={pct} color={pct >= 100 ? 'var(--fs-warning)' : undefined} />
        </div>
        <div className={s.stat}>
          <span className="fs-caption">Pendentes</span>
          <span className="fs-num" style={{ fontSize: 32, lineHeight: 1, color: pend ? 'var(--fs-warning-text)' : undefined }}>
            {pend}
          </span>
        </div>
        <div className={s.stat}>
          <span className="fs-caption">Recusadas / removidas</span>
          <span className="fs-num" style={{ fontSize: 32, lineHeight: 1 }}>
            {rec}
          </span>
        </div>
      </div>

      {alert && (
        <div role="alert" className="fs-banner fs-banner--error" style={{ padding: '12px 16px' }}>
          <Icon name="warning-circle" />
          <span style={{ flex: 1 }}>{alert}</span>
          <button type="button" aria-label="Fechar" onClick={() => setAlert(null)} style={{ width: 32, height: 32, border: 0, background: 'transparent', color: 'var(--fs-text-secondary)', cursor: 'pointer' }}>
            <Icon name="x" />
          </button>
        </div>
      )}
      {closed && (
        <div className="fs-banner fs-banner--info">
          <Icon name="lock-simple" size={18} color="var(--fs-text-secondary)" />
          <span style={{ flex: 1 }}>Evento encerrado: inscrições não podem mais ser aprovadas nem removidas.</span>
          <Button size="sm" onClick={onGoResults}>
            Registrar resultados
          </Button>
        </div>
      )}

      <div className={s.toolbar}>
        <Segmented<Filter>
          label="Filtrar por status"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: `Todas · ${regs.length}` },
            { value: 'pend', label: `Pendentes · ${pend}` },
            { value: 'conf', label: `Confirmadas · ${conf}` },
            { value: 'rec', label: `Recusadas · ${rec}` },
          ]}
        />
        <span style={{ flex: 1 }} />
        <div style={{ width: 260 }}>
          <Input icon="magnifying-glass" aria-label="Buscar piloto ou veículo" placeholder="Buscar piloto ou veículo" value={q} onChange={(e) => setQ(e.target.value)} style={{ minHeight: 40, fontSize: 14, paddingLeft: 40 }} />
        </div>
      </div>

      {!regs.length ? (
        <div style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Icon name="users-three" size={32} color="var(--fs-text-secondary)" />
          <span style={{ fontSize: 15, fontWeight: 500 }}>Nenhuma inscrição ainda</span>
          <span style={{ fontSize: 13 }} className="fs-muted">
            Pilotos da região foram notificados. As inscrições aparecem aqui em tempo real.
          </span>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={cx(s.table, s.tableCompact)}>
            <thead>
              <tr>
                <th>Piloto</th>
                <th>Veículo</th>
                <th>Categoria</th>
                <th>Inscrição</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const st = REG_STATUS[r.status];
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <Avatar name={r.name} size={32} />
                        <span style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500 }}>{r.name}</span>
                          <span className="fs-caption">{r.city}</span>
                        </span>
                      </div>
                    </td>
                    <td className="fs-body">{r.car}</td>
                    <td>
                      <Tag md>{r.cat}</Tag>
                    </td>
                    <td className="fs-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {r.date}
                    </td>
                    <td>
                      <Badge tone={st.tone} icon={st.icon} iconWeight={st.weight}>
                        {st.label}
                      </Badge>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        {r.status === 'pend' && (
                          <>
                            <Button
                              variant="danger-ghost"
                              size="xs"
                              disabled={closed}
                              onClick={() => {
                                setRegStatus(r.id, 'rec');
                                toast(`Inscrição de ${r.name} recusada.`, { tone: 'info' });
                              }}
                            >
                              Recusar
                            </Button>
                            <Button variant="success" size="xs" icon="check" iconWeight="bold" iconSize={12} disabled={closed} onClick={() => approve(r)}>
                              Aprovar
                            </Button>
                          </>
                        )}
                        {r.status === 'conf' && (
                          <Button variant="danger-ghost" size="xs" icon="user-minus" iconSize={14} disabled={closed} title={closed ? 'Evento encerrado: não é possível remover' : 'Remover piloto'} onClick={() => setRemoving(r)}>
                            Remover
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Remover piloto?"
        width={440}
        actions={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!removing) return;
                setRegStatus(removing.id, 'rem');
                toast(`${removing.name} removido e notificado.`, { tone: 'info' });
                setRemoving(null);
                setAlert(null);
              }}
            >
              Remover
            </Button>
          </>
        }
      >
        <p style={{ fontSize: 14, lineHeight: 1.55 }} className="fs-body">
          {removing?.name} ({removing?.car}) será removido de {event.name} e notificado. A vaga volta a ficar disponível.
        </p>
      </Modal>
    </>
  );
}

function useResultsData() {
  const regs = useOrganizer((st) => st.regs);
  const stored = useOrganizer((st) => st.order);
  const pts = useOrganizer((st) => st.pts);
  const awards = useOrganizer((st) => st.awards);
  const order = stored ?? initialOrder(regs);
  const byId = Object.fromEntries(regs.map((r) => [r.id, r]));
  return { order, byId, pts, awards };
}

/** UC-07 · Registrar resultados: drag-and-drop order, points and awards. */
function ResultsEditor({ onReview }: { onReview: () => void }) {
  const { order, byId, pts, awards } = useResultsData();
  const [cat, setCat] = useState<Category>('Turbo');
  const [drag, setDrag] = useState<number | null>(null);
  const [awardFor, setAwardFor] = useState<string | null>(null);
  const [awardSel, setAwardSel] = useState<string[]>([]);
  const { moveResult, setPoints, setAwards } = useOrganizer.getState();
  const list = order[cat] ?? [];

  return (
    <div className={s.resultsGrid}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        <div className={s.toolbar}>
          <Segmented label="Categoria" value={cat} onChange={setCat} options={RESULT_CATEGORIES.map((c) => ({ value: c, label: `${c} · ${(order[c] ?? []).length}` }))} />
          <span style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }} className="fs-muted">
            <Icon name="hand-grabbing" />
            Arraste as linhas para definir as posições
          </span>
        </div>
        <div role="list" style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowX: 'auto' }}>
          {list.map((id, i) => {
            const r = byId[id];
            const edited = pts[id] !== undefined;
            return (
              <div
                key={id}
                role="listitem"
                draggable
                className={s.resRow}
                data-drag={drag === i || undefined}
                style={{ minWidth: 720 }}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', String(i));
                  setDrag(i);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (drag !== null && drag !== i) {
                    moveResult(cat, drag, i);
                    setDrag(i);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(null);
                }}
                onDragEnd={() => setDrag(null)}
              >
                <Icon name="dots-six-vertical" size={20} color="var(--fs-text-muted)" />
                <span className="fs-num" style={{ fontSize: 28, lineHeight: 1, color: i < 3 ? 'var(--fs-secondary)' : 'var(--fs-text-secondary)' }}>
                  P{i + 1}
                </span>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                  <Avatar name={r.name} size={32} />
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontWeight: 500 }}>{r.name}</span>
                    <span className="fs-caption">{r.car}</span>
                  </span>
                </div>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="number"
                    min={0}
                    className={s.ptsInput}
                    data-edited={edited || undefined}
                    aria-label={`Pontos de ${r.name}`}
                    value={pointsFor(i, pts[id])}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPoints(id, v === '' || Number(v) === POINTS_BY_POSITION[i] ? undefined : Number(v));
                    }}
                  />
                  <span style={{ fontSize: 11, color: edited ? 'var(--fs-warning-text)' : 'var(--fs-text-muted)' }}>{edited ? 'editado' : 'auto'}</span>
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {(awards[id] ?? []).map((a) => (
                    <Badge key={a} tone="secondary" small icon="medal" iconWeight="fill">
                      {a}
                    </Badge>
                  ))}
                  <Button
                    variant="ghost"
                    size="xs"
                    icon="medal"
                    iconSize={14}
                    style={{ fontSize: 12, padding: '0 8px', minHeight: 32 }}
                    onClick={() => {
                      setAwardFor(id);
                      setAwardSel(awards[id] ?? []);
                    }}
                  >
                    Conceder prêmio
                  </Button>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button type="button" aria-label="Subir" className="fs-icon-btn fs-icon-btn--plain" style={{ width: 30, height: 30, fontSize: 16, color: 'var(--fs-text-secondary)' }} onClick={() => moveResult(cat, i, i - 1)}>
                    <Icon name="caret-up" />
                  </button>
                  <button type="button" aria-label="Descer" className="fs-icon-btn fs-icon-btn--plain" style={{ width: 30, height: 30, fontSize: 16, color: 'var(--fs-text-secondary)' }} onClick={() => moveResult(cat, i, i + 1)}>
                    <Icon name="caret-down" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <aside className={s.side}>
        <Title as="span" size={20} lh={1}>
          Pontuação
        </Title>
        <span style={{ fontSize: 13, lineHeight: 1.5 }} className="fs-muted">
          Calculada pela posição (25, 18, 15, 12, 10, 8…). Edite um valor para ajustar; use "auto" para voltar ao padrão.
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {RESULT_CATEGORIES.map((c) => {
            const ids = order[c] ?? [];
            return (
              <div key={c} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span>{c}</span>
                <span className="fs-muted">
                  {ids.length} pilotos · {ids.reduce((n, id, i) => n + pointsFor(i, pts[id]), 0)} pts
                </span>
              </div>
            );
          })}
        </div>
        <Button size="md" style={{ fontSize: 14 }} onClick={onReview}>
          Revisar e publicar
        </Button>
      </aside>

      <Modal
        open={!!awardFor}
        onClose={() => setAwardFor(null)}
        title="Conceder prêmio"
        width={440}
        actions={
          <>
            <Button variant="secondary" onClick={() => setAwardFor(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (awardFor) setAwards(awardFor, awardSel);
                setAwardFor(null);
              }}
            >
              Salvar
            </Button>
          </>
        }
      >
        <p style={{ fontSize: 14, lineHeight: 1.55 }} className="fs-body">
          Selecione as conquistas para {awardFor ? byId[awardFor]?.name : ''}. Elas aparecem no perfil do piloto após a publicação.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ORGANIZER_AWARDS.map(([label, icon]) => {
            const on = awardSel.includes(label);
            return (
              <button
                key={label}
                type="button"
                role="checkbox"
                aria-checked={on}
                className="fs-option"
                style={{ minHeight: 48, padding: '0 12px', borderColor: on ? undefined : 'var(--fs-line)', fontSize: 14, fontWeight: 500 }}
                onClick={() => setAwardSel((cur) => (on ? cur.filter((a) => a !== label) : [...cur, label]))}
              >
                <Icon name={icon} size={20} color="var(--fs-secondary)" />
                <span style={{ flex: 1 }}>{label}</span>
                {on && <Icon name="check" weight="bold" color="var(--fs-primary-text)" />}
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}

/** UC-28 · Revisão antes de publicar. */
function ResultsReview({ onBack, onPublish }: { onBack: () => void; onPublish: () => void }) {
  const { order, byId, pts, awards } = useResultsData();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 960 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Title as="h2" size={30} lh={1} style={{ flex: 1 }}>
          Revisar resultados
        </Title>
        <Button variant="secondary" onClick={onBack}>
          Voltar e editar
        </Button>
        <Button icon="paper-plane-tilt" onClick={onPublish}>
          Publicar resultados
        </Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {RESULT_CATEGORIES.map((c) => (
          <div key={c} className="fs-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="fs-display" style={{ fontSize: 18, lineHeight: 1, letterSpacing: '.06em' }}>
              {c}
            </span>
            {(order[c] ?? []).map((id, i) => (
              <div key={id} style={{ display: 'grid', gridTemplateColumns: '32px 1fr auto', gap: 8, alignItems: 'center', fontSize: 13, minHeight: 28 }}>
                <span className="fs-num" style={{ fontSize: 16, color: i < 3 ? 'var(--fs-secondary)' : 'var(--fs-text-secondary)' }}>
                  P{i + 1}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>{byId[id].name}</span>
                  {!!awards[id]?.length && <span style={{ fontSize: 11, color: 'var(--fs-secondary)' }}>{awards[id].join(' · ')}</span>}
                </span>
                <span className="fs-body" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {pointsFor(i, pts[id])} pts
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <p style={{ fontSize: 13 }} className="fs-muted">
        Ao publicar, os pontos entram no ranking mensal e semestral, e cada piloto recebe uma notificação com seu resultado.
      </p>
    </div>
  );
}

