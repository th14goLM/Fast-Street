import { POINTS_BY_POSITION } from './catalog';

/** Points for a finishing index (0-based), honouring manual overrides. */
export const pointsFor = (index: number, override?: number) => (override !== undefined ? override : POINTS_BY_POSITION[index] ?? 0);

export interface PriorEntry {
  name: string;
  car: string;
  points: number;
}

export interface UpdatedRow {
  pos: number;
  name: string;
  car: string;
  gain: number;
  total: number;
  /** Positions gained (+) or lost (−) versus the previous ranking. */
  delta: number;
}

/**
 * Applies an event's gains to the previous ranking and computes the position
 * variation of every pilot. Pilots new to the ranking start from 0 points.
 */
export function applyResults(prior: PriorEntry[], gains: { name: string; car: string; points: number }[]): UpdatedRow[] {
  const pool = prior.map((p) => ({ ...p }));
  for (const g of gains) if (!pool.some((p) => p.name === g.name)) pool.push({ name: g.name, car: g.car, points: 0 });
  const oldOrder = [...pool].sort((a, b) => b.points - a.points).map((p) => p.name);
  const gainOf = new Map(gains.map((g) => [g.name, g.points]));
  return pool
    .map((p) => ({ ...p, gain: gainOf.get(p.name) ?? 0 }))
    .map((p) => ({ ...p, total: p.points + p.gain }))
    .sort((a, b) => b.total - a.total)
    .map((p, i) => ({ pos: i + 1, name: p.name, car: p.car, gain: p.gain, total: p.total, delta: oldOrder.indexOf(p.name) - i }));
}

export const variation = (d: number) => ({
  dir: d > 0 ? 'up' : d < 0 ? 'down' : 'same',
  icon: d > 0 ? 'arrow-up' : d < 0 ? 'arrow-down' : 'minus',
  n: d ? String(Math.abs(d)) : '',
});
