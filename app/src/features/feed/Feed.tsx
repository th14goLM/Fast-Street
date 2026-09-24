import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@/ui/Icon';
import { Button, IconButton } from '@/ui/controls';
import { PosBadge, SectionHeader, Title } from '@/ui/display';
import { EmptyState, ErrorCard, OfflineBanner, Skeleton } from '@/ui/feedback';
import { EventCard, EventCardSkeleton } from '@/ui/EventCard';
import { ImageSlot } from '@/ui/ImageSlot';
import { Screen } from '@/layout/Screen';
import { EVENTS, FEED_NEWS } from '@/data/events';
import { FEED_RANK_HIGHLIGHTS } from '@/data/pilot';
import { km } from '@/domain/format';
import { useLoad } from '@/lib/network';
import { spotsLeft, useApp } from '@/store/app';
import { CitySheet, FiltersSheet, countFilters, DATE_OPTIONS, DEFAULT_FILTERS, type FeedFilters } from './FeedSheets';
import s from './feed.module.css';

const NEAR_KM = 15;

/** Events visible in the Feed: open, upcoming, within the filters. */
export function filterEvents(f: FeedFilters) {
  return EVENTS.filter(
    (e) => e.status !== 'encerrado' && e.dist <= f.dist && (!f.cats.length || e.cats.some((c) => f.cats.includes(c))) && (f.date !== 'week' || e.inWeek),
  );
}

/** UC-03 · Feed with UC-22 filters. */
export function Feed() {
  const navigate = useNavigate();
  const load = useLoad('feed');
  const location = useApp((st) => st.location);
  const place = useApp((st) => st.place);
  const unread = useApp((st) => st.notifications.some((n) => n.unread));
  const registrations = useApp((st) => st.registrations);
  const soldOut = useApp((st) => st.soldOut);
  const [filters, setFilters] = useState<FeedFilters>(DEFAULT_FILTERS);
  const [sheet, setSheet] = useState<'filters' | 'city' | null>(null);

  const noPerm = location === 'denied' && place.gps;
  const ready = load.status === 'ready' && !noPerm;
  const match = useMemo(() => filterEvents(filters), [filters]);
  const near = match.filter((e) => e.dist <= NEAR_KM);
  const week = match.filter((e) => e.inWeek);
  const empty = ready && match.length === 0;
  const active = countFilters(filters);

  const activeChips = [
    ...filters.cats.map((c) => ({ label: c, remove: () => setFilters((f) => ({ ...f, cats: f.cats.filter((x) => x !== c) })) })),
    ...(filters.date !== 'any' ? [{ label: DATE_OPTIONS.find((d) => d.value === filters.date)!.label, remove: () => setFilters((f) => ({ ...f, date: 'any' })) }] : []),
    ...(filters.dist !== DEFAULT_FILTERS.dist ? [{ label: `até ${filters.dist} km`, remove: () => setFilters((f) => ({ ...f, dist: DEFAULT_FILTERS.dist })) }] : []),
  ];

  const gps = place.gps && !noPerm;

  return (
    <Screen
      label="Feed"
      header={
        <header className={s.header}>
          <button type="button" className={s.cityBtn} onClick={() => setSheet('city')}>
            <span className={s.cityKicker}>
              <Icon name={gps ? 'navigation-arrow' : 'map-pin'} weight={gps ? 'fill' : 'regular'} size={12} color="var(--fs-primary-text)" />
              {gps ? 'Sua localização' : 'Local escolhido'}
            </span>
            <span className={s.city}>
              {noPerm ? 'Local não definido' : place.city}
              <span className={s.cityChange}>Alterar local</span>
            </span>
          </button>
          <IconButton icon="sliders-horizontal" label="Filtros" active={active > 0} count={active} onClick={() => setSheet('filters')} />
          <IconButton icon="bell" label="Notificações" dot={unread} onClick={() => navigate('/notificacoes')} />
        </header>
      }
      bodyClassName={s.body}
    >
      {load.offline && ready && <OfflineBanner style={{ margin: '0 20px' }} />}
      {active > 0 && ready && (
        <div className={s.activeChips}>
          {activeChips.map((c) => (
            <span key={c.label} className={s.activeChip}>
              {c.label}
              <button type="button" aria-label={`Remover filtro ${c.label}`} onClick={c.remove}>
                <Icon name="x" size={12} />
              </button>
            </span>
          ))}
          <button type="button" className={s.clear} onClick={() => setFilters(DEFAULT_FILTERS)}>
            Limpar
          </button>
        </div>
      )}

      {noPerm && (
        <div className="fs-card" style={{ margin: '0 20px', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="fs-icon-tile fs-icon-tile--sm">
            <Icon name="map-pin-simple-slash" />
          </div>
          <Title as="h3" size={26} lh={1}>
            Mostre eventos perto de você
          </Title>
          <p style={{ fontSize: 14, lineHeight: 1.5 }} className="fs-body">
            Sem acesso à localização não conseguimos calcular distâncias. Permita ou escolha sua cidade.
          </p>
          <Button size="md" onClick={() => useApp.getState().setLocation('granted')}>
            Permitir localização
          </Button>
          <Button variant="secondary" onClick={() => setSheet('city')}>
            Definir local manualmente
          </Button>
        </div>
      )}

      {!noPerm && load.status === 'error' && <ErrorCard style={{ margin: '0 20px' }} title="Não foi possível carregar os eventos" text="Verifique sua conexão e tente de novo." onRetry={load.retry} />}

      {!noPerm && load.status === 'loading' && (
        <section className={s.section} aria-busy="true" aria-label="Carregando eventos">
          <Skeleton w={140} h={22} style={{ margin: '0 20px' }} />
          <div className={s.carousel} style={{ overflow: 'hidden' }}>
            <EventCardSkeleton />
            <EventCardSkeleton />
          </div>
          <Skeleton w={120} h={22} style={{ margin: '12px 20px 0' }} />
          <Skeleton h={56} r={12} style={{ margin: '0 20px', width: 'auto' }} />
          <Skeleton h={56} r={12} style={{ margin: '0 20px', width: 'auto' }} />
        </section>
      )}

      {empty && (
        <EmptyState
          icon="calendar-x"
          title="Nenhum evento encontrado"
          text={`Nada em ${filters.dist} km com os filtros atuais. Tente ampliar a distância ou mudar as categorias.`}
          style={{ margin: '0 20px', padding: '28px 20px', gap: 10 }}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button onClick={() => setFilters(DEFAULT_FILTERS)}>Limpar filtros</Button>
            <Button variant="secondary" onClick={() => setFilters({ ...DEFAULT_FILTERS, dist: 200 })}>
              Ampliar para 200 km
            </Button>
          </div>
        </EmptyState>
      )}

      {ready && near.length > 0 && (
        <section className={s.section}>
          <div style={{ padding: '0 20px' }}>
            <SectionHeader title="Perto de você" action={<Link to="/mapa" style={{ fontSize: 13 }}>Ver no mapa</Link>} />
          </div>
          <div className={s.carousel}>
            {near.map((e) => (
              <EventCard key={e.id} event={e} left={spotsLeft(e.id, { registrations, soldOut })} />
            ))}
          </div>
        </section>
      )}

      {ready && week.length > 0 && (
        <section className={s.section} style={{ padding: '0 20px', gap: 0 }}>
          <Title as="h3" size={26} lh={1} style={{ marginBottom: 8 }}>
            Esta semana
          </Title>
          {week.map((e) => (
            <Link key={e.id} to={`/eventos/${e.id}`} className={s.weekRow}>
              <span className={s.weekDate}>
                <span className={s.weekDay}>{e.weekday}</span>
                <span className="fs-num" style={{ fontSize: 28, lineHeight: 1 }}>
                  {e.day}
                </span>
              </span>
              <span className="fs-row__main" style={{ gap: 3 }}>
                <span style={{ fontSize: 15, fontWeight: 500 }}>{e.name}</span>
                <span className="fs-row__sub">
                  {e.localType} · {km(e.dist)} · {e.pub ? 'Público' : 'Requer aprovação'}
                </span>
              </span>
              <Icon name="caret-right" size={18} color="var(--fs-text-secondary)" />
            </Link>
          ))}
        </section>
      )}

      {ready && !empty && (
        <section className={s.section}>
          <div style={{ padding: '0 20px' }}>
            <SectionHeader title="Destaques do ranking" action={<Link to="/ranking" style={{ fontSize: 13 }}>Ranking</Link>} />
          </div>
          <div className="fs-card" style={{ margin: '0 20px', padding: '6px 14px' }}>
            {FEED_RANK_HIGHLIGHTS.map((r, i) => (
              <div key={r.name} className={s.rankRow} style={{ boxShadow: i < FEED_RANK_HIGHLIGHTS.length - 1 ? 'inset 0 -1px 0 var(--fs-surface-elevated)' : 'none' }}>
                <PosBadge pos={1} style={{ justifySelf: 'start' }} />
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{r.name}</span>
                  <span className="fs-caption">
                    {r.cat} · {r.car}
                  </span>
                </span>
                <span className="fs-num" style={{ fontSize: 18 }}>
                  {r.pts} PTS
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {ready && !empty && (
        <section className={s.section} style={{ padding: '0 20px' }}>
          <Title as="h3" size={26} lh={1}>
            Novidades
          </Title>
          {FEED_NEWS.map((n) => (
            <Link key={n.id} to={n.href} className={s.news}>
              <div className={s.newsMedia}>
                <ImageSlot id={`news-${n.id}`} placeholder={n.image} />
              </div>
              <div className={s.newsBody}>
                <span className="fs-overline fs-overline--secondary" style={{ fontSize: 11 }}>
                  {n.kicker}
                </span>
                <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.35 }}>{n.title}</span>
                <span className="fs-caption">{n.meta}</span>
              </div>
            </Link>
          ))}
        </section>
      )}

      <FiltersSheet
        open={sheet === 'filters'}
        onClose={() => setSheet(null)}
        initial={filters}
        onApply={(f) => {
          setFilters(f);
          setSheet(null);
        }}
      />
      <CitySheet open={sheet === 'city'} onClose={() => setSheet(null)} />
    </Screen>
  );
}
