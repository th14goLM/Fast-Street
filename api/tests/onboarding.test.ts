import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { migrate } from '../src/db/migrate.js';
import { pool } from '../src/db/pool.js';
import type { Mailer } from '../src/shared/mailer.js';
import { resetDb } from './helpers.js';

const silentMailer: Mailer = { description: 'silencioso', send: async () => {} };
const app = createApp({ mailer: silentMailer });

// Arquivos mínimos com a assinatura correta (o servidor checa os bytes, não a extensão).
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 2)]);

let cidadeId: number;
let marcas: { id: number; nome: string }[];
let categorias: { id: number; nome: string }[];

async function novoUsuario(email = 'piloto@faststreet.dev'): Promise<string> {
  const res = await request(app)
    .post('/auth/register')
    .send({ email, senha: 'Pista2026!', perfil: 'piloto', nomeCompleto: 'Lucas Andrade', cidadeId, termosAceitos: true })
    .expect(201);
  return res.body.tokens.accessToken as string;
}

const enviar = (token: string, finalidade: string, buf: Buffer, nome = 'foto.png') =>
  request(app).post(`/uploads?finalidade=${finalidade}`).set('Authorization', `Bearer ${token}`).attach('arquivo', buf, nome);

async function fotosVeiculo(token: string, n = 3): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < n; i++) ids.push((await enviar(token, 'foto_veiculo', i % 2 ? JPEG : PNG).expect(201)).body.id);
  return ids;
}

const id = (lista: { id: number; nome: string }[], nome: string) => lista.find((x) => x.nome === nome)!.id;

beforeAll(async () => {
  await migrate(process.env.DATABASE_URL, () => {});
  const [rows] = await pool.query<any[]>("SELECT id FROM cidade WHERE nome = 'Cascavel'");
  cidadeId = rows[0].id;
  const cat = await request(app).get('/catalogo/veiculos').expect(200);
  marcas = cat.body.marcas;
  categorias = cat.body.categorias;
});
beforeEach(resetDb);
afterAll(() => pool.end());

describe('GET /catalogo/veiculos', () => {
  it('traz as marcas do MVP e as 5 categorias na ordem do protótipo', () => {
    expect(marcas.map((m) => m.nome)).toEqual(['Chevrolet', 'Ford', 'Honda', 'Toyota', 'Volkswagen']);
    expect(categorias.map((c) => c.nome)).toEqual(['Street Legal', 'Turismo', 'Aspirado', 'Turbo', 'Clássicos']);
  });
});

describe('POST /uploads', () => {
  it('aceita PNG e JPEG pela assinatura do arquivo', async () => {
    const token = await novoUsuario();
    const png = await enviar(token, 'foto_perfil', PNG).expect(201);
    const jpg = await enviar(token, 'foto_veiculo', JPEG, 'carro.jpg').expect(201);
    expect(png.body.url).toMatch(/^http:\/\/localhost:3333\/media\/\d{4}\/\d{2}\/[0-9a-f-]+\.png$/);
    expect(jpg.body.url).toMatch(/\.jpg$/);
  });

  it('recusa outro formato mesmo com extensão de imagem (415)', async () => {
    const token = await novoUsuario();
    const res = await enviar(token, 'foto_perfil', Buffer.from('GIF89a…'), 'falsa.png').expect(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_TYPE');
  });

  it('recusa arquivo acima de 1024 KB (413)', async () => {
    const token = await novoUsuario();
    const big = Buffer.concat([PNG, Buffer.alloc(1024 * 1024)]);
    const res = await enviar(token, 'foto_perfil', big).expect(413);
    expect(res.body.error).toMatchObject({ code: 'FILE_TOO_LARGE' });
  });

  it('exige sessão e finalidade válida', async () => {
    await request(app).post('/uploads?finalidade=foto_perfil').attach('arquivo', PNG, 'a.png').expect(401);
    const token = await novoUsuario();
    await enviar(token, 'outra', PNG).expect(422);
  });
});

describe('PATCH /usuarios/me (UC-16)', () => {
  it('salva bio, normaliza o Instagram com @ e aceita link do YouTube', async () => {
    const token = await novoUsuario();
    const res = await request(app)
      .patch('/usuarios/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ bio: '  Track days desde 2018.  ', instagram: 'lucas.andrade.tt', youtube: 'youtube.com/@lucas' })
      .expect(200);
    expect(res.body.usuario).toMatchObject({ bio: 'Track days desde 2018.', instagram: '@lucas.andrade.tt', youtubeUrl: 'youtube.com/@lucas' });
  });

  it('valida com as mensagens do protótipo', async () => {
    const token = await novoUsuario();
    const res = await request(app)
      .patch('/usuarios/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ bio: 'x'.repeat(161), instagram: 'nome com espaço', youtube: 'canal-lucas' })
      .expect(422);
    expect(res.body.error.fields).toEqual({
      bio: 'A bio pode ter no máximo 160 caracteres.',
      instagram: 'Use apenas letras, números, ponto ou _ (ex.: @seuperfil).',
      youtube: 'Use um link do YouTube (youtube.com/@canal).',
    });
  });

  it('define a foto de perfil e a serve em /media', async () => {
    const token = await novoUsuario();
    const up = await enviar(token, 'foto_perfil', PNG).expect(201);
    const res = await request(app).patch('/usuarios/me').set('Authorization', `Bearer ${token}`).send({ fotoUploadId: up.body.id }).expect(200);
    expect(res.body.usuario.fotoUrl).toBe(up.body.url);
    const media = await request(app).get(new URL(up.body.url).pathname).expect(200);
    expect(media.headers['content-type']).toBe('image/png');
    expect(media.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('não aceita foto de veículo nem upload de outro usuário como foto de perfil', async () => {
    const token = await novoUsuario();
    const outro = await novoUsuario('outro@faststreet.dev');
    const deVeiculo = (await enviar(token, 'foto_veiculo', PNG)).body.id;
    const doOutro = (await enviar(outro, 'foto_perfil', PNG)).body.id;
    for (const fotoUploadId of [deVeiculo, doOutro]) {
      const res = await request(app).patch('/usuarios/me').set('Authorization', `Bearer ${token}`).send({ fotoUploadId }).expect(422);
      expect(res.body.error.fields).toEqual({ fotoUploadId: 'Foto não encontrada. Envie de novo.' });
    }
  });
});

describe('POST /veiculos (UC-01)', () => {
  const civic = () => ({
    marcaId: id(marcas, 'Honda'),
    modelo: 'Civic Si',
    ano: '2019',
    cor: 'Cinza Grafite',
    categoriaId: id(categorias, 'Turbo'),
    motor: '1.5 Turbo 16V',
    potenciaCv: '205',
    torqueKgfm: '26,5',
    pesoKg: '1.335',
    transmissao: 'Manual 6M',
    modificacoes: 'Intake de fibra\nEscape inox 2,5"\n',
  });

  it('cria o primeiro veículo como principal, com fotos em ordem e números no formato BR', async () => {
    const token = await novoUsuario();
    const fotoIds = await fotosVeiculo(token, 4);
    const res = await request(app).post('/veiculos').set('Authorization', `Bearer ${token}`).send({ ...civic(), fotoIds }).expect(201);
    expect(res.body.veiculo).toMatchObject({
      nome: 'Honda Civic Si',
      ano: 2019,
      principal: true,
      categoria: { nome: 'Turbo' },
      especificacoes: { potenciaCv: 205, torqueKgfm: 26.5, pesoKg: 1335, modificacoes: ['Intake de fibra', 'Escape inox 2,5"'] },
    });
    expect(res.body.veiculo.fotos.map((f: { ordem: number }) => f.ordem)).toEqual([1, 2, 3, 4]);
  });

  it('o segundo veículo não é principal; a lista traz o principal primeiro', async () => {
    const token = await novoUsuario();
    await request(app).post('/veiculos').set('Authorization', `Bearer ${token}`).send({ ...civic(), fotoIds: await fotosVeiculo(token) }).expect(201);
    const golf = await request(app)
      .post('/veiculos')
      .set('Authorization', `Bearer ${token}`)
      .send({ marcaId: id(marcas, 'Volkswagen'), modelo: 'Golf GTI', ano: 2016, categoriaId: id(categorias, 'Turbo'), fotoIds: await fotosVeiculo(token) })
      .expect(201);
    expect(golf.body.veiculo).toMatchObject({ nome: 'VW Golf GTI', principal: false, cor: null });
    const lista = await request(app).get('/veiculos').set('Authorization', `Bearer ${token}`).expect(200);
    expect(lista.body.veiculos.map((v: { nome: string }) => v.nome)).toEqual(['Honda Civic Si', 'VW Golf GTI']);
  });

  it('valida campos obrigatórios, ano e quantidade de fotos', async () => {
    const token = await novoUsuario();
    const res = await request(app)
      .post('/veiculos')
      .set('Authorization', `Bearer ${token}`)
      .send({ modelo: ' ', ano: '19', fotoIds: (await fotosVeiculo(token, 2)) })
      .expect(422);
    expect(res.body.error.fields).toMatchObject({
      marcaId: 'Selecione a marca.',
      modelo: 'Informe o modelo.',
      ano: 'Informe o ano com 4 dígitos.',
      categoriaId: 'Selecione a categoria.',
      fotoIds: 'Envie ao menos 3 fotos.',
    });
  });

  it('não reaproveita fotos já usadas nem fotos de outro usuário', async () => {
    const token = await novoUsuario();
    const outro = await novoUsuario('outro@faststreet.dev');
    const fotoIds = await fotosVeiculo(token);
    await request(app).post('/veiculos').set('Authorization', `Bearer ${token}`).send({ ...civic(), fotoIds }).expect(201);
    const reuso = await request(app).post('/veiculos').set('Authorization', `Bearer ${token}`).send({ ...civic(), fotoIds }).expect(422);
    expect(reuso.body.error.fields.fotoIds).toMatch(/não estão mais disponíveis/);
    const alheias = await request(app).post('/veiculos').set('Authorization', `Bearer ${outro}`).send({ ...civic(), fotoIds: await fotosVeiculo(token) }).expect(422);
    expect(alheias.body.error.fields.fotoIds).toMatch(/não estão mais disponíveis/);
  });
});
