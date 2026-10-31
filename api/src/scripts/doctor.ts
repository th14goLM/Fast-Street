/**
 * Diagnóstico do ambiente local: `npm run doctor` (dentro de api/).
 * Confere .env, conexão com o MySQL, banco, migrations, IP para o celular e portas,
 * e diz o que corrigir. Não altera nada e nunca imprime senhas.
 */
import { constants, existsSync, readdirSync, readFileSync } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { SmtpMailer } from '../shared/mailer.js';

type Level = 'ok' | 'warn' | 'fail';
const ICON: Record<Level, string> = { ok: '✔', warn: '⚠', fail: '✖' };
let fails = 0;
let warns = 0;

function report(level: Level, title: string, fix?: string) {
  if (level === 'fail') fails++;
  if (level === 'warn') warns++;
  console.log(`${ICON[level]} ${title}`);
  if (fix && level !== 'ok') console.log(`    → ${fix.replace(/\n/g, '\n      ')}`);
}

const section = (name: string) => console.log(`\n── ${name}`);

/** Esconde a senha ao mostrar a URL. */
const mask = (u: URL) => `${u.protocol}//${decodeURIComponent(u.username)}:****@${u.host}${u.pathname}`;

const PLACEHOLDERS = ['troque-por-um-segredo-com-pelo-menos-32-caracteres', 'SUA_SENHA', 'troque-esta-senha'];

/** IPv4 da máquina nas redes locais (o celular precisa de um destes). */
function localIPv4(): string[] {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i): i is os.NetworkInterfaceInfo => !!i && i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254'))
    .map((i) => i.address);
}

const portFree = (port: number) =>
  new Promise<boolean>((resolve) => {
    const srv = net.createServer().once('error', () => resolve(false));
    srv.listen(port, '0.0.0.0', () => srv.close(() => resolve(true)));
  });

async function main() {
  const apiDir = process.cwd();
  console.log('Fast Street · diagnóstico do ambiente');
  console.log(`Pasta: ${apiDir}`);

  section('Node.js');
  const [maj = 0, min = 0] = process.versions.node.split('.').map(Number);
  if (maj > 20 || (maj === 20 && min >= 19)) report('ok', `Node ${process.versions.node}`);
  else report('fail', `Node ${process.versions.node} é antigo`, 'Instale o Node 22 LTS (nodejs.org) e reabra o IntelliJ.');

  section('Arquivo api/.env');
  const envPath = path.join(apiDir, '.env');
  if (!existsSync(envPath)) {
    report('fail', `.env não encontrado em ${envPath}`, 'Rode este comando dentro da pasta api: copy .env.example .env (depois preencha).');
    return finish();
  }
  report('ok', '.env encontrado');
  const env = dotenv.parse(readFileSync(envPath));
  if (existsSync(path.join(apiDir, '..', '.env')) && env.DATABASE_URL?.includes(':3307/')) {
    report('warn', 'DATABASE_URL usa a porta 3307 (MySQL do Docker)', 'Se você usa o MySQL do Workbench, a porta é 3306.');
  }

  // PORT
  const port = Number(env.PORT ?? 3333);
  if (!Number.isInteger(port) || port <= 0) report('fail', `PORT inválida (${env.PORT})`, 'Use PORT=3333');
  else if (port === 3306 || port === 3307) report('fail', `PORT=${port} é a porta do MySQL`, 'A API precisa de outra porta: PORT=3333');
  else report('ok', `PORT=${port}`);
  // Porta usada nas sugestões: a do .env se for válida; senão a padrão.
  const apiPort = Number.isInteger(port) && port > 0 && port !== 3306 && port !== 3307 ? port : 3333;

  // JWT_SECRET
  const secret = env.JWT_SECRET ?? '';
  if (secret.length < 32 || PLACEHOLDERS.includes(secret))
    report('fail', 'JWT_SECRET ausente, curto ou ainda com o texto de exemplo', `Gere um: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`);
  else report('ok', `JWT_SECRET definido (${secret.length} caracteres)`);

  // PUBLIC_API_URL
  const ips = localIPv4();
  let pub: URL | null = null;
  try {
    pub = new URL(env.PUBLIC_API_URL ?? 'http://localhost:3333');
  } catch {
    report('fail', `PUBLIC_API_URL inválida (${env.PUBLIC_API_URL})`, `Use PUBLIC_API_URL=http://${ips[0] ?? 'SEU-IP'}:${apiPort}`);
  }
  if (pub) {
    const pubPort = Number(pub.port || (pub.protocol === 'https:' ? 443 : 80));
    if (pubPort !== apiPort) report('fail', `PUBLIC_API_URL usa a porta ${pubPort}, mas deve usar a da API (${apiPort})`, `Use PUBLIC_API_URL=http://${pub.hostname}:${apiPort}`);
    else if (['localhost', '127.0.0.1'].includes(pub.hostname))
      report('warn', 'PUBLIC_API_URL aponta para localhost', `O link de verificação não abre no celular. Use PUBLIC_API_URL=http://${ips[0] ?? 'SEU-IP'}:${apiPort}`);
    else if (ips.length && !ips.includes(pub.hostname))
      report('warn', `PUBLIC_API_URL usa ${pub.hostname}, que não é um IP desta máquina (${ips.join(', ')})`, `Se mudou de rede, use PUBLIC_API_URL=http://${ips[0]}:${apiPort}`);
    else report('ok', `PUBLIC_API_URL=${pub.origin}`);
  }

  // DATABASE_URL
  section('Banco de dados (MySQL)');
  let db: URL | null = null;
  try {
    db = new URL(env.DATABASE_URL ?? '');
    if (db.protocol !== 'mysql:') throw new Error();
  } catch {
    report('fail', 'DATABASE_URL ausente ou inválida', 'Formato: DATABASE_URL=mysql://root:SUA_SENHA@127.0.0.1:3306/fast_street');
    return finish();
  }
  const dbName = db.pathname.replace(/^\//, '');
  // Sem o nome do banco ainda dá para testar usuário/senha: assim todos os problemas aparecem de uma vez.
  const hasDbName = /^[A-Za-z0-9_]+$/.test(dbName);
  if (!hasDbName) report('fail', `Falta o nome do banco no fim da DATABASE_URL (${mask(db)})`, `Termine a URL com /fast_street, ex.: mysql://${decodeURIComponent(db.username) || 'root'}:SUA_SENHA@${db.host}/fast_street`);
  if (PLACEHOLDERS.some((p) => decodeURIComponent(db!.password) === p)) report('fail', 'A senha na DATABASE_URL ainda é a do exemplo', 'Troque pela senha do seu MySQL.');
  if (hasDbName) report('ok', `DATABASE_URL: ${mask(db)}`);

  const server = new URL(db.toString());
  server.pathname = '/';
  let conn: mysql.Connection;
  try {
    conn = await mysql.createConnection({ uri: server.toString(), connectTimeout: 5000 });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'ECONNREFUSED')
      report('fail', `Nenhum MySQL ouvindo em ${db.host}`, db.port === '3307'
        ? 'A porta 3307 é do Docker. Se usa o Workbench, troque para 3306 na DATABASE_URL.'
        : 'Abra o MySQL (Workbench → Server → Startup/Shutdown, ou services.msc → MySQL80 → Iniciar) e confira a porta.');
    else if (code === 'ER_ACCESS_DENIED_ERROR')
      report('fail', `Usuário ou senha recusados para "${decodeURIComponent(db.username)}"`, decodeURIComponent(db.username) === 'fast_street'
        ? 'O usuário fast_street é o do Docker. No Workbench use root (ou crie o usuário: veja docs/GUIA_MOBILE_API.md).'
        : 'Confira usuário e senha: são os mesmos que você usa para conectar no Workbench.');
    else report('fail', `Falha ao conectar: ${(err as Error).message}`);
    return finish();
  }
  report('ok', `Conectado ao MySQL em ${db.host} como "${decodeURIComponent(db.username)}"`);
  if (!hasDbName) {
    await conn.end();
    return finish();
  }

  try {
    const [[ver]] = (await conn.query('SELECT VERSION() AS v')) as unknown as [[{ v: string }]];
    if (Number(ver.v.split('.')[0]) >= 8) report('ok', `MySQL ${ver.v}`);
    else report('fail', `MySQL ${ver.v}`, 'O projeto precisa do MySQL 8 ou mais novo.');

    const [dbs] = await conn.query<mysql.RowDataPacket[]>('SHOW DATABASES LIKE ?', [dbName]);
    if (!dbs.length) {
      report('fail', `O banco "${dbName}" não existe`, 'Rode: npm run db:migrate (ele cria o banco e as tabelas).');
      return finish();
    }
    report('ok', `Banco "${dbName}" existe`);

    const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', 'migrations');
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    let applied: string[] = [];
    try {
      const [rows] = await conn.query<mysql.RowDataPacket[]>(`SELECT nome FROM \`${dbName}\`.schema_migrations`);
      applied = rows.map((r) => r.nome as string);
    } catch {
      /* tabela ainda não existe */
    }
    const pending = files.filter((f) => !applied.includes(f));
    if (pending.length) report('fail', `Migrations pendentes: ${pending.join(', ')}`, 'Rode: npm run db:migrate');
    else report('ok', `Migrations em dia (${files.length})`);

    const [testDb] = await conn.query<mysql.RowDataPacket[]>('SHOW DATABASES LIKE ?', [`${dbName}_test`]);
    if (testDb.length) report('ok', `Banco de testes "${dbName}_test" existe`);
    else report('warn', `Banco de testes "${dbName}_test" não existe (só necessário para npm test)`, `No Workbench: CREATE DATABASE ${dbName}_test;`);
  } finally {
    await conn.end();
  }

  section('E-mail (verificação de conta)');
  const smtpHost = env.SMTP_HOST?.trim();
  if (!smtpHost) {
    report('warn', 'E-mail simulado: o link de verificação aparece no terminal da API', 'Para receber os e-mails no Mailtrap, preencha SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASS no .env (veja .env.example).');
  } else {
    const smtpPort = Number(env.SMTP_PORT?.trim() || 587);
    const mailer = new SmtpMailer({
      host: smtpHost,
      port: smtpPort,
      secure: env.SMTP_SECURE?.trim() ? env.SMTP_SECURE.trim() === 'true' : smtpPort === 465,
      user: env.SMTP_USER?.trim() || undefined,
      pass: env.SMTP_PASS || undefined,
      from: env.MAIL_FROM || 'Fast Street <nao-responda@faststreet.dev>',
    });
    try {
      await mailer.verify();
      report('ok', `SMTP ${smtpHost}:${smtpPort}: conexão e credenciais OK`);
    } catch (err) {
      const e = err as { code?: string; responseCode?: number; message: string };
      if (e.code === 'EAUTH' || e.responseCode === 535)
        report('fail', `SMTP recusou usuário/senha (${smtpHost})`, 'Copie de novo Username e Password da sua inbox no Mailtrap (Integration → SMTP).');
      else if (e.code === 'ETIMEDOUT' || e.code === 'ECONNREFUSED' || e.code === 'ESOCKET')
        report('fail', `Sem conexão com ${smtpHost}:${smtpPort} (${e.code})`, 'Confira host e porta. Se a rede bloquear a porta, tente 2525 ou 587.');
      else report('fail', `Falha no SMTP: ${e.message}`, 'Confira SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER e SMTP_PASS.');
    }
  }

  section('Fotos (uploads)');
  const uploadDir = path.resolve(apiDir, env.UPLOAD_DIR ?? 'uploads');
  try {
    await mkdir(uploadDir, { recursive: true });
    await access(uploadDir, constants.W_OK);
    report('ok', `Pasta de fotos com permissão de escrita: ${uploadDir}`);
  } catch {
    report('fail', `Sem permissão para gravar em ${uploadDir}`, 'Ajuste UPLOAD_DIR no .env para uma pasta sua.');
  }

  section('Porta da API');
  if (await portFree(port)) report('ok', `Porta ${port} livre (a API pode iniciar com npm run dev)`);
  else {
    const health = await fetch(`http://127.0.0.1:${port}/health`).then((r) => r.ok).catch(() => false);
    if (health) report('ok', `A API já está rodando na porta ${port}`);
    else report('fail', `A porta ${port} está ocupada por outro programa`, 'Feche o programa ou troque PORT no .env (e a porta da PUBLIC_API_URL).');
  }

  section('Celular');
  if (ips.length) {
    report('ok', `IP desta máquina na rede: ${ips.join(', ')}`);
    console.log(`    No navegador do celular (mesmo Wi-Fi), abra http://${ips[0]}:${port}/cidades com a API rodando.`);
    console.log(`    Se não abrir, libere a porta (PowerShell como Administrador):`);
    console.log(`    New-NetFirewallRule -DisplayName "Fast Street API ${port}" -Direction Inbound -Protocol TCP -LocalPort ${port} -Action Allow -Profile Private,Domain`);
  } else report('warn', 'Nenhuma rede local encontrada', 'Conecte o computador ao Wi-Fi ou cabo para testar no celular.');

  finish();
}

function finish() {
  console.log(`\nResultado: ${fails ? `${fails} problema(s)` : 'nenhum problema'}${warns ? `, ${warns} aviso(s)` : ''}.`);
  process.exitCode = fails ? 1 : 0;
}

main().catch((err) => {
  console.error('Erro inesperado no diagnóstico:', err);
  process.exitCode = 1;
});
