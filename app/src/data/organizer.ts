import type { Category, EventStatus, EventType, LocalType } from '@/domain/types';

export type OrgRegStatus = 'conf' | 'pend' | 'rec' | 'rem';

export interface OrgRegistration {
  id: string;
  name: string;
  city: string;
  car: string;
  cat: Category;
  date: string;
  status: OrgRegStatus;
}

export interface OrgEvent {
  id: string;
  name: string;
  type: EventType;
  date: string;
  local: string;
  localType: LocalType;
  pub: boolean;
  cap: number;
  status: EventStatus;
  /** Events with live registrations (computed from the registration list). */
  live?: boolean;
  filled?: number;
  pending?: number;
  published?: boolean;
}

const P = (id: string, name: string, city: string, car: string, cat: Category, date: string, status: OrgRegStatus): OrgRegistration => ({
  id,
  name,
  city,
  car,
  cat,
  date,
  status,
});

export const seedOrgRegistrations = (): OrgRegistration[] => [
  P('r1', 'Rafael Kowalski', 'Cascavel', 'VW Golf GTI', 'Turbo', '02/09 14:10', 'conf'),
  P('r2', 'Ana Beatriz Moraes', 'Toledo', 'Toyota Supra MK4', 'Turbo', '02/09 15:22', 'conf'),
  P('r3', 'Thiago Nishimura', 'Cascavel', 'Honda Civic Si', 'Turbo', '03/09 09:05', 'conf'),
  P('r4', 'Camila Rocha', 'Curitiba', 'Audi S3', 'Turbo', '04/09 20:41', 'conf'),
  P('r5', 'Diego Farias', 'Cascavel', 'VW Jetta GLI', 'Turbo', '05/09 11:30', 'conf'),
  P('r6', 'Juliana Pacheco', 'Londrina', 'VW Polo GTS', 'Turbo', '06/09 18:02', 'conf'),
  P('r7', 'Marcos Vinícius Lopes', 'Cascavel', 'Ford Mustang GT', 'Turismo', '02/09 16:45', 'conf'),
  P('r8', 'Patrícia Weber', 'Maringá', 'BMW 330i', 'Turismo', '07/09 10:12', 'conf'),
  P('r9', 'Eduardo Sartori', 'Cascavel', 'Toyota Corolla GR', 'Turismo', '08/09 13:33', 'conf'),
  P('r10', 'Letícia Hoffmann', 'Toledo', 'Honda Civic Touring', 'Turismo', '09/09 21:17', 'conf'),
  P('r11', 'Bruno Takahashi', 'Cascavel', 'VW Gol GTI', 'Aspirado', '03/09 08:50', 'conf'),
  P('r12', 'Fernanda Zanella', 'Cascavel', 'Honda Civic Si 2008', 'Aspirado', '10/09 12:04', 'conf'),
  P('r13', 'Gustavo Andreatta', 'Curitiba', 'Peugeot 206 RC', 'Aspirado', '11/09 17:26', 'conf'),
  P('r14', 'Renata Oliveira', 'Cascavel', 'Honda Fit EX', 'Aspirado', '12/09 19:48', 'conf'),
  P('r15', 'Igor Schmitt', 'Cascavel', 'Ford Fiesta ST', 'Turbo', '18/09 09:14', 'pend'),
  P('r16', 'Vanessa Costa', 'Toledo', 'Mazda MX-5', 'Aspirado', '19/09 22:03', 'pend'),
  P('r17', 'Henrique Bortolini', 'Cascavel', 'Chevrolet Camaro SS', 'Turismo', '20/09 07:55', 'pend'),
  P('r18', 'Sofia Mazur', 'Maringá', 'Mini Cooper S', 'Turbo', '21/09 15:40', 'pend'),
  P('r19', 'Paulo Reis', 'Cascavel', 'Chevrolet Opala SS', 'Clássicos', '15/09 10:10', 'rec'),
];

/** The event whose registrations are live in the prototype. */
export const LIVE_EVENT_ID = 'ev3';

export const seedOrgEvents = (): OrgEvent[] => [
  { id: 'ev3', name: 'Track Day Zilmar Beux · Etapa 3', type: 'td', date: 'Sáb, 12 out · 08:00', local: 'Autódromo Zilmar Beux', localType: 'Autódromo', pub: true, cap: 16, status: 'aberto', live: true },
  { id: 'evA', name: 'Noite da Arrancada 201m', type: 'arr', date: 'Sex, 18 out · 19:30', local: 'Pista de Arrancada Cascavel', localType: 'Pista de Arrancada', pub: false, cap: 32, status: 'aberto', filled: 29, pending: 2 },
  { id: 'evD', name: 'Desafio em Pista · Turbo', type: 'des', date: 'Hoje · 14:00', local: 'Autódromo Zilmar Beux', localType: 'Autódromo', pub: true, cap: 24, status: 'andamento', filled: 24, pending: 0 },
  { id: 'ev2', name: 'Track Day Zilmar Beux · Etapa 2', type: 'td', date: 'Sáb, 14 set · 08:00', local: 'Autódromo Zilmar Beux', localType: 'Autódromo', pub: true, cap: 40, status: 'encerrado', filled: 38, pending: 0, published: true },
  { id: 'evR', name: 'Encontro de Verão · Maringá', type: 'enc', date: 'Sem data', local: 'A definir', localType: 'Área Privada', pub: true, cap: 60, status: 'rascunho', filled: 0, pending: 0 },
];

/** Monthly ranking before this event's results, per category. */
export const PRIOR_RANKING: Partial<Record<Category, [string, string, number][]>> = {
  Turbo: [
    ['Leonardo Brandt', 'Subaru WRX STI', 58],
    ['Rafael Kowalski', 'VW Golf GTI', 50],
    ['Camila Rocha', 'Audi S3', 43],
    ['Ana Beatriz Moraes', 'Toyota Supra MK4', 36],
    ['Diego Farias', 'VW Jetta GLI', 30],
    ['Thiago Nishimura', 'Honda Civic Si', 18],
    ['Juliana Pacheco', 'VW Polo GTS', 12],
  ],
  Turismo: [
    ['Patrícia Weber', 'BMW 330i', 50],
    ['Otávio Lemos', 'Chevrolet Cruze', 44],
    ['Marcos Vinícius Lopes', 'Ford Mustang GT', 33],
    ['Eduardo Sartori', 'Toyota Corolla GR', 25],
    ['Letícia Hoffmann', 'Honda Civic Touring', 10],
  ],
  Aspirado: [
    ['Fernanda Zanella', 'Honda Civic Si 2008', 43],
    ['Gustavo Andreatta', 'Peugeot 206 RC', 40],
    ['Bruno Takahashi', 'VW Gol GTI', 36],
    ['Clara Menegatti', 'Renault Clio RS', 25],
    ['Renata Oliveira', 'Honda Fit EX', 8],
  ],
};

export const RESULT_CATEGORIES: Category[] = ['Turbo', 'Turismo', 'Aspirado'];

/** Place search suggestions: [name, city, type, pinX%, pinY%]. */
export const PLACES: [string, string, LocalType, number, number][] = [
  ['Autódromo Zilmar Beux', 'Cascavel, PR', 'Autódromo', 38, 42],
  ['Pista de Arrancada Cascavel', 'Cascavel, PR', 'Pista de Arrancada', 62, 55],
  ['Espaço Lago Azul (área privada)', 'Cascavel, PR', 'Área Privada', 45, 70],
  ['Autódromo Internacional de Curitiba', 'Pinhais, PR', 'Autódromo', 70, 30],
];
