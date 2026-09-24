import type { EventType, LocalType } from './types';

export const EVENT_TYPES: Record<EventType, { label: string; short: string; icon: string }> = {
  td: { label: 'Track Day', short: 'Track Day', icon: 'flag-checkered' },
  arr: { label: 'Arrancada Autorizada', short: 'Arrancada', icon: 'arrows-out-line-horizontal' },
  des: { label: 'Desafio em Pista', short: 'Desafio', icon: 'path' },
  enc: { label: 'Encontro', short: 'Encontro', icon: 'users-three' },
};

export const LOCAL_TYPES: LocalType[] = ['Autódromo', 'Pista de Arrancada', 'Área Privada'];

export const LOCAL_ICON: Record<LocalType, string> = {
  Autódromo: 'flag-checkered',
  'Pista de Arrancada': 'arrows-out-line-horizontal',
  'Área Privada': 'fence',
};

export const CITIES = ['Cascavel', 'Curitiba', 'Londrina', 'Maringá'] as const;

export const MARCAS = ['Chevrolet', 'Ford', 'Honda', 'Toyota', 'Volkswagen'] as const;

/** Points by finishing position: 25, 18, 15, 12, 10, 8… */
export const POINTS_BY_POSITION = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export const ORGANIZER_AWARDS: [string, string][] = [
  ['Piloto destaque', 'star'],
  ['Espírito esportivo', 'handshake'],
  ['Estreia no pódio', 'medal'],
  ['Melhor preparação', 'wrench'],
];
