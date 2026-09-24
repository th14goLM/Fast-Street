export const CATEGORIES = ['Street Legal', 'Turismo', 'Aspirado', 'Turbo', 'Clássicos'] as const;
export type Category = (typeof CATEGORIES)[number];

export type EventType = 'td' | 'arr' | 'des' | 'enc';
export type LocalType = 'Autódromo' | 'Pista de Arrancada' | 'Área Privada';
export type EventStatus = 'rascunho' | 'aberto' | 'andamento' | 'encerrado' | 'cancelado';

export interface EventResultRow {
  name: string;
  car: string;
  pts: number;
  me?: boolean;
}

export interface EventItem {
  id: string;
  type: EventType;
  name: string;
  /** "Sáb, 12 out · 08:00" */
  dateLabel: string;
  /** "Sábado, 12 de outubro" */
  dateLong: string;
  /** "08:00 às 17:00 · briefing 07:30" */
  timeLabel: string;
  weekday: string;
  day: string;
  inWeek: boolean;
  local: string;
  localType: LocalType;
  city: string;
  /** Distance from the user in km. */
  dist: number;
  /** Bearing used by the stylised map, in degrees. */
  ang: number;
  pub: boolean;
  cats: Category[];
  left: number;
  total: number;
  org: string;
  orgInitials: string;
  status: EventStatus;
  about: string;
  rules: string[];
  /** Per-category [left, total]. Optional: derived from left/total when absent. */
  vagasPorCat?: Partial<Record<Category, [number, number]>>;
  enrolled: number;
  closedOn?: string;
  results?: {
    publishedOn: string;
    byCat: Partial<Record<Category, EventResultRow[]>>;
    mine?: { cat: Category; pos: number; pts: number; car: string };
  };
}

export interface Partner {
  id: string;
  name: string;
  info: string;
  dist: number;
  ang: number;
}

export interface VehicleHistory {
  name: string;
  date: string;
  cat: Category;
  pos: string;
  pts: number;
}

export interface Vehicle {
  id: string;
  marca: string;
  modelo: string;
  name: string;
  year: string;
  color: string;
  cat: Category;
  main: boolean;
  motor: string;
  pot: string;
  torque: string;
  peso: string;
  trans: string;
  mods: string;
  history: VehicleHistory[];
  /** Local object URLs / data URLs of photos, when the user uploaded real files. */
  photos?: string[];
}

export type RegistrationStatus = 'ok' | 'pending';

export interface Registration {
  status: RegistrationStatus;
  vehicleId: string;
}

export type NotificationType =
  | 'confirmed'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'newEvent'
  | 'reminder'
  | 'result'
  | 'achievement';

export interface AppNotification {
  id: string;
  day: string;
  type: NotificationType;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  /** In-app route opened when the notification is tapped. */
  href: string;
}

export type Perfil = 'piloto' | 'org' | 'ambos';

export interface User {
  name: string;
  email: string;
  city: string;
  perfil: Perfil;
  bio: string;
  instagram: string;
  youtube: string;
  orgName?: string;
}
