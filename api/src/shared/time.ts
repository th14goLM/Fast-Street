/** Fuso do produto (MVP Paraná). Datas ficam em UTC no banco; o recorte de calendário usa este fuso. */
export const TIME_ZONE = 'America/Sao_Paulo';

interface WallClock {
  year: number;
  month: number; // 1–12
  day: number;
  weekday: number; // 0 = domingo … 6 = sábado
  offset: string; // ex.: "-03:00"
}

function wallClock(date: Date, timeZone = TIME_ZONE): WallClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    timeZoneName: 'longOffset',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const gmt = get('timeZoneName').replace('GMT', '') || '+00:00';
  return { year: +get('year'), month: +get('month'), day: +get('day'), weekday: weekdays.indexOf(get('weekday')), offset: gmt };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Último milissegundo do dia (no fuso) que fica `addDays` dias depois de `date`. */
function endOfLocalDay(date: Date, addDays: number): Date {
  const shifted = new Date(date.getTime() + addDays * 86_400_000);
  const w = wallClock(shifted);
  return new Date(`${w.year}-${pad(w.month)}-${pad(w.day)}T23:59:59.999${w.offset}`);
}

/** Fim da semana corrente: domingo 23:59:59.999 no fuso do produto (semana de segunda a domingo). */
export function endOfWeek(now = new Date()): Date {
  const daysToSunday = (7 - wallClock(now).weekday) % 7;
  return endOfLocalDay(now, daysToSunday);
}

/** Fim do mês corrente no fuso do produto. */
export function endOfMonth(now = new Date()): Date {
  const w = wallClock(now);
  const daysInMonth = new Date(Date.UTC(w.year, w.month, 0)).getUTCDate();
  return endOfLocalDay(now, daysInMonth - w.day);
}
