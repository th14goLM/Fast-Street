import { useState } from 'react';
import { Chip, Segmented, Button } from '@/ui/controls';
import { Avatar, Title, Variation } from '@/ui/display';
import { EmptyState, ErrorCard, OfflineBanner, Skeleton } from '@/ui/feedback';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/layout/Screen';
import { ME, RANKING_PILOTS } from '@/data/pilot';
import { CATEGORIES, type Category } from '@/domain/types';
import { variation } from '@/domain/ranking';
import { useLoad } from '@/lib/network';
import s from './ranking.module.css';

type Scope = 'geral' | 'cat';
type Period = 'm' | 's';

/** Sorted ranking for a scope / period. Exposed for tests. */
export function rankingPool(scope: Scope, period: Period, cat: Category) {
  const key = period === 'm' ? 'm' : 's';
  return (scope === 'geral' ? RANKING_PILOTS : RANKING_PILOTS.filter((p) => p.cat === cat)).slice().sort((a, b) => b[key] - a[key]);
}

/** UC-08 · Ranking: podium, list, and the pinned "Sua posição" row. */
export function Ranking() {
  const load = useLoad('ranking');
  const [scope, setScope] = useState<Scope>('geral');
  const [period, setPeriod] = useState<Period>('m');
  const [cat, setCat] = useState<Category>('Turbo');
  const key = period === 'm' ? 'm' : 's';
  const dk = period === 'm' ? 'dm' : 'ds';
  const pool = rankingPool(scope, period, cat);
  const ready = load.status === 'ready';
  const hasData = ready && pool.length > 0;
  const top = pool.slice(0, 3);
  const meIdx = pool.findIndex((p) => p.name === ME);
  const me = pool[meIdx];
  const meDelta = me ? me[dk] : 0;

  const podium = [1, 0, 2]
    .filter((i) => top[i])
    .map((i) => ({ p: top[i], pos: i + 1 }));

  return (
    <Screen
      label="Ranking"
      header={
        <header className={s.header}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Title as="h1" size={36} lh={1}>
              Ranking
            </Title>
            <span className="fs-caption">{period === 'm' ? 'Outubro 2026' : '2º semestre 2026'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Segmented block size="sm" label="Escopo" value={scope} onChange={setScope} options={[{ value: 'geral', label: 'Geral' }, { value: 'cat', label: 'Por categoria' }]} />
            <Segmented block size="sm" label="Período" value={period} onChange={setPeriod} options={[{ value: 'm', label: 'Mensal' }, { value: 's', label: 'Semestral' }]} />
          </div>
          {scope === 'cat' && (
            <div className="fs-hscroll" role="radiogroup" aria-label="Categoria" style={{ margin: '0 -20px', padding: '0 20px' }}>
              {CATEGORIES.map((c) => (
                <Chip key={c} role="radio" small on={cat === c} onClick={() => setCat(c)}>
                  {c}
                </Chip>
              ))}
            </div>
          )}
        </header>
      }
      bodyClassName={s.body}
    >
      {load.offline && ready && <OfflineBanner updated="há 1 h" />}
      {load.status === 'loading' && (
        <>
          <div className={s.podium}>
            <Skeleton h={130} r={14} />
            <Skeleton h={160} r={14} />
            <Skeleton h={115} r={14} />
          </div>
          {[1, 2, 3, 4, 5].map((k) => (
            <Skeleton key={k} h={56} r={12} />
          ))}
        </>
      )}
      {load.status === 'error' && <ErrorCard title="Não foi possível carregar o ranking" onRetry={load.retry} style={{ marginTop: 24 }} />}
      {ready && !pool.length && (
        <EmptyState
          icon="trophy"
          title="Sem resultados neste período"
          titleSize={28}
          text={`Nenhum organizador publicou resultados de ${cat} ainda. Os pontos aparecem assim que o primeiro evento for encerrado.`}
          style={{ marginTop: 24 }}
        >
          <Button variant="secondary" onClick={() => setScope('geral')}>
            Ver ranking geral
          </Button>
        </EmptyState>
      )}
      {hasData && (
        <>
          <div className={s.podium}>
            {podium.map(({ p, pos }) => (
              <div key={p.name} className={s.podiumCard} data-pos={pos}>
                <span className={s.podiumBadge} data-pos={pos}>
                  P{pos}
                </span>
                <span style={{ flex: 1 }} />
                <Avatar name={p.name} size={40} style={{ boxShadow: `0 0 0 2px ${pos === 1 ? 'var(--fs-secondary)' : 'var(--fs-surface-elevated)'}` }} />
                <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.25 }}>{p.name}</span>
                <span style={{ fontSize: 11, lineHeight: 1.25 }} className="fs-muted">
                  {p.car}
                </span>
                <span className="fs-num" style={{ fontSize: 22, lineHeight: 1 }}>
                  {p[key]} PTS
                </span>
              </div>
            ))}
          </div>
          <div role="list" style={{ display: 'flex', flexDirection: 'column' }}>
            {pool.slice(3).map((p, i) => {
              const mine = p.name === ME;
              return (
                <div key={p.name} role="listitem" className={s.row} data-me={mine || undefined}>
                  <span className="fs-num" style={{ fontSize: 20 }}>
                    {i + 4}
                  </span>
                  <Variation delta={p[dk]} />
                  <Avatar name={p.name} />
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span className={s.ellipsis} style={{ fontSize: 14, fontWeight: 500 }}>
                      {mine ? `${p.name} (você)` : p.name}
                    </span>
                    <span className={`${s.ellipsis} fs-caption`}>{scope === 'geral' ? `${p.cat} · ${p.car}` : p.car}</span>
                  </span>
                  <span className="fs-num" style={{ fontSize: 18 }}>
                    {p[key]}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
      {hasData && me && (
        <div className={s.me}>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span className={s.meKicker}>Sua posição</span>
            <span className="fs-num" style={{ fontSize: 24, lineHeight: 1 }}>
              {meIdx + 1}º
            </span>
          </span>
          <Avatar name={ME} />
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{ME}</span>
            <span style={{ fontSize: 12, display: 'flex', gap: 4, alignItems: 'center' }} className={`fs-var fs-var--${variation(meDelta).dir}`}>
              <Icon name={variation(meDelta).icon} weight={meDelta ? 'bold' : 'regular'} size={11} />
              {meDelta > 0 ? `Subiu ${meDelta} ${meDelta > 1 ? 'posições' : 'posição'}` : meDelta < 0 ? `Caiu ${-meDelta}` : 'Sem variação'}
            </span>
          </span>
          <span className="fs-num" style={{ fontSize: 20 }}>
            {me[key]} PTS
          </span>
        </div>
      )}
    </Screen>
  );
}
