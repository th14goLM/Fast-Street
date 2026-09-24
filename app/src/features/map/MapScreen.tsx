import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@/ui/Icon';
import { Button } from '@/ui/controls';
import { Overline, Tag, Title, VacancyBar, VisibilityBadge, VerifiedSeal } from '@/ui/display';
import { ImageSlot } from '@/ui/ImageSlot';
import { OfflineBanner } from '@/ui/feedback';
import { BottomSheet, RouteSheet } from '@/ui/overlays';
import { EVENTS, MAP_CITIES, PARTNERS } from '@/data/events';
import { EVENT_TYPES, LOCAL_ICON } from '@/domain/catalog';
import { km, plural } from '@/domain/format';
import { layoutPins, project, type MapGeometry } from '@/domain/mapLayout';
import type { EventItem, EventType } from '@/domain/types';
import { cx } from '@/lib/cx';
import { useLoad } from '@/lib/network';
import { toast } from '@/lib/toast';
import { useElementSize } from '@/lib/useElementSize';
import { useApp } from '@/store/app';
import { CitySheet } from '@/features/feed/FeedSheets';
import { useEventCta } from '@/features/events/useEventCta';
import s from './map.module.css';

type MapEntry = { id: string; dist: number; ang: number; kind: 'event'; event: EventItem } | { id: string; dist: number; ang: number; kind: 'partner'; name: string; info: string };

const ENTRIES: MapEntry[] = [
  ...EVENTS.filter((e) => e.status !== 'encerrado').map((e) => ({ id: e.id, dist: e.dist, ang: e.ang, kind: 'event' as const, event: e })),
  ...PARTNERS.map((p) => ({ id: p.id, dist: p.dist, ang: p.ang, kind: 'partner' as const, name: p.name, info: p.info })),
];

const TYPE_FILTERS: { id: 'all' | EventType; label: string; icon: string }[] = [
  { id: 'all', label: 'Todos', icon: 'squares-four' },
  { id: 'td', label: 'Track Day', icon: EVENT_TYPES.td.icon },
  { id: 'arr', label: 'Arrancada', icon: EVENT_TYPES.arr.icon },
  { id: 'des', label: 'Desafio', icon: EVENT_TYPES.des.icon },
  { id: 'enc', label: 'Encontro', icon: EVENT_TYPES.enc.icon },
];

/** UC-04 · Stylised map with radius, pins and clusters; UC-23 · pin bottom sheet. */
export function MapScreen() {
  const navigate = useNavigate();
  const load = useLoad('map');
  const location = useApp((st) => st.location);
  const place = useApp((st) => st.place);
  const [ref, size] = useElementSize<HTMLDivElement>();
  const [radius, setRadius] = useState(15);
  const [type, setType] = useState<'all' | EventType>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [cluster, setCluster] = useState<string[] | null>(null);
  const [citySheet, setCitySheet] = useState(false);

  const noPerm = location === 'denied' && place.gps;
  const showMap = !noPerm && load.status === 'ready';

  const geo: MapGeometry = { cx: size.width / 2, cy: size.height * 0.48, ringPx: Math.min(150, size.width * 0.385) };
  const visible = ENTRIES.filter((e) => type === 'all' || (e.kind === 'event' && e.event.type === type));
  const groups = useMemo(() => (showMap && size.width ? layoutPins(visible, radius, geo) : []), [showMap, size.width, size.height, radius, type]); // eslint-disable-line react-hooks/exhaustive-deps
  const eventCount = groups.reduce((n, g) => n + g.members.filter((m) => m.kind === 'event').length, 0);
  const cities = showMap && size.width ? MAP_CITIES.filter((c) => c.dist <= radius * 1.5).map((c) => ({ ...c, ...project(c, radius, geo) })).filter((c) => Math.hypot(c.x - geo.cx, c.y - geo.cy) > 30) : [];

  const selEvent = ENTRIES.find((e) => e.id === selected && e.kind === 'event') as Extract<MapEntry, { kind: 'event' }> | undefined;
  const clusterEntries = cluster ? ENTRIES.filter((e) => cluster.includes(e.id)) : [];

  const tapEntry = (e: MapEntry) => {
    if (e.kind === 'partner') return toast(`${e.name} · ${e.info}`, { tone: 'info' });
    setCluster(null);
    setSelected(e.id);
  };

  return (
    <section className={s.screen} aria-label="Mapa">
      <div ref={ref} className={s.map}>
        <svg className={s.roads} viewBox="0 0 390 844" preserveAspectRatio="none" aria-hidden>
          <path d="M-20 250 C 80 220, 140 300, 220 270 S 360 210, 420 240" stroke="#1E2E39" strokeWidth="1.2" fill="none" />
          <path d="M-20 330 C 60 300, 150 380, 240 350 S 350 300, 420 320" stroke="#1E2E39" strokeWidth="1.2" fill="none" />
          <path d="M-20 560 C 90 520, 160 610, 250 580 S 360 530, 420 560" stroke="#1E2E39" strokeWidth="1.2" fill="none" />
          <path d="M-20 640 C 70 610, 170 690, 260 660 S 360 620, 420 640" stroke="#1E2E39" strokeWidth="1.2" fill="none" />
          <path d="M40 -10 C 70 120, 20 260, 60 420 S 30 700, 70 860" stroke="#1D3140" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M330 -10 C 300 160, 360 300, 320 470 S 350 720, 310 860" stroke="#1D3140" strokeWidth="3" strokeLinecap="round" fill="none" />
        </svg>
        {showMap && size.width > 0 && (
          <>
            <div className={s.ring} style={{ left: geo.cx, top: geo.cy, width: geo.ringPx * 2, height: geo.ringPx * 2 }} />
            <span className={s.ringLabel} style={{ left: geo.cx, top: geo.cy - geo.ringPx - 8 }}>
              {radius} KM
            </span>
            {cities.map((c) => (
              <span key={c.name} className={s.cityLabel} style={{ left: c.x, top: c.y + 22 }}>
                {c.name}
              </span>
            ))}
            {groups.map((g) => {
              const clusterd = g.members.length > 1;
              const first = g.members[0];
              const partner = !clusterd && first.kind === 'partner';
              const isSel = !clusterd && selected === first.id;
              return (
                <button
                  key={g.members.map((m) => m.id).join('-')}
                  type="button"
                  className={cx(s.pin, clusterd && s.pinCluster, partner && s.pinPartner, isSel && s.pinSelected)}
                  style={{ left: g.x, top: g.y }}
                  aria-label={clusterd ? `${g.members.length} itens neste local` : first.kind === 'event' ? first.event.name : first.name}
                  onClick={() => (clusterd ? (setSelected(null), setCluster(g.members.map((m) => m.id))) : tapEntry(first))}
                >
                  <span className={s.pinHead}>
                    <Icon name={clusterd ? 'stack' : first.kind === 'event' ? EVENT_TYPES[first.event.type].icon : 'wrench'} weight={clusterd ? 'fill' : 'regular'} size={17} />
                    {clusterd && g.members.length}
                  </span>
                  <span className={s.pinTail} />
                </button>
              );
            })}
            <div className={s.me} style={{ left: geo.cx, top: geo.cy }} aria-label="Você está aqui" />
          </>
        )}
      </div>

      <div className={s.top}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className={s.searchBtn} onClick={() => setCitySheet(true)}>
            <Icon name="map-pin" size={20} color="var(--fs-primary-text)" />
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 11 }} className="fs-muted">
                Buscando perto de
              </span>
              <span style={{ font: '500 14px var(--fs-font-body)' }}>{noPerm ? 'Local não definido' : `${place.city}, PR`}</span>
            </span>
            <span style={{ font: '500 13px var(--fs-font-body)', color: 'var(--fs-primary-text)' }}>Alterar</span>
          </button>
          <Link to="/feed" className={s.glassBtn} aria-label="Ver lista">
            <Icon name="list-bullets" size={20} />
          </Link>
        </div>
        <div className={s.types} role="radiogroup" aria-label="Tipo de evento">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={type === t.id}
              className={s.typeChip}
              onClick={() => {
                setType(t.id);
                setSelected(null);
                setCluster(null);
              }}
            >
              <Icon name={t.icon} size={14} />
              {t.label}
            </button>
          ))}
        </div>
        {load.offline && showMap && <OfflineBanner solid updated="há 18 min" />}
      </div>

      {!noPerm && load.status === 'loading' && (
        <div className={s.loading} aria-busy="true">
          <span style={{ left: '28%', top: '35%' }} />
          <span style={{ left: '59%', top: '43%' }} />
          <span style={{ left: '44%', top: '58%', width: 44, height: 44 }} />
          <span style={{ left: '67%', top: '64%' }} />
          <div className={s.loadingLabel}>
            <Icon name="circle-notch" size={16} className="fs-spin" style={{ animation: 'fs-spin .9s linear infinite' }} />
            Carregando eventos…
          </div>
        </div>
      )}

      {noPerm && (
        <div className={cx('fs-card fs-elev-lg', s.floatCard)} style={{ top: '34%', flexDirection: 'column', gap: 12 }}>
          <div className="fs-icon-tile fs-icon-tile--sm">
            <Icon name="map-pin-simple-slash" />
          </div>
          <Title as="h3" size={26} lh={1}>
            Onde você está?
          </Title>
          <p style={{ fontSize: 14, lineHeight: 1.5 }} className="fs-body">
            Permita a localização ou escolha uma cidade para ver eventos e parceiros próximos. Sua posição nunca é exibida para outros usuários.
          </p>
          <Button size="md" onClick={() => useApp.getState().setLocation('granted')}>
            Permitir localização
          </Button>
          <Button variant="secondary" onClick={() => setCitySheet(true)}>
            Definir local manualmente
          </Button>
        </div>
      )}

      {!noPerm && load.status === 'error' && (
        <div className={cx('fs-card fs-elev-lg', s.floatCard)} style={{ top: '38%' }}>
          <Icon name="cloud-warning" size={26} color="var(--fs-danger-text)" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            <span style={{ fontSize: 15, fontWeight: 500 }}>Não foi possível carregar o mapa</span>
            <span style={{ fontSize: 13 }} className="fs-muted">
              Verifique sua conexão e tente de novo.
            </span>
            <Button variant="secondary" icon="arrow-clockwise" iconSize={15} style={{ alignSelf: 'flex-start' }} onClick={load.retry}>
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      {showMap && size.width > 0 && eventCount === 0 && (
        <div className={cx('fs-card fs-elev-md', s.floatCard)} style={{ bottom: 104, padding: 16, alignItems: 'center' }}>
          <Icon name="magnifying-glass" size={24} color="var(--fs-text-secondary)" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Nenhum evento em {radius} km</span>
            <span className="fs-caption">Amplie o raio ou limpe o filtro de tipo.</span>
          </div>
          <Button
            size="default"
            style={{ padding: '0 12px', fontSize: 13 }}
            onClick={() => {
              setType('all');
              setRadius((r) => (r < 50 ? 50 : 200));
            }}
          >
            Ampliar
          </Button>
        </div>
      )}

      {!noPerm && load.status !== 'error' && (
        <div className={s.radius}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="fs-caption">Raio de busca</span>
            <span className="fs-num" style={{ fontSize: 18, lineHeight: 1 }}>
              {radius} KM · <span style={{ color: 'var(--fs-primary-text)' }}>{plural(eventCount, 'evento', 'eventos')}</span>
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={200}
            step={5}
            value={radius}
            aria-label="Raio de busca em km"
            onChange={(e) => {
              setRadius(+e.target.value);
              setSelected(null);
              setCluster(null);
            }}
            style={{ width: '100%', height: 28, margin: 0 }}
          />
          <div className={s.legend}>
            <span>5 km</span>
            <span style={{ display: 'flex', gap: 10 }}>
              <span>
                <Icon name="flag-checkered" /> Eventos
              </span>
              <span>
                <Icon name="wrench" /> Parceiros
              </span>
            </span>
            <span>200 km</span>
          </div>
        </div>
      )}

      <BottomSheet open={!!cluster} onClose={() => setCluster(null)} label="Itens neste local">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Title as="h3" size={24} lh={1}>
            {clusterEntries.length} itens neste local
          </Title>
          <span className="fs-caption">Toque para ver</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {clusterEntries.map((c) => (
            <button key={c.id} type="button" className="fs-row" style={{ boxShadow: 'inset 0 -1px 0 var(--fs-surface-elevated)' }} onClick={() => tapEntry(c)}>
              <span className="fs-icon-tile" style={{ width: 40, height: 40, borderRadius: 12, fontSize: 20, color: c.kind === 'partner' ? 'var(--fs-secondary)' : 'var(--fs-primary-text)' }}>
                <Icon name={c.kind === 'event' ? EVENT_TYPES[c.event.type].icon : 'wrench'} />
              </span>
              <span className="fs-row__main">
                <span className="fs-row__title">{c.kind === 'event' ? c.event.name : c.name}</span>
                <span className="fs-row__sub">{c.kind === 'event' ? `${EVENT_TYPES[c.event.type].label} · ${c.event.dateLabel}` : c.info}</span>
              </span>
              <Icon name="caret-right" size={16} />
            </button>
          ))}
        </div>
      </BottomSheet>

      <EventPinSheet event={selEvent?.event} onClose={() => setSelected(null)} onDetails={(id) => navigate(`/eventos/${id}`)} />
      <CitySheet open={citySheet} onClose={() => setCitySheet(false)} />
    </section>
  );
}

/** UC-23 · Bottom sheet opened from a pin. */
function EventPinSheet({ event, onClose, onDetails }: { event?: EventItem; onClose: () => void; onDetails: (id: string) => void }) {
  const cta = useEventCta(event, '/mapa');
  const [route, setRoute] = useState(false);
  return (
    <>
      <BottomSheet open={!!event} onClose={onClose} label={event?.name ?? 'Evento'}>
        {event && (
          <>
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{ width: 88, height: 88, flex: 'none', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
                <ImageSlot id={`ev-${event.id}`} placeholder="Capa" />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <Overline>{EVENT_TYPES[event.type].label}</Overline>
                <span className="fs-display" style={{ fontSize: 24, lineHeight: 1.02 }}>
                  {event.name}
                </span>
                <VerifiedSeal size={12}>{event.org}</VerifiedSeal>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }} className="fs-body">
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Icon name="calendar-blank" size={16} color="var(--fs-text-secondary)" />
                {event.dateLabel}
              </span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Icon name={LOCAL_ICON[event.localType]} size={16} color="var(--fs-secondary)" />
                {event.localType} · {event.local} <span className="fs-muted">· {km(event.dist)}</span>
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <VisibilityBadge pub={event.pub} small />
              {event.cats.map((c) => (
                <Tag key={c}>{c}</Tag>
              ))}
            </div>
            <VacancyBar left={cta.left} total={event.total} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="fs-btn fs-btn--secondary fs-btn--lg" aria-label="Abrir no Maps/Waze" style={{ width: 52, padding: 0, flex: 'none' }} onClick={() => setRoute(true)}>
                <Icon name="navigation-arrow" size={20} />
              </button>
              <Button variant="secondary" size="lg" style={{ flex: 1, padding: '0 8px' }} onClick={() => onDetails(event.id)}>
                Ver detalhes
              </Button>
              <Button variant={cta.view.variant} size="lg" icon={cta.view.icon} iconWeight={cta.view.iconWeight} disabled={cta.view.disabled} style={{ flex: 1.3, padding: '0 8px' }} onClick={cta.start}>
                {cta.view.label}
              </Button>
            </div>
          </>
        )}
      </BottomSheet>
      <RouteSheet open={route} onClose={() => setRoute(false)} place={event?.local ?? ''} />
    </>
  );
}
