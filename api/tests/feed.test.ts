import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { migrate } from '../src/db/migrate.js';
import { pool } from '../src/db/pool.js';
import type { Mailer } from '../src/shared/mailer.js';
import { resetDb } from './helpers.js';

const app = createApp({ mailer: { description: 'silencioso', send: async () => {} } satisfies Mailer });
const H = 3_600_000;
const D = 24 * H;

let cid: Record<string, number>; // cidades por nome
let cat: Record<string, number>; // categorias por nome
let token: string;
let organizadorId: string;
let pilotos: { usuario: string; veiculo: string }[];

/** Coordenadas reais aproximadas (distâncias até o centro de Cascavel). */
const LOCAIS = {
  zilmar: { nome: 'Autódromo Zilmar Beux', tipo: 'autodromo', cidade: 'Cascavel', lat: -24.99, lng: -53.44 }, // ~4 km
  lagoAzul: { nome: 'Espaço Lago Azul', tipo: 'area_privada', cidade: 'Cascavel', lat: -24.91, lng: -53.48 }, // ~6 km
  toledo: { nome: 'Pista de Arrancada Toledo', tipo: 'pista_arrancada', cidade: 'Toledo', lat: -24.7246, lng: -53.7421 }, // ~39 km
  guarapuava: { nome: 'Autódromo de Guarapuava', tipo: 'autodromo', cidade: 'Guarapuava', lat: -25.3907, lng: -51.4628 }, // ~205 km
} as const;

async function local(key: keyof typeof LOCAIS): Promise<string> {
  const l = LOCAIS[key];
  const id = randomUUID();
  await pool.query('INSERT INTO local (id, nome, tipo_local, cidade_id, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)', [id, l.nome, l.tipo, cid[l.cidade], l.lat, l.lng]);
  return id;
}

async function evento(o: {
  nome: string;
  local: string;
  inicioEmMs: number;
  categorias: string[];
  status?: string;
  vagas?: number;
  visibilidade?: 'pub' | 'priv';
  tipo?: string;
}): Promise<string> {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO evento (id, organizador_id, local_id, nome, tipo, regras, vagas_total, inicio_em, visibilidade, status)
     VALUES (?, ?, ?, ?, ?, 'Capacete homologado.', ?, ?, ?, ?)`,
    [id, organizadorId, o.local, o.nome, o.tipo ?? 'td', o.vagas ?? 40, new Date(Date.now() + o.inicioEmMs), o.visibilidade ?? 'pub', o.status ?? 'aberto'],
  );
  for (const c of o.categorias) await pool.query('INSERT INTO evento_categoria (evento_id, categoria_id) VALUES (?, ?)', [id, cat[c]]);
  return id;
}

async function inscrever(eventoId: string, n: number, status: string) {
  for (let i = 0; i < n; i++) {
    const p = pilotos.shift()!;
    await pool.query(
      'INSERT INTO inscricao (id, evento_id, piloto_id, veiculo_id, categoria_id, status, regras_aceitas_em) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))',
      [randomUUID(), eventoId, p.usuario, p.veiculo, cat.Turbo, status],
    );
  }
}

async function setup() {
  await resetDb();
  const reg = await request(app)
    .post('/auth/register')
    .send({ email: 'lucas@faststreet.dev', senha: 'Pista2026!', perfil: 'ambos', nomeCompleto: 'Lucas Andrade', cidadeId: cid.Cascavel, termosAceitos: true, organizacao: { nome: 'Oeste Track Club', documento: '11222333000181', telefone: '45999990000' } })
    .expect(201);
  token = reg.body.tokens.accessToken;
  const [[org]] = (await pool.query('SELECT id FROM organizador LIMIT 1')) as unknown as [[{ id: string }]];
  organizadorId = org.id;
  // Pilotos e veículos para as inscrições.
  pilotos = [];
  const [[marca]] = (await pool.query('SELECT id FROM marca LIMIT 1')) as unknown as [[{ id: number }]];
  for (let i = 0; i < 12; i++) {
    const usuario = randomUUID();
    const veiculo = randomUUID();
    await pool.query(
      `INSERT INTO usuario (id, email, nome_completo, cidade_id, perfil, termos_versao, termos_aceitos_em) VALUES (?, ?, ?, ?, 'piloto', 't', UTC_TIMESTAMP(3))`,
      [usuario, `p${i}@x.dev`, `Piloto ${i}`, cid.Cascavel],
    );
    await pool.query('INSERT INTO veiculo (id, usuario_id, marca_id, modelo, ano, categoria_id) VALUES (?, ?, ?, ?, 2020, ?)', [veiculo, usuario, marca.id, 'Modelo', cat.Turbo]);
    pilotos.push({ usuario, veiculo });
  }
}

const feed = (query: Record<string, string | number> = {}) => request(app).get('/eventos/feed').query(query).set('Authorization', `Bearer ${token}`);
const nomes = (res: request.Response) => res.body.eventos.map((e: { nome: string }) => e.nome);

beforeAll(async () => {
  await migrate(process.env.DATABASE_URL, () => {});
  const [cidades] = await pool.query<any[]>('SELECT id, nome FROM cidade');
  cid = Object.fromEntries(cidades.map((c) => [c.nome, c.id]));
  const [cats] = await pool.query<any[]>('SELECT id, nome FROM categoria');
  cat = Object.fromEntries(cats.map((c) => [c.nome, c.id]));
});
beforeEach(setup);
afterAll(() => pool.end());

describe('GET /eventos/feed', () => {
  it('exige sessão', async () => {
    await request(app).get('/eventos/feed').expect(401);
  });

  it('usa a cidade do cadastro como origem, calcula a distância e ordena por data', async () => {
    const zilmar = await local('zilmar');
    const lago = await local('lagoAzul');
    await evento({ nome: 'Track Day Etapa 3', local: zilmar, inicioEmMs: 3 * D, categorias: ['Turismo', 'Turbo'] });
    await evento({ nome: 'Encontro Clássicos', local: lago, inicioEmMs: 1 * D, categorias: ['Clássicos'], tipo: 'enc' });
    const res = await feed().expect(200);
    expect(res.body.origem).toEqual({ tipo: 'cidade', cidade: { id: cid.Cascavel, nome: 'Cascavel', uf: 'PR' } });
    expect(res.body.raioKm).toBe(50);
    expect(nomes(res)).toEqual(['Encontro Clássicos', 'Track Day Etapa 3']);
    const td = res.body.eventos[1];
    expect(td.distanciaKm).toBeGreaterThan(3);
    expect(td.distanciaKm).toBeLessThan(6);
    expect(td).toMatchObject({ tipo: 'td', visibilidade: 'pub', categorias: ['Turismo', 'Turbo'], local: { nome: 'Autódromo Zilmar Beux', tipo: 'autodromo', cidade: { nome: 'Cascavel', uf: 'PR' } }, organizador: 'Oeste Track Club' });
  });

  it('respeita o raio (5 a 200 km)', async () => {
    await evento({ nome: 'Arrancada Toledo', local: await local('toledo'), inicioEmMs: 2 * D, categorias: ['Turbo'] });
    await evento({ nome: 'Desafio Guarapuava', local: await local('guarapuava'), inicioEmMs: 2 * D, categorias: ['Turbo'] });
    expect(nomes(await feed({ raioKm: 25 }))).toEqual([]);
    expect(nomes(await feed({ raioKm: 50 }))).toEqual(['Arrancada Toledo']);
    expect(nomes(await feed({ raioKm: 200 }))).toEqual(['Arrancada Toledo']); // Guarapuava fica a ~205 km
  });

  it('com GPS, mede a partir da posição enviada; com cidadeId, a partir da cidade escolhida', async () => {
    await evento({ nome: 'Arrancada Toledo', local: await local('toledo'), inicioEmMs: 2 * D, categorias: ['Turbo'] });
    const gps = await feed({ lat: -24.73, lng: -53.74, raioKm: 5 }).expect(200);
    // Com GPS, o cabeçalho mostra a cidade mais próxima da posição.
    expect(gps.body.origem).toEqual({ tipo: 'gps', cidade: { id: cid.Toledo, nome: 'Toledo', uf: 'PR' } });
    const longe = await feed({ lat: -10, lng: -40 }).expect(200);
    expect(longe.body.origem).toEqual({ tipo: 'gps', cidade: null });
    expect(nomes(gps)).toEqual(['Arrancada Toledo']);
    const toledo = await feed({ cidadeId: cid.Toledo!, raioKm: 10 }).expect(200);
    expect(toledo.body.origem.cidade.nome).toBe('Toledo');
    expect(nomes(toledo)).toEqual(['Arrancada Toledo']);
  });

  it('mostra só eventos abertos ou em andamento que ainda não terminaram', async () => {
    const z = await local('zilmar');
    await evento({ nome: 'Aberto', local: z, inicioEmMs: 2 * D, categorias: ['Turbo'] });
    await evento({ nome: 'Em andamento', local: z, inicioEmMs: -2 * H, categorias: ['Turbo'], status: 'andamento' });
    await evento({ nome: 'Rascunho', local: z, inicioEmMs: 2 * D, categorias: ['Turbo'], status: 'rascunho' });
    await evento({ nome: 'Cancelado', local: z, inicioEmMs: 2 * D, categorias: ['Turbo'], status: 'cancelado' });
    await evento({ nome: 'Encerrado', local: z, inicioEmMs: -3 * D, categorias: ['Turbo'], status: 'encerrado' });
    await evento({ nome: 'Aberto mas já passou', local: z, inicioEmMs: -2 * D, categorias: ['Turbo'] });
    const res = await feed().expect(200);
    expect(nomes(res)).toEqual(['Em andamento', 'Aberto']);
    expect(res.body.eventos[0].emAndamento).toBe(true);
  });

  it('filtra por categorias (qualquer uma das escolhidas)', async () => {
    const z = await local('zilmar');
    await evento({ nome: 'Só Turbo', local: z, inicioEmMs: 1 * D, categorias: ['Turbo'] });
    await evento({ nome: 'Clássicos e Aspirado', local: z, inicioEmMs: 2 * D, categorias: ['Clássicos', 'Aspirado'] });
    await evento({ nome: 'Street Legal', local: z, inicioEmMs: 3 * D, categorias: ['Street Legal'] });
    expect(nomes(await feed({ categorias: `${cat.Turbo},${cat.Aspirado}` }))).toEqual(['Só Turbo', 'Clássicos e Aspirado']);
  });

  it('filtra por período e marca os eventos desta semana', async () => {
    const z = await local('zilmar');
    await evento({ nome: 'Daqui a pouco', local: z, inicioEmMs: 10 * 60_000, categorias: ['Turbo'] });
    await evento({ nome: 'Daqui a 40 dias', local: z, inicioEmMs: 40 * D, categorias: ['Turbo'] });
    const todos = await feed().expect(200);
    expect(todos.body.eventos.map((e: { estaSemana: boolean }) => e.estaSemana)).toEqual([true, false]);
    expect(nomes(await feed({ periodo: 'semana' }))).toEqual(['Daqui a pouco']);
    expect(nomes(await feed({ periodo: 'mes' }))).toEqual(['Daqui a pouco']);
  });

  it('vagas restantes descontam só as inscrições confirmadas', async () => {
    const z = await local('zilmar');
    const id = await evento({ nome: 'Etapa', local: z, inicioEmMs: 2 * D, categorias: ['Turbo'], vagas: 10 });
    await inscrever(id, 4, 'conf');
    await inscrever(id, 3, 'pend');
    await inscrever(id, 2, 'rec');
    const res = await feed().expect(200);
    expect(res.body.eventos[0].vagas).toEqual({ total: 10, restantes: 6 });
  });

  it('valida os filtros', async () => {
    const r1 = await feed({ lat: -24.9 }).expect(422);
    expect(r1.body.error.fields).toEqual({ lat: 'Envie latitude e longitude juntas.' });
    const r2 = await feed({ raioKm: 300 }).expect(422);
    expect(r2.body.error.fields).toEqual({ raioKm: 'O raio deve ficar entre 5 e 200 km.' });
    const r3 = await feed({ periodo: 'ano', categorias: 'x' }).expect(422);
    expect(Object.keys(r3.body.error.fields).sort()).toEqual(['categorias', 'periodo']);
  });
});
