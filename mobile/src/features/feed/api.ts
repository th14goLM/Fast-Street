import { request } from '../../lib/http';

export type TipoEvento = 'td' | 'arr' | 'des' | 'enc';
export type TipoLocal = 'autodromo' | 'pista_arrancada' | 'area_privada';
export type Periodo = 'qualquer' | 'semana' | 'mes';

export interface EventoFeed {
  id: string;
  nome: string;
  tipo: TipoEvento;
  inicioEm: string;
  estaSemana: boolean;
  emAndamento: boolean;
  visibilidade: 'pub' | 'priv';
  distanciaKm: number;
  local: { nome: string; tipo: TipoLocal; latitude: number; longitude: number; cidade: { nome: string; uf: string } };
  categorias: string[];
  vagas: { total: number; restantes: number };
  organizador: string;
  capaUrl: string | null;
}

export interface FeedResponse {
  origem: { tipo: 'gps' | 'cidade'; cidade: { id: number; nome: string; uf: string } | null };
  raioKm: number;
  geradoEm: string;
  eventos: EventoFeed[];
}

export interface FeedParams {
  lat?: number;
  lng?: number;
  cidadeId?: number;
  raioKm: number;
  categorias: number[];
  periodo: Periodo;
}

export const feedApi = {
  get: (token: string, p: FeedParams) => {
    const qs = new URLSearchParams({ raioKm: String(p.raioKm), periodo: p.periodo });
    if (p.lat !== undefined && p.lng !== undefined) {
      qs.set('lat', String(p.lat));
      qs.set('lng', String(p.lng));
    } else if (p.cidadeId) qs.set('cidadeId', String(p.cidadeId));
    if (p.categorias.length) qs.set('categorias', p.categorias.join(','));
    return request<FeedResponse>(`/eventos/feed?${qs.toString()}`, { token });
  },
};
