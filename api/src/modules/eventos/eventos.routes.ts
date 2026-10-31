import { Router } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../db/pool.js';
import { AppError } from '../../shared/errors.js';
import { requireAuth } from '../../shared/http/require-auth.js';
import { mediaUrl } from '../../shared/storage.js';
import { endOfMonth, endOfWeek } from '../../shared/time.js';
import { FeedQuerySchema, type FeedQuery } from './eventos.schemas.js';

interface Origem {
  tipo: 'gps' | 'cidade';
  lat: number;
  lng: number;
  cidade?: { id: number; nome: string; uf: string };
}

interface EventoRow extends RowDataPacket {
  id: string;
  nome: string;
  tipo: 'td' | 'arr' | 'des' | 'enc';
  inicio_em: Date;
  visibilidade: 'pub' | 'priv';
  status: 'aberto' | 'andamento';
  vagas_total: number;
  confirmadas: number;
  local_nome: string;
  tipo_local: 'autodromo' | 'pista_arrancada' | 'area_privada';
  local_lat: string;
  local_lng: string;
  cidade_nome: string;
  cidade_uf: string;
  organizador: string;
  capa_caminho: string | null;
  distancia_km: number;
}

async function resolverOrigem(q: FeedQuery, usuarioId: string): Promise<Origem> {
  if (q.lat !== undefined && q.lng !== undefined) {
    // Cidade mais próxima da posição (até 100 km), só para o cabeçalho "Sua localização · Cascavel".
    const [prox] = await pool.query<RowDataPacket[]>(
      `SELECT id, nome, uf, ST_Distance_Sphere(POINT(longitude, latitude), POINT(?, ?)) / 1000 AS km
         FROM cidade WHERE ativa = 1 AND latitude IS NOT NULL ORDER BY km LIMIT 1`,
      [q.lng, q.lat],
    );
    const c = prox[0];
    return { tipo: 'gps', lat: q.lat, lng: q.lng, cidade: c && Number(c.km) <= 100 ? { id: c.id, nome: c.nome, uf: c.uf } : undefined };
  }
  const [rows] = q.cidadeId
    ? await pool.query<RowDataPacket[]>('SELECT id, nome, uf, latitude, longitude FROM cidade WHERE id = ? AND ativa = 1', [q.cidadeId])
    : await pool.query<RowDataPacket[]>(
        'SELECT c.id, c.nome, c.uf, c.latitude, c.longitude FROM usuario u JOIN cidade c ON c.id = u.cidade_id WHERE u.id = ?',
        [usuarioId],
      );
  const c = rows[0];
  if (!c) throw new AppError(422, 'VALIDATION_ERROR', 'Cidade inválida.', { cidadeId: 'Cidade inválida.' });
  if (c.latitude === null) throw new AppError(422, 'CITY_WITHOUT_LOCATION', 'Esta cidade ainda não tem coordenadas cadastradas.');
  return { tipo: 'cidade', lat: Number(c.latitude), lng: Number(c.longitude), cidade: { id: c.id, nome: c.nome, uf: c.uf } };
}

/**
 * GET /eventos/feed (UC-03 + filtros UC-22).
 * Eventos abertos ou em andamento, ainda não terminados, dentro do raio, ordenados por data.
 */
export function eventosRoutes(): Router {
  const router = Router();

  router.get('/feed', requireAuth, async (req, res) => {
    const q = FeedQuerySchema.parse(req.query);
    const origem = await resolverOrigem(q, req.auth!.sub);
    const now = new Date();
    const fimSemana = endOfWeek(now);
    const limite = q.periodo === 'semana' ? fimSemana : q.periodo === 'mes' ? endOfMonth(now) : null;

    // Caixa de busca em graus (usa o índice de lat/lng) antes da distância exata na esfera.
    const dLat = q.raioKm / 111.0;
    const dLng = q.raioKm / (111.32 * Math.max(Math.cos((origem.lat * Math.PI) / 180), 0.01));

    const where: string[] = [
      "e.status IN ('aberto','andamento')",
      // Some do Feed quando termina; sem fim informado, 12 h depois do início.
      'COALESCE(e.fim_em, e.inicio_em + INTERVAL 12 HOUR) > UTC_TIMESTAMP(3)',
      'l.latitude BETWEEN ? AND ?',
      'l.longitude BETWEEN ? AND ?',
    ];
    const params: unknown[] = [origem.lat - dLat, origem.lat + dLat, origem.lng - dLng, origem.lng + dLng];
    if (limite) {
      where.push('e.inicio_em <= ?');
      params.push(limite);
    }
    if (q.categorias.length) {
      // OU entre categorias: aparece se aceitar qualquer uma das escolhidas (RN-DES-04).
      where.push('EXISTS (SELECT 1 FROM evento_categoria ec WHERE ec.evento_id = e.id AND ec.categoria_id IN (?))');
      params.push(q.categorias);
    }

    const [rows] = await pool.query<EventoRow[]>(
      `SELECT e.id, e.nome, e.tipo, e.inicio_em, e.visibilidade, e.status, e.vagas_total,
              (SELECT COUNT(*) FROM inscricao i WHERE i.evento_id = e.id AND i.status = 'conf') AS confirmadas,
              l.nome AS local_nome, l.tipo_local, l.latitude AS local_lat, l.longitude AS local_lng,
              c.nome AS cidade_nome, c.uf AS cidade_uf, o.nome_organizacao AS organizador, up.caminho AS capa_caminho,
              ST_Distance_Sphere(POINT(l.longitude, l.latitude), POINT(?, ?)) / 1000 AS distancia_km
         FROM evento e
         JOIN local l ON l.id = e.local_id
         JOIN cidade c ON c.id = l.cidade_id
         JOIN organizador o ON o.id = e.organizador_id
         LEFT JOIN upload up ON up.id = e.capa_upload_id
        WHERE ${where.join(' AND ')}
       HAVING distancia_km <= ?
        ORDER BY e.inicio_em, distancia_km
        LIMIT 100`,
      [origem.lng, origem.lat, ...params, q.raioKm],
    );

    const categorias = new Map<string, string[]>();
    if (rows.length) {
      const [cats] = await pool.query<RowDataPacket[]>(
        `SELECT ec.evento_id, c.nome FROM evento_categoria ec JOIN categoria c ON c.id = ec.categoria_id
          WHERE ec.evento_id IN (?) ORDER BY c.ordem`,
        [rows.map((r) => r.id)],
      );
      for (const c of cats) categorias.set(c.evento_id, [...(categorias.get(c.evento_id) ?? []), c.nome]);
    }

    res.json({
      origem: { tipo: origem.tipo, cidade: origem.cidade ?? null },
      raioKm: q.raioKm,
      geradoEm: now.toISOString(),
      eventos: rows.map((e) => ({
        id: e.id,
        nome: e.nome,
        tipo: e.tipo,
        inicioEm: new Date(e.inicio_em).toISOString(),
        estaSemana: new Date(e.inicio_em) <= fimSemana,
        emAndamento: e.status === 'andamento',
        visibilidade: e.visibilidade,
        distanciaKm: Math.round(Number(e.distancia_km) * 10) / 10,
        local: {
          nome: e.local_nome,
          tipo: e.tipo_local,
          latitude: Number(e.local_lat),
          longitude: Number(e.local_lng),
          cidade: { nome: e.cidade_nome, uf: e.cidade_uf },
        },
        categorias: categorias.get(e.id) ?? [],
        vagas: { total: e.vagas_total, restantes: Math.max(0, e.vagas_total - Number(e.confirmadas)) },
        organizador: e.organizador,
        capaUrl: e.capa_caminho ? mediaUrl(e.capa_caminho) : null,
      })),
    });
  });

  return router;
}
