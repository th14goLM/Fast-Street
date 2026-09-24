/** 4.2 → "4,2 km" (pt-BR decimal comma). */
export const km = (dist: number) => `${String(dist).replace('.', ',')} km`;

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** ("2026-11-14", "08:00") → "Sáb, 14 nov · 08:00" */
export const formatEventDate = (isoDate: string, time?: string) => {
  if (!isoDate) return 'Data a definir';
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${WEEKDAYS[dt.getDay()]}, ${d} ${MONTHS[m - 1]}${time ? ` · ${time}` : ''}`;
};

/** Local ISO date (yyyy-mm-dd) for "today", used to reject past event dates. */
export const todayIso = (now = new Date()) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
};
