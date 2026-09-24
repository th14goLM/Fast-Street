import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/ui/Icon';
import { Button } from '@/ui/controls';
import { Badge, EventStatusBadge, Overline, Progress, Tabs, Title } from '@/ui/display';
import { EVENT_TYPES, LOCAL_ICON } from '@/domain/catalog';
import type { EventStatus } from '@/domain/types';
import type { OrgEvent } from '@/data/organizer';
import { eventCounts, useOrganizer } from '@/store/organizer';
import s from './organizer.module.css';

const TABS: { value: EventStatus; label: string }[] = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'aberto', label: 'Abertos' },
  { value: 'andamento', label: 'Em andamento' },
  { value: 'encerrado', label: 'Encerrados' },
];

/** UC-06 · Central do Organizador: Meus eventos by status. */
export function MyEvents() {
  const navigate = useNavigate();
  const events = useOrganizer((st) => st.events);
  const regs = useOrganizer((st) => st.regs);
  const [tab, setTab] = useState<EventStatus>('aberto');
  const rows = events.filter((e) => e.status === tab);

  const action = (e: OrgEvent): [string, () => void, boolean] => {
    if (e.status === 'rascunho') return ['Continuar edição', () => navigate('/organizador/novo', { state: { draft: e } }), false];
    if (e.status === 'encerrado') return e.published ? ['Ver resultados', () => navigate('/organizador/ranking'), false] : ['Registrar resultados', () => navigate(`/organizador/eventos/${e.id}/resultados`), true];
    return ['Gerenciar', () => navigate(`/organizador/eventos/${e.id}/inscricoes`), false];
  };

  return (
    <div className={s.page}>
      <div className={s.titleRow}>
        <div className={s.titleBlock}>
          <Overline>UC-06 · Central do Organizador</Overline>
          <Title as="h1" size={48}>
            Meus eventos
          </Title>
        </div>
        <Button icon="plus" onClick={() => navigate('/organizador/novo')} style={{ padding: '0 18px' }}>
          Criar evento
        </Button>
      </div>
      <Tabs label="Status" value={tab} onChange={setTab} tabs={TABS.map((t) => ({ ...t, count: events.filter((e) => e.status === t.value).length }))} />
      {!rows.length ? (
        <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Icon name="calendar-blank" size={32} color="var(--fs-text-secondary)" />
          <span style={{ fontSize: 15, fontWeight: 500 }}>Nada por aqui</span>
          <span style={{ fontSize: 13 }} className="fs-muted">
            Nenhum evento neste status.
          </span>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Evento</th>
                <th>Data</th>
                <th>Local</th>
                <th style={{ width: 200 }}>Inscritos / vagas</th>
                <th>Pendências</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const c = eventCounts(e, regs);
                const pct = Math.min(100, Math.round((c.filled / e.cap) * 100));
                const [label, go, strong] = action(e);
                return (
                  <tr key={e.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontWeight: 500 }}>{e.name}</span>
                        <span className="fs-overline" style={{ fontSize: 11, letterSpacing: '.14em' }}>
                          {EVENT_TYPES[e.type].label} · {e.pub ? 'Público' : 'Privado'}
                        </span>
                      </div>
                    </td>
                    <td className="fs-body" style={{ whiteSpace: 'nowrap' }}>
                      {e.date}
                    </td>
                    <td className="fs-body">
                      <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <Icon name={LOCAL_ICON[e.localType]} color="var(--fs-secondary)" />
                        {e.localType}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {c.filled} / {e.cap}
                        </span>
                        <Progress pct={pct} color={pct >= 100 ? 'var(--fs-warning)' : undefined} />
                      </div>
                    </td>
                    <td>
                      {c.pending ? (
                        <Badge tone="warning" icon="hourglass-medium">
                          {c.pending} pendentes
                        </Badge>
                      ) : (
                        <span style={{ color: 'var(--fs-text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>{e.published ? <Badge tone="neutral">Encerrado · resultados publicados</Badge> : <EventStatusBadge status={e.status} />}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Button variant={strong ? 'primary' : 'secondary'} size="xs" onClick={go}>
                        {label}
                        <Icon name="arrow-right" size={13} />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
