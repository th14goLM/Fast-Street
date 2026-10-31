/**
 * Dados de demonstração para desenvolvimento: `npm run db:seed` (dentro de api/).
 * Cria organizadores, locais autorizados no Paraná, eventos com datas RELATIVAS a hoje
 * e inscrições (para as vagas restantes variarem). Pode rodar de novo: apaga os dados de
 * demonstração anteriores e recria com datas atualizadas. Nunca roda em produção.
 *
 * As contas criadas aqui (@seed.faststreet.dev) não têm senha: não é possível entrar com elas.
 */
import { createHash } from 'node:crypto';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { TIME_ZONE } from '../shared/time.js';
import { applyLockTimeout, explainLockTimeout, isLockTimeout } from './lock.js';

const SEED_DOMAIN = '@seed.faststreet.dev';

/** UUID determinístico a partir de uma chave: o mesmo seed gera sempre os mesmos ids. */
function seedId(key: string): string {
  const h = createHash('sha1').update(`fast-street-seed:${key}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Data/hora em Brasília, `dias` a partir de hoje, no horário "HH:MM". */
function emDias(dias: number, hora: string): Date {
  const d = new Date(Date.now() + dias * 86_400_000);
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  return new Date(`${p}T${hora}:00-03:00`);
}

const ORGANIZADORES = {
  oeste: 'Oeste Track Club',
  arrancada: 'Arrancada Oeste',
  opala: 'Clube do Opala PR',
  toledo: 'Toledo Motorsport',
  foz: 'Foz Auto Clube',
  centroSul: 'Centro-Sul Racing',
  curitiba: 'Curitiba Track Days',
} as const;

const LOCAIS = {
  zilmar: { nome: 'Autódromo Zilmar Beux', tipo: 'autodromo', cidade: 'Cascavel', lat: -24.9917, lng: -53.4428 },
  arrancadaCascavel: { nome: 'Pista de Arrancada Cascavel', tipo: 'pista_arrancada', cidade: 'Cascavel', lat: -24.8958, lng: -53.5153 },
  lagoAzul: { nome: 'Espaço Lago Azul', tipo: 'area_privada', cidade: 'Cascavel', lat: -24.9113, lng: -53.4795 },
  arrancadaToledo: { nome: 'Pista de Arrancada Toledo', tipo: 'pista_arrancada', cidade: 'Toledo', lat: -24.7246, lng: -53.7421 },
  parqueFoz: { nome: 'Parque de Exposições (área privada)', tipo: 'area_privada', cidade: 'Foz do Iguaçu', lat: -25.5163, lng: -54.5854 },
  guarapuava: { nome: 'Autódromo de Guarapuava', tipo: 'autodromo', cidade: 'Guarapuava', lat: -25.3907, lng: -51.4628 },
  aic: { nome: 'Autódromo Internacional de Curitiba', tipo: 'autodromo', cidade: 'Curitiba', lat: -25.4475, lng: -49.1925 },
} as const;

type Cat = 'Street Legal' | 'Turismo' | 'Aspirado' | 'Turbo' | 'Clássicos';

interface EventoSeed {
  key: string;
  nome: string;
  tipo: 'td' | 'arr' | 'des' | 'enc';
  org: keyof typeof ORGANIZADORES;
  local: keyof typeof LOCAIS;
  inicio: Date;
  duracaoH: number;
  vis: 'pub' | 'priv';
  status: 'rascunho' | 'aberto' | 'andamento' | 'encerrado' | 'cancelado';
  cats: Cat[];
  vagas: number;
  confirmadas: number;
  pendentes?: number;
}

const EVENTOS: EventoSeed[] = [
  { key: 'clássicos-oeste', nome: 'Encontro Clássicos do Oeste', tipo: 'enc', org: 'opala', local: 'lagoAzul', inicio: emDias(1, '19:00'), duracaoH: 4, vis: 'pub', status: 'aberto', cats: ['Clássicos', 'Aspirado'], vagas: 60, confirmadas: 6 },
  { key: 'zilmar-3', nome: 'Track Day Zilmar Beux · Etapa 3', tipo: 'td', org: 'oeste', local: 'zilmar', inicio: emDias(3, '08:00'), duracaoH: 9, vis: 'pub', status: 'aberto', cats: ['Turismo', 'Turbo', 'Aspirado'], vagas: 40, confirmadas: 22 },
  { key: 'desafio-turbo', nome: 'Desafio em Pista · Turbo', tipo: 'des', org: 'oeste', local: 'zilmar', inicio: emDias(4, '14:00'), duracaoH: 4, vis: 'pub', status: 'aberto', cats: ['Turbo'], vagas: 16, confirmadas: 16 },
  { key: 'curitiba', nome: 'Track Day Curitiba', tipo: 'td', org: 'curitiba', local: 'aic', inicio: emDias(6, '08:00'), duracaoH: 9, vis: 'pub', status: 'aberto', cats: ['Turismo', 'Turbo'], vagas: 50, confirmadas: 10 },
  { key: 'arrancada-201', nome: 'Noite da Arrancada 201m', tipo: 'arr', org: 'arrancada', local: 'arrancadaCascavel', inicio: emDias(9, '19:30'), duracaoH: 5, vis: 'priv', status: 'aberto', cats: ['Street Legal', 'Turbo'], vagas: 32, confirmadas: 29, pendentes: 1 },
  { key: 'toledo-street', nome: 'Arrancada Toledo · Street', tipo: 'arr', org: 'toledo', local: 'arrancadaToledo', inicio: emDias(10, '16:00'), duracaoH: 5, vis: 'pub', status: 'aberto', cats: ['Street Legal', 'Turbo'], vagas: 30, confirmadas: 8 },
  { key: 'triplice', nome: 'Encontro Tríplice Fronteira', tipo: 'enc', org: 'foz', local: 'parqueFoz', inicio: emDias(11, '10:00'), duracaoH: 7, vis: 'pub', status: 'aberto', cats: ['Street Legal', 'Turismo', 'Aspirado', 'Turbo', 'Clássicos'], vagas: 120, confirmadas: 35 },
  { key: 'guarapuava', nome: 'Desafio Aspirados Guarapuava', tipo: 'des', org: 'centroSul', local: 'guarapuava', inicio: emDias(17, '09:00'), duracaoH: 6, vis: 'priv', status: 'aberto', cats: ['Aspirado', 'Turismo'], vagas: 20, confirmadas: 6 },
  // Não aparecem no Feed (servem para testar os filtros de status):
  { key: 'zilmar-2', nome: 'Track Day Zilmar Beux · Etapa 2', tipo: 'td', org: 'oeste', local: 'zilmar', inicio: emDias(-45, '08:00'), duracaoH: 9, vis: 'pub', status: 'encerrado', cats: ['Turismo', 'Turbo', 'Aspirado'], vagas: 40, confirmadas: 0 },
  { key: 'verao', nome: 'Encontro de Verão', tipo: 'enc', org: 'oeste', local: 'lagoAzul', inicio: emDias(60, '10:00'), duracaoH: 6, vis: 'pub', status: 'rascunho', cats: ['Clássicos'], vagas: 60, confirmadas: 0 },
  { key: 'cancelado', nome: 'Arrancada Noturna (cancelada)', tipo: 'arr', org: 'arrancada', local: 'arrancadaCascavel', inicio: emDias(5, '20:00'), duracaoH: 4, vis: 'pub', status: 'cancelado', cats: ['Street Legal'], vagas: 20, confirmadas: 0 },
];

/** Pilotos de demonstração e a categoria do carro de cada um (para as inscrições). */
const NOMES = [
  'Rafael Kowalski', 'Ana Beatriz Moraes', 'Thiago Nishimura', 'Camila Rocha', 'Diego Farias', 'Juliana Pacheco', 'Marcos Vinícius Lopes',
  'Patrícia Weber', 'Eduardo Sartori', 'Letícia Hoffmann', 'Bruno Takahashi', 'Fernanda Zanella', 'Gustavo Andreatta', 'Renata Oliveira',
  'Igor Schmitt', 'Vanessa Costa', 'Henrique Bortolini', 'Sofia Mazur', 'Paulo Reis', 'Leonardo Brandt', 'Otávio Lemos', 'Clara Menegatti',
  'Rogério Casagrande', 'Priscila Nunes', 'André Kuhn', 'Beatriz Lazzari', 'Caio Fontana', 'Daniela Ferri', 'Elias Scheffer', 'Fabiana Zago',
  'Gabriel Toledo', 'Helena Basso', 'Ícaro Mendes', 'Joana Pilati', 'Kleber Rauber', 'Larissa Dalla', 'Mateus Vieira', 'Natália Brum',
  'Orlando Pivetta', 'Pietra Lunardi',
];
const CATS_PILOTOS: Cat[] = [
  ...Array<Cat>(16).fill('Turbo'),
  ...Array<Cat>(14).fill('Street Legal'),
  ...Array<Cat>(4).fill('Turismo'),
  ...Array<Cat>(4).fill('Aspirado'),
  ...Array<Cat>(2).fill('Clássicos'),
];

async function main() {
  if (env.NODE_ENV === 'production') {
    console.error('db:seed cria dados fictícios e não roda com NODE_ENV=production.');
    process.exit(1);
  }
  const db = await mysql.createConnection({ uri: env.DATABASE_URL });
  try {
    await applyLockTimeout(db, env.DB_LOCK_WAIT_TIMEOUT);
    const [[{ n }]] = (await db.query("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'evento'")) as unknown as [[{ n: number }]];
    if (!Number(n)) throw new Error('Tabelas de eventos não encontradas. Rode antes: npm run db:migrate');

    const [cidadeRows] = await db.query<mysql.RowDataPacket[]>('SELECT id, nome FROM cidade');
    const cidade = Object.fromEntries(cidadeRows.map((c) => [c.nome as string, c.id as number]));
    const [catRows] = await db.query<mysql.RowDataPacket[]>('SELECT id, nome FROM categoria');
    const categoria = Object.fromEntries(catRows.map((c) => [c.nome as string, c.id as number]));
    const [[marca]] = (await db.query("SELECT id FROM marca WHERE nome = 'Volkswagen'")) as unknown as [[{ id: number }]];

    await db.beginTransaction();

    // 1) Remove a demonstração anterior (ids determinísticos + contas @seed).
    const eventoIds = EVENTOS.map((e) => seedId(`evento:${e.key}`));
    const localIds = Object.keys(LOCAIS).map((k) => seedId(`local:${k}`));
    const [seedUsers] = await db.query<mysql.RowDataPacket[]>('SELECT id FROM usuario WHERE email LIKE ?', [`%${SEED_DOMAIN}`]);
    const userIds = seedUsers.map((u) => u.id as string);
    await db.query('DELETE FROM inscricao WHERE evento_id IN (?) OR piloto_id IN (?)', [eventoIds, userIds.length ? userIds : ['-']]);
    await db.query('DELETE FROM evento WHERE id IN (?)', [eventoIds]);
    await db.query('DELETE FROM local WHERE id IN (?) AND id NOT IN (SELECT local_id FROM evento)', [localIds]);
    if (userIds.length) {
      await db.query('DELETE FROM veiculo WHERE usuario_id IN (?)', [userIds]);
      await db.query('DELETE FROM usuario WHERE id IN (?)', [userIds]); // organizador, sessões e tokens saem em cascata
    }

    // 2) Organizadores (contas sem senha, e-mail verificado, organizador verificado).
    const orgId: Record<string, string> = {};
    for (const [key, nome] of Object.entries(ORGANIZADORES)) {
      const usuarioId = seedId(`usuario:org:${key}`);
      orgId[key] = seedId(`organizador:${key}`);
      await db.query(
        `INSERT INTO usuario (id, email, nome_completo, cidade_id, perfil, email_verificado_em, termos_versao, termos_aceitos_em)
         VALUES (?, ?, ?, ?, 'org', UTC_TIMESTAMP(3), 'seed', UTC_TIMESTAMP(3))`,
        [usuarioId, `org.${key}${SEED_DOMAIN}`, nome, cidade.Cascavel],
      );
      await db.query(
        `INSERT INTO organizador (id, usuario_id, nome_organizacao, tipo_documento, documento, telefone, verificado, verificado_em)
         VALUES (?, ?, ?, 'cnpj', '11222333000181', '45999990000', 1, UTC_TIMESTAMP(3))`,
        [orgId[key], usuarioId, nome],
      );
    }

    // 3) Locais autorizados.
    for (const [key, l] of Object.entries(LOCAIS)) {
      await db.query(
        `INSERT INTO local (id, nome, tipo_local, cidade_id, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE nome = VALUES(nome)`,
        [seedId(`local:${key}`), l.nome, l.tipo, cidade[l.cidade], l.lat, l.lng],
      );
    }

    // 4) Pilotos com um veículo cada.
    const pilotos = NOMES.map((nome, i) => ({ id: seedId(`usuario:piloto:${i}`), veiculo: seedId(`veiculo:${i}`), nome, cat: CATS_PILOTOS[i]! }));
    for (const [i, p] of pilotos.entries()) {
      await db.query(
        `INSERT INTO usuario (id, email, nome_completo, cidade_id, perfil, email_verificado_em, termos_versao, termos_aceitos_em)
         VALUES (?, ?, ?, ?, 'piloto', UTC_TIMESTAMP(3), 'seed', UTC_TIMESTAMP(3))`,
        [p.id, `piloto${i}${SEED_DOMAIN}`, p.nome, cidade.Cascavel],
      );
      await db.query('INSERT INTO veiculo (id, usuario_id, marca_id, modelo, ano, categoria_id, principal) VALUES (?, ?, ?, ?, 2018, ?, 1)', [p.veiculo, p.id, marca.id, 'Golf GTI', categoria[p.cat]]);
    }

    // 5) Eventos, categorias e inscrições (confirmadas e pendentes de pilotos de categoria aceita).
    let inscricoes = 0;
    for (const e of EVENTOS) {
      const id = seedId(`evento:${e.key}`);
      const fim = new Date(e.inicio.getTime() + e.duracaoH * 3_600_000);
      await db.query(
        `INSERT INTO evento (id, organizador_id, local_id, nome, tipo, descricao, regras, vagas_total, inicio_em, fim_em, briefing_em, visibilidade, status, publicado_em, cancelado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, orgId[e.org], seedId(`local:${e.local}`), e.nome, e.tipo,
          'Evento de demonstração do Fast Street.',
          'Capacete homologado, macacão e luvas. Briefing obrigatório 30 minutos antes.',
          e.vagas, e.inicio, fim, new Date(e.inicio.getTime() - 30 * 60_000), e.vis, e.status,
          e.status === 'rascunho' ? null : new Date(), e.status === 'cancelado' ? new Date() : null,
        ],
      );
      for (const c of e.cats) await db.query('INSERT INTO evento_categoria (evento_id, categoria_id) VALUES (?, ?)', [id, categoria[c]]);
      const aptos = pilotos.filter((p) => e.cats.includes(p.cat));
      const total = e.confirmadas + (e.pendentes ?? 0);
      if (aptos.length < total) throw new Error(`Pilotos insuficientes para "${e.nome}"`);
      for (const [i, p] of aptos.slice(0, total).entries()) {
        await db.query(
          `INSERT INTO inscricao (id, evento_id, piloto_id, veiculo_id, categoria_id, status, regras_aceitas_em)
           VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))`,
          [seedId(`inscricao:${e.key}:${i}`), id, p.id, p.veiculo, categoria[p.cat], i < e.confirmadas ? 'conf' : 'pend'],
        );
        inscricoes++;
      }
    }

    await db.commit();
    const visiveis = EVENTOS.filter((e) => e.status === 'aberto').length;
    console.log(`Seed aplicado: ${Object.keys(ORGANIZADORES).length} organizadores, ${Object.keys(LOCAIS).length} locais, ${pilotos.length} pilotos,`);
    console.log(`${EVENTOS.length} eventos (${visiveis} abertos no Feed) e ${inscricoes} inscrições. Datas relativas a hoje.`);
  } catch (err) {
    await db.rollback().catch(() => undefined);
    if (!isLockTimeout(err)) throw err;
    const schema = new URL(env.DATABASE_URL).pathname.slice(1);
    throw new Error(await explainLockTimeout(db, schema, env.DB_LOCK_WAIT_TIMEOUT), { cause: err });
  } finally {
    await db.end();
  }
}

main().catch((err: Error) => {
  console.error(`Falha no seed: ${err.message}`);
  process.exit(1);
});
