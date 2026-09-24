export interface MapItem {
  id: string;
  dist: number;
  ang: number;
}

export interface PinGroup<T extends MapItem> {
  x: number;
  y: number;
  members: T[];
}

export interface MapGeometry {
  /** Center of the user's position, in px. */
  cx: number;
  cy: number;
  /** Radius (px) that represents the search radius. */
  ringPx: number;
}

/** Pins closer than this (px) are merged into a cluster. */
export const CLUSTER_DISTANCE = 34;

/** Polar (km, degrees) → screen px, scaled so that `radiusKm` maps to `ringPx`. */
export function project(item: { dist: number; ang: number }, radiusKm: number, g: MapGeometry) {
  const scale = g.ringPx / radiusKm;
  const a = (item.ang * Math.PI) / 180;
  return { x: g.cx + Math.cos(a) * item.dist * scale, y: g.cy + Math.sin(a) * item.dist * scale };
}

/**
 * Greedy clustering used by the stylised map: each item joins the first group
 * whose centre is within CLUSTER_DISTANCE, and the centre moves to the midpoint.
 */
export function layoutPins<T extends MapItem>(items: T[], radiusKm: number, g: MapGeometry): PinGroup<T>[] {
  const groups: PinGroup<T>[] = [];
  for (const item of items) {
    if (item.dist > radiusKm) continue;
    const p = project(item, radiusKm, g);
    const hit = groups.find((gr) => Math.hypot(gr.x - p.x, gr.y - p.y) < CLUSTER_DISTANCE);
    if (hit) {
      hit.members.push(item);
      hit.x = (hit.x + p.x) / 2;
      hit.y = (hit.y + p.y) / 2;
    } else {
      groups.push({ x: p.x, y: p.y, members: [item] });
    }
  }
  return groups;
}
