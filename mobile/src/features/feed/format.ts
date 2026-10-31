import type { TipoEvento, TipoLocal } from './api';

export const TIPO_EVENTO: Record<TipoEvento, string> = {
  td: 'Track Day',
  arr: 'Arrancada Autorizada',
  des: 'Desafio em Pista',
  enc: 'Encontro',
};

export const TIPO_LOCAL: Record<TipoLocal, string> = {
  autodromo: 'Autódromo',
  pista_arrancada: 'Pista de Arrancada',
  area_privada: 'Área Privada',
};

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const pad = (n: number) => String(n).padStart(2, '0');

/** "Sáb, 12 out · 08:00" no horário do aparelho. */
export function dataEvento(iso: string): string {
  const d = new Date(iso);
  return `${DIAS[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Bloco de data da lista: { dia: "SÁB", numero: "12", mes: "OUT" }. */
export function blocoData(iso: string) {
  const d = new Date(iso);
  return { dia: DIAS[d.getDay()]!.toUpperCase(), numero: pad(d.getDate()), mes: MESES[d.getMonth()]!.toUpperCase() };
}

/** "4,2 km" / "48 km". */
export function distancia(km: number): string {
  return km < 10 ? `${km.toFixed(1).replace('.', ',')} km` : `${Math.round(km)} km`;
}

/** Rótulo e cor das vagas (RN-DES-05): esgotadas, últimas (≤ 5) ou restantes. */
export function vagas(restantes: number, total: number) {
  const nivel = restantes <= 0 ? 'esgotadas' : restantes <= 5 ? 'ultimas' : 'restantes';
  return {
    nivel,
    label: nivel === 'esgotadas' ? 'Vagas esgotadas' : nivel === 'ultimas' ? 'Últimas vagas' : 'Vagas restantes',
    contagem: `${Math.max(restantes, 0)} de ${total}`,
    ocupacao: total ? Math.min(1, (total - Math.max(restantes, 0)) / total) : 1,
  };
}

/** "atualizado há 12 min" para o banner offline. */
export function haQuantoTempo(iso: string, agora = Date.now()): string {
  const min = Math.max(0, Math.round((agora - new Date(iso).getTime()) / 60_000));
  if (min < 1) return 'há instantes';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `há ${h} h` : `há ${Math.round(h / 24)} dia(s)`;
}
