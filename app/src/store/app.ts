import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEMO_USER, NOTIFICATION_PREFS, seedNotifications, seedVehicles } from '@/data/pilot';
import { EVENTS } from '@/data/events';
import type { AppNotification, Registration, RegistrationStatus, User, Vehicle } from '@/domain/types';

export type Permission = 'unknown' | 'granted' | 'denied';
export type Mode = 'piloto' | 'org';

export interface AppState {
  signedIn: boolean;
  /** Onboarding carousel already seen on this device. */
  onboarded: boolean;
  user: User;
  mode: Mode;
  location: Permission;
  notificationsPermission: Permission;
  /** Search origin: GPS or a city chosen manually. */
  place: { city: string; gps: boolean };
  vehicles: Vehicle[];
  registrations: Record<string, Registration>;
  /** Events whose last spots were taken while the pilot was reviewing. */
  soldOut: Record<string, true>;
  notifications: AppNotification[];
  notifPrefs: Record<string, boolean>;

  signIn: (user?: Partial<User>, opts?: { withDemoData?: boolean }) => void;
  signOut: () => void;
  setOnboarded: () => void;
  updateUser: (patch: Partial<User>) => void;
  setMode: (mode: Mode) => void;
  setLocation: (p: Permission) => void;
  setNotificationsPermission: (p: Permission) => void;
  setPlace: (place: { city: string; gps: boolean }) => void;

  addVehicle: (v: Omit<Vehicle, 'id' | 'main' | 'history'>) => Vehicle;
  updateVehicle: (id: string, patch: Partial<Vehicle>) => void;
  removeVehicle: (id: string) => void;
  makeMain: (id: string) => void;

  register: (eventId: string, vehicleId: string, status: RegistrationStatus) => void;
  cancelRegistration: (eventId: string) => void;
  markSoldOut: (eventId: string) => void;

  pushNotification: (n: Omit<AppNotification, 'id' | 'day' | 'time' | 'unread'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  toggleNotifPref: (id: string) => void;

  resetDemo: () => void;
}

const initialData = () => ({
  signedIn: false,
  onboarded: false,
  user: DEMO_USER,
  mode: 'piloto' as Mode,
  location: 'unknown' as Permission,
  notificationsPermission: 'unknown' as Permission,
  place: { city: 'Cascavel', gps: true },
  vehicles: seedVehicles(),
  registrations: {} as Record<string, Registration>,
  soldOut: {} as Record<string, true>,
  notifications: seedNotifications(),
  notifPrefs: Object.fromEntries(NOTIFICATION_PREFS.map((n) => [n.id, n.on])),
});

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialData(),

      signIn: (user, opts = { withDemoData: true }) =>
        set((s) => ({
          signedIn: true,
          onboarded: true,
          user: { ...DEMO_USER, ...user },
          vehicles: opts.withDemoData ? seedVehicles() : [],
          location: opts.withDemoData ? 'granted' : s.location,
        })),
      signOut: () => set({ signedIn: false }),
      setOnboarded: () => set({ onboarded: true }),
      updateUser: (patch) => set((s) => ({ user: { ...s.user, ...patch } })),
      setMode: (mode) => set({ mode }),
      setLocation: (location) => set({ location }),
      setNotificationsPermission: (notificationsPermission) => set({ notificationsPermission }),
      setPlace: (place) => set({ place }),

      addVehicle: (v) => {
        const vehicle: Vehicle = { ...v, id: `v${Date.now()}`, main: get().vehicles.length === 0, history: [] };
        set((s) => ({ vehicles: [...s.vehicles, vehicle] }));
        return vehicle;
      },
      updateVehicle: (id, patch) => set((s) => ({ vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, ...patch } : v)) })),
      removeVehicle: (id) =>
        set((s) => {
          const rest = s.vehicles.filter((v) => v.id !== id);
          if (rest.length && !rest.some((v) => v.main)) rest[0] = { ...rest[0], main: true };
          return { vehicles: rest };
        }),
      makeMain: (id) => set((s) => ({ vehicles: s.vehicles.map((v) => ({ ...v, main: v.id === id })) })),

      register: (eventId, vehicleId, status) =>
        set((s) => ({ registrations: { ...s.registrations, [eventId]: { status, vehicleId } } })),
      cancelRegistration: (eventId) =>
        set((s) => {
          const next = { ...s.registrations };
          delete next[eventId];
          return { registrations: next };
        }),
      markSoldOut: (eventId) => set((s) => ({ soldOut: { ...s.soldOut, [eventId]: true } })),

      pushNotification: (n) =>
        set((s) => {
          const now = new Date();
          const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          return { notifications: [{ ...n, id: `n${now.getTime()}`, day: 'Hoje', time, unread: true }, ...s.notifications] };
        }),
      markRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, unread: false } : n)) })),
      markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, unread: false })) })),
      toggleNotifPref: (id) => set((s) => ({ notifPrefs: { ...s.notifPrefs, [id]: !s.notifPrefs[id] } })),

      resetDemo: () => set(initialData()),
    }),
    {
      name: 'fast-street:app',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** Spots left for an event, accounting for the pilot's own registration and sell-outs. */
export function spotsLeft(eventId: string, s: Pick<AppState, 'registrations' | 'soldOut'>) {
  const e = EVENTS.find((x) => x.id === eventId);
  if (!e) return 0;
  if (s.soldOut[eventId]) return 0;
  return e.left - (s.registrations[eventId] ? 1 : 0);
}

export const mainVehicle = (vehicles: Vehicle[]) => vehicles.find((v) => v.main) ?? vehicles[0];
