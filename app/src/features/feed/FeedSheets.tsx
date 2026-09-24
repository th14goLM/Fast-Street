import { useEffect, useState } from 'react';
import { Icon } from '@/ui/Icon';
import { Button, Chip, Segmented } from '@/ui/controls';
import { Input } from '@/ui/form';
import { Title } from '@/ui/display';
import { BottomSheet } from '@/ui/overlays';
import { CITIES } from '@/domain/catalog';
import { CATEGORIES, type Category } from '@/domain/types';
import { useApp } from '@/store/app';

export type DateFilter = 'any' | 'week' | 'month';

export interface FeedFilters {
  cats: Category[];
  date: DateFilter;
  dist: number;
}

export const DEFAULT_FILTERS: FeedFilters = { cats: [], date: 'any', dist: 50 };

export const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'any', label: 'Qualquer data' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mês' },
];

export const countFilters = (f: FeedFilters) => f.cats.length + (f.date !== 'any' ? 1 : 0) + (f.dist !== DEFAULT_FILTERS.dist ? 1 : 0);

/** UC-22 · Filters bottom sheet (draft is applied only on "Aplicar"). */
export function FiltersSheet({ open, onClose, initial, onApply }: { open: boolean; onClose: () => void; initial: FeedFilters; onApply: (f: FeedFilters) => void }) {
  const [draft, setDraft] = useState(initial);
  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);
  const n = countFilters(draft);

  return (
    <BottomSheet open={open} onClose={onClose} label="Filtros" elevated>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title as="h3" size={26} lh={1}>
          Filtros
        </Title>
        <span style={{ fontSize: 13, color: 'var(--fs-primary-text)' }}>{n} ativos</span>
      </div>
      <div className="fs-field" style={{ gap: 8 }}>
        <span className="fs-field__label">Categoria</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              on={draft.cats.includes(c)}
              style={{ padding: '0 12px' }}
              onClick={() => setDraft((d) => ({ ...d, cats: d.cats.includes(c) ? d.cats.filter((x) => x !== c) : [...d.cats, c] }))}
            >
              {c}
            </Chip>
          ))}
        </div>
      </div>
      <div className="fs-field" style={{ gap: 8 }}>
        <span className="fs-field__label">Data</span>
        <Segmented block label="Data" value={draft.date} onChange={(date) => setDraft((d) => ({ ...d, date }))} options={DATE_OPTIONS} />
      </div>
      <div className="fs-field" style={{ gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="fs-field__label">Distância</span>
          <span style={{ fontSize: 13, fontWeight: 500 }}>até {draft.dist} km</span>
        </div>
        <input type="range" min={5} max={200} step={5} value={draft.dist} aria-label="Distância máxima" onChange={(e) => setDraft((d) => ({ ...d, dist: +e.target.value }))} style={{ width: '100%' }} />
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <Button variant="ghost" size="md" onClick={() => setDraft(DEFAULT_FILTERS)} style={{ fontSize: 14, padding: '0 16px' }}>
          Limpar
        </Button>
        <Button size="md" style={{ flex: 1, fontSize: 14 }} onClick={() => onApply(draft)}>
          Aplicar filtros ({n})
        </Button>
      </div>
    </BottomSheet>
  );
}

/** "Alterar local": manual city or back to GPS. */
export function CitySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const place = useApp((s) => s.place);
  const [q, setQ] = useState('');
  const pick = (city: string, gps: boolean) => {
    useApp.getState().setPlace({ city, gps });
    if (gps) useApp.getState().setLocation('granted');
    setQ('');
    onClose();
  };
  const cities = CITIES.filter((c) => c.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <BottomSheet open={open} onClose={onClose} label="Alterar local" elevated>
      <Title as="h3" size={26} lh={1}>
        Alterar local
      </Title>
      <Input icon="magnifying-glass" placeholder="Buscar cidade" aria-label="Buscar cidade" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 42 }} />
      <button type="button" onClick={() => pick('Cascavel', true)} style={{ minHeight: 52, padding: '0 4px', border: 0, background: 'transparent', color: 'var(--fs-primary-text)', display: 'flex', gap: 10, alignItems: 'center', font: '500 15px var(--fs-font-body)', cursor: 'pointer' }}>
        <Icon name="navigation-arrow" weight="fill" size={18} />
        Usar minha localização atual
      </button>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {cities.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => pick(c, false)}
            style={{ minHeight: 52, border: 0, boxShadow: 'inset 0 -1px 0 var(--fs-line)', background: 'transparent', color: 'var(--fs-text)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', font: '15px var(--fs-font-body)', cursor: 'pointer', padding: '0 4px' }}
          >
            {c}, PR
            {place.city === c && !place.gps && <Icon name="check" weight="bold" color="var(--fs-primary-text)" />}
          </button>
        ))}
        {!cities.length && <span className="fs-caption" style={{ padding: '12px 4px' }}>Nenhuma cidade atendida com esse nome no MVP Paraná.</span>}
      </div>
    </BottomSheet>
  );
}
