import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool, withTransaction } from '../../db/pool.js';
import { AppError } from '../../shared/errors.js';
import { requireAuth } from '../../shared/http/require-auth.js';
import { mediaUrl } from '../../shared/storage.js';
import { VeiculoSchema } from './veiculos.schemas.js';

interface VeiculoRow extends RowDataPacket {
  id: string;
  marca_id: number;
  marca_nome: string;
  modelo: string;
  ano: number;
  cor: string | null;
  categoria_id: number;
  categoria_nome: string;
  principal: number;
  motor: string | null;
  potencia_cv: number | null;
  torque_kgfm: string | null;
  peso_kg: number | null;
  transmissao: string | null;
  modificacoes: string | null;
}

const SELECT = `
  SELECT v.id, v.marca_id, m.nome AS marca_nome, v.modelo, v.ano, v.cor, v.categoria_id, c.nome AS categoria_nome,
         v.principal, v.motor, v.potencia_cv, v.torque_kgfm, v.peso_kg, v.transmissao, v.modificacoes
    FROM veiculo v
    JOIN marca m ON m.id = v.marca_id
    JOIN categoria c ON c.id = v.categoria_id`;

/** Nome curto exibido nos cards, como no protótipo ("VW Golf GTI"). */
const nomeExibicao = (marca: string, modelo: string) => `${marca === 'Volkswagen' ? 'VW' : marca} ${modelo}`;

async function listar(db: PoolConnection | typeof pool, usuarioId: string, veiculoId?: string) {
  const [rows] = await db.query<VeiculoRow[]>(
    `${SELECT} WHERE v.usuario_id = ? AND v.excluido_em IS NULL ${veiculoId ? 'AND v.id = ?' : ''}
      ORDER BY v.principal DESC, v.created_at`,
    veiculoId ? [usuarioId, veiculoId] : [usuarioId],
  );
  if (!rows.length) return [];
  const [fotos] = await db.query<RowDataPacket[]>(
    `SELECT f.veiculo_id, f.id, f.ordem, u.caminho FROM foto_veiculo f JOIN upload u ON u.id = f.upload_id
      WHERE f.veiculo_id IN (?) ORDER BY f.ordem`,
    [rows.map((r) => r.id)],
  );
  return rows.map((v) => ({
    id: v.id,
    nome: nomeExibicao(v.marca_nome, v.modelo),
    marca: { id: v.marca_id, nome: v.marca_nome },
    modelo: v.modelo,
    ano: v.ano,
    cor: v.cor,
    categoria: { id: v.categoria_id, nome: v.categoria_nome },
    principal: v.principal === 1,
    especificacoes: {
      motor: v.motor,
      potenciaCv: v.potencia_cv,
      torqueKgfm: v.torque_kgfm === null ? null : Number(v.torque_kgfm),
      pesoKg: v.peso_kg,
      transmissao: v.transmissao,
      modificacoes: v.modificacoes ? v.modificacoes.split('\n').map((s) => s.trim()).filter(Boolean) : [],
    },
    fotos: fotos.filter((f) => f.veiculo_id === v.id).map((f) => ({ id: f.id as string, ordem: f.ordem as number, url: mediaUrl(f.caminho as string) })),
  }));
}

export function veiculosRoutes(): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', async (req, res) => {
    res.json({ veiculos: await listar(pool, req.auth!.sub) });
  });

  /** UC-01: cria o veículo com as fotos já enviadas em /uploads. O primeiro vira o principal (RN-VEI-03). */
  router.post('/', async (req, res) => {
    const input = VeiculoSchema.parse(req.body);
    const usuarioId = req.auth!.sub;

    const veiculo = await withTransaction(async (tx) => {
      // Serializa cadastros simultâneos do mesmo usuário (decisão de "principal").
      await tx.query('SELECT id FROM usuario WHERE id = ? FOR UPDATE', [usuarioId]);

      const [[marca], [categoria]] = await Promise.all([
        tx.query<RowDataPacket[]>('SELECT id FROM marca WHERE id = ? AND ativa = 1', [input.marcaId]).then((r) => r[0]),
        tx.query<RowDataPacket[]>('SELECT id FROM categoria WHERE id = ?', [input.categoriaId]).then((r) => r[0]),
      ]);
      const fields: Record<string, string> = {};
      if (!marca) fields.marcaId = 'Selecione a marca.';
      if (!categoria) fields.categoriaId = 'Selecione a categoria.';

      const [uploads] = await tx.query<RowDataPacket[]>(
        `SELECT id FROM upload WHERE id IN (?) AND usuario_id = ? AND finalidade = 'foto_veiculo' AND usado_em IS NULL FOR UPDATE`,
        [input.fotoIds, usuarioId],
      );
      if (uploads.length !== input.fotoIds.length) fields.fotoIds = 'Algumas fotos não estão mais disponíveis. Envie-as de novo.';
      if (Object.keys(fields).length) {
        const n = Object.keys(fields).length;
        throw new AppError(422, 'VALIDATION_ERROR', `Revise ${n} ${n > 1 ? 'campos destacados.' : 'campo destacado.'}`, fields);
      }

      const [[{ total }]] = (await tx.query<RowDataPacket[]>(
        'SELECT COUNT(*) AS total FROM veiculo WHERE usuario_id = ? AND excluido_em IS NULL',
        [usuarioId],
      )) as unknown as [[{ total: number }]];
      const id = randomUUID();
      await tx.query(
        `INSERT INTO veiculo (id, usuario_id, marca_id, modelo, ano, cor, categoria_id, principal,
                              motor, potencia_cv, torque_kgfm, peso_kg, transmissao, modificacoes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, usuarioId, input.marcaId, input.modelo, input.ano, input.cor ?? null, input.categoriaId, Number(total) === 0 ? 1 : 0,
          input.motor ?? null, input.potenciaCv ?? null, input.torqueKgfm ?? null, input.pesoKg ?? null,
          input.transmissao ?? null, input.modificacoes ?? null,
        ],
      );
      for (const [i, uploadId] of input.fotoIds.entries()) {
        await tx.query('INSERT INTO foto_veiculo (id, veiculo_id, upload_id, ordem) VALUES (?, ?, ?, ?)', [randomUUID(), id, uploadId, i + 1]);
      }
      await tx.query('UPDATE upload SET usado_em = UTC_TIMESTAMP(3) WHERE id IN (?)', [input.fotoIds]);
      return (await listar(tx, usuarioId, id))[0]!;
    });

    res.status(201).json({ veiculo });
  });

  return router;
}
