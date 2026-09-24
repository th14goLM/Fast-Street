import type { Category, EventItem, Registration, Vehicle } from './types';

export type Tone = 'ok' | 'low' | 'full';

export interface VacancyInfo {
  label: string;
  count: string;
  /** Filled percentage, for the progress bar. */
  pct: number;
  tone: Tone;
}

export const LOW_VACANCY = 5;

export function vacancy(left: number, total: number): VacancyInfo {
  const tone: Tone = left <= 0 ? 'full' : left <= LOW_VACANCY ? 'low' : 'ok';
  return {
    label: tone === 'full' ? 'Vagas esgotadas' : tone === 'low' ? 'Últimas vagas' : 'Vagas restantes',
    count: `${Math.max(0, left)} de ${total}`,
    pct: Math.round(((total - Math.max(0, left)) / total) * 100),
    tone,
  };
}

export const TONE_TEXT: Record<Tone, string> = {
  ok: 'var(--fs-text-secondary)',
  low: 'var(--fs-warning-text)',
  full: 'var(--fs-danger-text)',
};
export const TONE_BAR: Record<Tone, string> = {
  ok: 'var(--fs-primary)',
  low: 'var(--fs-warning)',
  full: 'var(--fs-danger)',
};

/** Per-category vacancies; when the event does not specify them, spread left/total evenly. */
export function vacanciesByCategory(e: EventItem): [Category, number, number][] {
  if (e.vagasPorCat) {
    return e.cats.filter((c) => e.vagasPorCat![c]).map((c) => [c, ...e.vagasPorCat![c]!] as [Category, number, number]);
  }
  const n = e.cats.length;
  return e.cats.map((c, i) => {
    const total = Math.floor(e.total / n) + (i < e.total % n ? 1 : 0);
    const left = Math.floor(e.left / n) + (i < e.left % n ? 1 : 0);
    return [c, left, total];
  });
}

export const compatibleVehicles = (e: EventItem, vehicles: Vehicle[]) => vehicles.filter((v) => e.cats.includes(v.cat));

export type CtaState = 'open' | 'pending' | 'confirmed' | 'full' | 'closed';

/** Primary action on an event: depends on the registration and on the event status. */
export function eventCta(e: EventItem, reg: Registration | undefined, left: number): CtaState {
  if (e.status === 'encerrado') return 'closed';
  if (reg?.status === 'ok') return 'confirmed';
  if (reg?.status === 'pending') return 'pending';
  if (left <= 0) return 'full';
  return 'open';
}

export type RegistrationBlocker = 'noveh' | 'incompat' | null;

/** Why a registration cannot start with the pilot's main vehicle, if anything. */
export function registrationBlocker(e: EventItem, vehicles: Vehicle[]): RegistrationBlocker {
  if (!vehicles.length) return 'noveh';
  const main = vehicles.find((v) => v.main) ?? vehicles[0];
  if (!e.cats.includes(main.cat)) return 'incompat';
  return null;
}
