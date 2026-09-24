import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { LIVE_EVENT_ID, RESULT_CATEGORIES, seedOrgEvents, seedOrgRegistrations, type OrgEvent, type OrgRegStatus, type OrgRegistration } from '@/data/organizer';
import type { Category } from '@/domain/types';

export interface OrganizerState {
  events: OrgEvent[];
  regs: OrgRegistration[];
  /** Finishing order per category (registration ids). */
  order: Partial<Record<Category, string[]>> | null;
  /** Manual point overrides per registration id. */
  pts: Record<string, number>;
  awards: Record<string, string[]>;

  addEvent: (e: OrgEvent) => void;
  setRegStatus: (id: string, status: OrgRegStatus) => void;
  closeEvent: (id: string) => void;
  ensureOrder: () => void;
  moveResult: (cat: Category, from: number, to: number) => void;
  setPoints: (id: string, value: number | undefined) => void;
  setAwards: (id: string, awards: string[]) => void;
  publishResults: (eventId: string) => void;
  reset: () => void;
}

const initial = () => ({ events: seedOrgEvents(), regs: seedOrgRegistrations(), order: null, pts: {}, awards: {} });

export const initialOrder = (regs: OrgRegistration[]) =>
  Object.fromEntries(RESULT_CATEGORIES.map((c) => [c, regs.filter((r) => r.status === 'conf' && r.cat === c).map((r) => r.id)])) as Partial<
    Record<Category, string[]>
  >;

export const useOrganizer = create<OrganizerState>()(
  persist(
    (set) => ({
      ...initial(),
      addEvent: (e) => set((s) => ({ events: [e, ...s.events] })),
      setRegStatus: (id, status) => set((s) => ({ regs: s.regs.map((r) => (r.id === id ? { ...r, status } : r)) })),
      closeEvent: (id) =>
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? { ...e, status: 'encerrado' } : e)),
          order: id === LIVE_EVENT_ID ? s.order ?? initialOrder(s.regs) : s.order,
        })),
      ensureOrder: () => set((s) => (s.order ? s : { order: initialOrder(s.regs) })),
      moveResult: (cat, from, to) =>
        set((s) => {
          const order = { ...(s.order ?? initialOrder(s.regs)) };
          const arr = [...(order[cat] ?? [])];
          if (to < 0 || to >= arr.length || from === to) return s;
          const [it] = arr.splice(from, 1);
          arr.splice(to, 0, it);
          order[cat] = arr;
          return { order };
        }),
      setPoints: (id, value) =>
        set((s) => {
          const pts = { ...s.pts };
          if (value === undefined) delete pts[id];
          else pts[id] = Math.max(0, value);
          return { pts };
        }),
      setAwards: (id, awards) => set((s) => ({ awards: { ...s.awards, [id]: awards } })),
      publishResults: (eventId) =>
        set((s) => ({
          events: s.events.map((e) => (e.id === eventId ? { ...e, published: true, filled: s.regs.filter((r) => r.status === 'conf').length } : e)),
        })),
      reset: () => set(initial()),
    }),
    { name: 'fast-street:organizer', version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);

/** Confirmed / pending counts for an organizer event. */
export function eventCounts(e: OrgEvent, regs: OrgRegistration[]) {
  if (e.live) {
    return e.id === LIVE_EVENT_ID
      ? { filled: regs.filter((r) => r.status === 'conf').length, pending: regs.filter((r) => r.status === 'pend').length }
      : { filled: 0, pending: 0 };
  }
  return { filled: e.filled ?? 0, pending: e.pending ?? 0 };
}

export const eventRegs = (eventId: string, regs: OrgRegistration[]) => (eventId === LIVE_EVENT_ID ? regs : []);
