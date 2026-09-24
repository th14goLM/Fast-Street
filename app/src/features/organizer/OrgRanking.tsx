import { useState } from 'react';
import { Icon } from '@/ui/Icon';
import { Segmented } from '@/ui/controls';
import { Overline, Title, Variation } from '@/ui/display';
import { PRIOR_RANKING, RESULT_CATEGORIES } from '@/data/organizer';
import { applyResults, pointsFor } from '@/domain/ranking';
import type { Category } from '@/domain/types';
import { initialOrder, useOrganizer } from '@/store/organizer';
import s from './organizer.module.css';

/** UC-29 · Ranking atualizado after publishing the event's results. */
export function OrgRanking() {
  const regs = useOrganizer((st) => st.regs);
  const stored = useOrganizer((st) => st.order);
  const pts = useOrganizer((st) => st.pts);
  const published = useOrganizer((st) => st.events.some((e) => e.live && e.published));
  const [cat, setCat] = useState<Category>('Turbo');
  const order = stored ?? initialOrder(regs);
  const byId = Object.fromEntries(regs.map((r) => [r.id, r]));

  const gains = published ? (order[cat] ?? []).map((id, i) => ({ name: byId[id].name, car: byId[id].car, points: pointsFor(i, pts[id]) })) : [];
  const prior = (PRIOR_RANKING[cat] ?? []).map(([name, car, points]) => ({ name, car, points }));
  const rows = applyResults(prior, gains);
  const podium = [1, 0, 2].map((i) => rows[i]).filter(Boolean);

  return (
    <div className={s.page} style={{ gap: 20, paddingTop: 28 }}>
      {published && (
        <div role="status" className="fs-banner fs-banner--success">
          <Icon name="check-circle" weight="fill" />
          Ranking atualizado e pilotos notificados
        </div>
      )}
      <div className={s.titleRow}>
        <div className={s.titleBlock}>
          <Overline>UC-08 · Ranking · Mensal · Outubro</Overline>
          <Title as="h1" size={48}>
            Ranking {cat}
          </Title>
        </div>
        <Segmented label="Categoria" value={cat} onChange={setCat} options={RESULT_CATEGORIES.map((c) => ({ value: c, label: c }))} />
      </div>
      <div className={s.podium}>
        {podium.map((p) => (
          <div key={p.name} className={s.podiumCard} style={{ minHeight: p.pos === 1 ? 190 : p.pos === 2 ? 160 : 140, boxShadow: `0 0 0 1px ${p.pos === 1 ? 'var(--fs-secondary)' : 'var(--fs-surface-elevated)'}` }}>
            <span style={{ alignSelf: 'flex-start', padding: '2px 8px', borderRadius: 6, background: p.pos === 1 ? 'var(--fs-secondary)' : p.pos === 2 ? 'var(--fs-text-body)' : 'var(--fs-text-secondary)', color: 'var(--fs-bg)', font: '700 16px var(--fs-font-display)' }}>P{p.pos}</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 15, fontWeight: 500 }}>{p.name}</span>
            <span className="fs-caption">{p.car}</span>
            <span className="fs-num" style={{ fontSize: 28, lineHeight: 1 }}>
              {p.total} PTS
            </span>
          </div>
        ))}
      </div>
      <div className={s.tableWrap}>
        <table className={s.table} style={{ maxWidth: 960, minWidth: 640 }}>
          <thead>
            <tr>
              <th style={{ width: 60 }}>Pos.</th>
              <th style={{ width: 70 }}>Var.</th>
              <th>Piloto</th>
              <th>Carro</th>
              <th style={{ textAlign: 'right' }}>Neste evento</th>
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} style={{ background: r.gain ? 'rgba(233,93,44,.04)' : undefined }}>
                <td className="fs-num" style={{ fontSize: 20, padding: '10px 12px' }}>
                  {r.pos}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <Variation delta={r.delta} />
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{r.name}</td>
                <td className="fs-body" style={{ padding: '10px 12px' }}>
                  {r.car}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: r.gain ? 'var(--fs-success-text)' : 'var(--fs-text-muted)', fontVariantNumeric: 'tabular-nums' }}>{r.gain ? `+${r.gain}` : '—'}</td>
                <td className="fs-num" style={{ padding: '10px 12px', textAlign: 'right', fontSize: 18 }}>
                  {r.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
