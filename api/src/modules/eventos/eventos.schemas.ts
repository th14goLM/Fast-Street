import { z } from 'zod';

export const PERIODOS = ['qualquer', 'semana', 'mes'] as const;
export const RAIO_MIN = 5;
export const RAIO_MAX = 200;
export const RAIO_PADRAO = 50;

const optionalNumber = z.preprocess((v) => (v === '' || v === undefined ? undefined : v), z.coerce.number().optional());

/**
 * Filtros do Feed (UC-03 / UC-22). Origem: lat+lng (GPS) ou cidadeId (local escolhido);
 * sem nenhum dos dois, usa a cidade do cadastro.
 */
export const FeedQuerySchema = z
  .object({
    lat: optionalNumber.refine((v) => v === undefined || (v >= -90 && v <= 90), 'Latitude inválida.'),
    lng: optionalNumber.refine((v) => v === undefined || (v >= -180 && v <= 180), 'Longitude inválida.'),
    cidadeId: optionalNumber.refine((v) => v === undefined || (Number.isInteger(v) && v > 0), 'Cidade inválida.'),
    raioKm: z
      .preprocess((v) => (v === '' || v === undefined ? RAIO_PADRAO : v), z.coerce.number())
      .refine((v) => v >= RAIO_MIN && v <= RAIO_MAX, `O raio deve ficar entre ${RAIO_MIN} e ${RAIO_MAX} km.`),
    // Lista separada por vírgula: ?categorias=2,4
    categorias: z
      .string()
      .optional()
      .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean).map(Number) : []))
      .refine((ids) => ids.every((n) => Number.isInteger(n) && n > 0), 'Categorias inválidas.'),
    periodo: z.enum(PERIODOS, { error: 'Período inválido.' }).default('qualquer'),
  })
  .refine((q) => (q.lat === undefined) === (q.lng === undefined), { message: 'Envie latitude e longitude juntas.', path: ['lat'] });

export type FeedQuery = z.infer<typeof FeedQuerySchema>;
