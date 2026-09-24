import type { AppNotification, Category, User, Vehicle } from '@/domain/types';

export const DEMO_USER: User = {
  name: 'Lucas Andrade',
  email: 'lucas.andrade@gmail.com',
  city: 'Cascavel, PR',
  perfil: 'ambos',
  bio: 'Track days desde 2018, foco em Turismo e Turbo.',
  instagram: '@lucas.andrade.tt',
  youtube: '',
  orgName: 'Oeste Track Club',
};

export const seedVehicles = (): Vehicle[] => [
  {
    id: 'civic',
    name: 'Honda Civic Si',
    marca: 'Honda',
    modelo: 'Civic Si',
    year: '2019',
    color: 'Cinza Grafite',
    cat: 'Turbo',
    main: true,
    motor: '1.5 Turbo 16V',
    pot: '205',
    torque: '26,5',
    peso: '1.335',
    trans: 'Manual 6M',
    mods: 'Intake de fibra\nEscape inox 2,5"\nPastilhas de competição',
    history: [
      { name: 'Track Day Zilmar Beux · Etapa 3', date: '12 out', cat: 'Turbo', pos: 'P3', pts: 15 },
      { name: 'Track Day Zilmar Beux · Etapa 2', date: '14 set', cat: 'Turbo', pos: 'P5', pts: 10 },
      { name: 'Desafio em Pista · Turbo', date: '24 ago', cat: 'Turbo', pos: 'P2', pts: 18 },
    ],
  },
  {
    id: 'golf',
    name: 'VW Golf GTI',
    marca: 'Volkswagen',
    modelo: 'Golf GTI',
    year: '2016',
    color: 'Branco Puro',
    cat: 'Turbo',
    main: false,
    motor: '2.0 TSI',
    pot: '230',
    torque: '35,7',
    peso: '1.380',
    trans: 'DSG 6',
    mods: '',
    history: [{ name: 'Arrancada Toledo · Street', date: '10 ago', cat: 'Turbo', pos: 'P7', pts: 6 }],
  },
  {
    id: 'opala',
    name: 'Chevrolet Opala SS',
    marca: 'Chevrolet',
    modelo: 'Opala SS',
    year: '1976',
    color: 'Vermelho',
    cat: 'Clássicos',
    main: false,
    motor: '4.1 6 cilindros',
    pot: '171',
    torque: '',
    peso: '1.250',
    trans: 'Manual 4M',
    mods: 'Carburação dupla',
    history: [],
  },
];

export interface RankingPilot {
  name: string;
  car: string;
  cat: Category;
  /** Points: monthly / semester */
  m: number;
  s: number;
  /** Position variation: monthly / semester */
  dm: number;
  ds: number;
}

const R = (name: string, car: string, cat: Category, m: number, s: number, dm: number, ds: number): RankingPilot => ({
  name,
  car,
  cat,
  m,
  s,
  dm,
  ds,
});

export const RANKING_PILOTS: RankingPilot[] = [
  R('Patrícia Weber', 'BMW 330i', 'Turismo', 75, 212, 0, 1),
  R('Fernanda Zanella', 'Honda Civic Si 2008', 'Aspirado', 68, 190, 1, 0),
  R('Ana Beatriz Moraes', 'Toyota Supra MK4', 'Turbo', 61, 176, 2, 2),
  R('Rafael Kowalski', 'VW Golf GTI', 'Turbo', 68, 201, -1, -1),
  R('Leonardo Brandt', 'Subaru WRX STI', 'Turbo', 58, 168, -2, 0),
  R('Gustavo Andreatta', 'Peugeot 206 RC', 'Aspirado', 55, 150, 0, 1),
  R('Camila Rocha', 'Audi S3', 'Turbo', 55, 149, 1, -1),
  R('Marcos Vinícius Lopes', 'Ford Mustang GT', 'Turismo', 51, 160, 0, 0),
  R('Bruno Takahashi', 'VW Gol GTI', 'Aspirado', 51, 132, -1, -2),
  R('Otávio Lemos', 'Chevrolet Cruze', 'Turismo', 44, 140, -2, 1),
  R('Lucas Andrade', 'Honda Civic Si', 'Turbo', 43, 121, 3, 2),
  R('Eduardo Sartori', 'Toyota Corolla GR', 'Turismo', 40, 118, 1, 0),
  R('Diego Farias', 'VW Jetta GLI', 'Turbo', 40, 110, 0, -1),
  R('Rogério Casagrande', 'Ford Maverick V8', 'Street Legal', 36, 98, 2, 0),
  R('Letícia Hoffmann', 'Honda Civic Touring', 'Turismo', 22, 80, 0, 0),
  R('Juliana Pacheco', 'VW Polo GTS', 'Turbo', 22, 64, -1, 0),
  R('Priscila Nunes', 'Fiat Uno Turbo', 'Street Legal', 25, 70, 0, 1),
];

export const ME = 'Lucas Andrade';

/** Category leaders highlighted on the Feed. */
export const FEED_RANK_HIGHLIGHTS = [
  { name: 'Ana Beatriz Moraes', cat: 'Turbo', car: 'Toyota Supra MK4', pts: 61 },
  { name: 'Patrícia Weber', cat: 'Turismo', car: 'BMW 330i', pts: 75 },
  { name: 'Fernanda Zanella', cat: 'Aspirado', car: 'Honda Civic Si 2008', pts: 68 },
];

export interface Achievement {
  id: string;
  name: string;
  icon: string;
  unlocked: boolean;
  desc: string;
  when?: string;
  current?: number;
  max?: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first', name: 'Primeira largada', icon: 'flag-checkered', unlocked: true, desc: 'Participou do primeiro evento.', when: 'Desbloqueada em 10 ago · Arrancada Toledo' },
  { id: 'podium', name: 'Primeiro pódio', icon: 'trophy', unlocked: true, desc: 'Terminou entre os 3 primeiros da categoria.', when: 'Desbloqueada em 24 ago · Desafio em Pista · Turbo' },
  { id: 'five', name: '5 eventos', icon: 'calendar-check', unlocked: true, desc: 'Participou de 5 eventos autorizados.', when: 'Desbloqueada em 14 set' },
  { id: 'regular', name: 'Frequente', icon: 'repeat', unlocked: true, desc: 'Participou de eventos em 3 meses seguidos.', when: 'Desbloqueada em 12 out' },
  { id: 'win', name: 'Vitória', icon: 'crown', unlocked: false, desc: 'Vença uma bateria em qualquer categoria.', current: 0, max: 1 },
  { id: 'ten', name: '10 pódios', icon: 'medal', unlocked: false, desc: 'Some 10 pódios na temporada.', current: 4, max: 10 },
  { id: 'explorer', name: 'Explorador', icon: 'map-trifold', unlocked: false, desc: 'Participe de eventos em 4 locais autorizados diferentes.', current: 3, max: 4 },
  { id: 'garage', name: 'Garagem completa', icon: 'garage', unlocked: false, desc: 'Cadastre 3 veículos com especificações técnicas.', current: 2, max: 3 },
  { id: 'hundred', name: '200 pontos', icon: 'lightning', unlocked: false, desc: 'Alcance 200 pontos no ranking semestral.', current: 121, max: 200 },
];

export interface HistoryEntry {
  id: string;
  name: string;
  date: string;
  cat: Category;
  car: string;
  pos: number;
  pts: number;
  month: 'jul' | 'ago' | 'set' | 'out';
  field: number;
  award?: string;
  local: string;
}

export const HISTORY: HistoryEntry[] = [
  { id: 'h1', name: 'Track Day Zilmar Beux · Etapa 3', date: '12 out', cat: 'Turbo', car: 'Honda Civic Si', pos: 3, pts: 15, month: 'out', field: 6, award: 'Piloto destaque', local: 'Autódromo Zilmar Beux' },
  { id: 'h2', name: 'Track Day Zilmar Beux · Etapa 2', date: '14 set', cat: 'Turbo', car: 'Honda Civic Si', pos: 5, pts: 10, month: 'set', field: 8, local: 'Autódromo Zilmar Beux' },
  { id: 'h3', name: 'Desafio em Pista · Turbo', date: '24 ago', cat: 'Turbo', car: 'Honda Civic Si', pos: 2, pts: 18, month: 'ago', field: 10, local: 'Autódromo Zilmar Beux' },
  { id: 'h4', name: 'Arrancada Toledo · Street', date: '10 ago', cat: 'Turbo', car: 'VW Golf GTI', pos: 7, pts: 6, month: 'ago', field: 12, local: 'Pista de Arrancada Toledo' },
  { id: 'h5', name: 'Encontro Clássicos do Oeste', date: '27 jul', cat: 'Clássicos', car: 'Chevrolet Opala SS', pos: 1, pts: 25, month: 'jul', field: 5, local: 'Espaço Lago Azul' },
  { id: 'h6', name: 'Track Day Zilmar Beux · Etapa 1', date: '13 jul', cat: 'Turbo', car: 'Honda Civic Si', pos: 3, pts: 15, month: 'jul', field: 9, local: 'Autódromo Zilmar Beux' },
];

/** Classification used by the result detail (Lucas is placed at his real position). */
export const RESULT_FIELD: [string, number][] = [
  ['Ana Beatriz Moraes', 25],
  ['Rafael Kowalski', 18],
  ['Lucas Andrade', 15],
  ['Camila Rocha', 12],
  ['Diego Farias', 10],
  ['Thiago Nishimura', 8],
];

export const NOTIFICATION_PREFS: { id: string; label: string; sub: string; on: boolean }[] = [
  { id: 'conf', label: 'Inscrição confirmada ou aprovada', sub: 'Quando o organizador aprovar', on: true },
  { id: 'rec', label: 'Inscrição recusada', sub: 'Com o motivo informado', on: true },
  { id: 'near', label: 'Novo evento na região', sub: 'Dentro do seu raio de busca', on: true },
  { id: 'remind', label: 'Lembrete de evento', sub: 'Na véspera, com horário do briefing', on: true },
  { id: 'result', label: 'Resultado publicado', sub: 'Sua posição e pontos', on: true },
  { id: 'ach', label: 'Conquista desbloqueada', sub: '', on: false },
];

export const seedNotifications = (): AppNotification[] => [
  { id: 'n1', day: 'Hoje', type: 'reminder', title: 'Lembrete: Track Day Zilmar Beux hoje', body: 'Briefing às 7h30 no box 3. Leve capacete homologado.', time: '07:00', unread: true, href: '/eventos/e1' },
  { id: 'n2', day: 'Hoje', type: 'approved', title: 'Inscrição aprovada', body: 'Arrancada Oeste aprovou sua inscrição na Noite da Arrancada 201m.', time: '06:48', unread: true, href: '/eventos/e2' },
  { id: 'n3', day: 'Ontem', type: 'result', title: 'Resultado publicado: Etapa 2', body: 'Você terminou em P5 na Turbo e somou +10 pts.', time: '18:20', unread: true, href: '/perfil/resultados/h2' },
  { id: 'n4', day: 'Ontem', type: 'achievement', title: 'Conquista desbloqueada: Frequente', body: 'Eventos em 3 meses seguidos.', time: '18:20', unread: false, href: '/perfil?conquista=regular' },
  { id: 'n5', day: 'Ontem', type: 'newEvent', title: 'Novo evento a 9,8 km', body: 'Noite da Arrancada 201m · Pista de Arrancada Cascavel · 18 out.', time: '10:05', unread: false, href: '/eventos/e2' },
  { id: 'n6', day: 'Qua, 9 out', type: 'pending', title: 'Inscrição pendente', body: 'Noite da Arrancada 201m exige aprovação. Avisaremos quando o organizador responder.', time: '21:14', unread: false, href: '/eventos/e2' },
  { id: 'n7', day: 'Qua, 9 out', type: 'confirmed', title: 'Inscrição confirmada', body: 'Track Day Zilmar Beux · Etapa 3 · Honda Civic Si · Turbo.', time: '14:32', unread: false, href: '/eventos/e1' },
  { id: 'n8', day: 'Qua, 9 out', type: 'rejected', title: 'Inscrição recusada', body: 'Encontro Tríplice Fronteira: vagas reservadas a clubes convidados.', time: '09:10', unread: false, href: '/eventos/e6' },
];
