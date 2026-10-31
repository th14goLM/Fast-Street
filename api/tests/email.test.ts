import { SMTPServer } from 'smtp-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { migrate } from '../src/db/migrate.js';
import { pool } from '../src/db/pool.js';
import { verificationEmail } from '../src/modules/auth/emails.js';
import { ConsoleMailer, createMailer, SmtpMailer, type Mailer } from '../src/shared/mailer.js';
import { resetDb } from './helpers.js';

describe('modelo do e-mail de verificação', () => {
  const link = 'http://192.168.0.10:3333/auth/verify-email?token=abc_DEF-123';

  it('tem texto puro e HTML com o botão apontando para o link', () => {
    const m = verificationEmail('Lucas Andrade', link, 24);
    expect(m.subject).toBe('Confirme seu e-mail · Fast Street');
    expect(m.text).toContain('Olá, Lucas!');
    expect(m.text).toContain(link);
    expect(m.text).toContain('24 horas');
    expect(m.html).toContain(`href="${link}"`);
    expect(m.html).toContain('Confirmar e-mail');
  });

  it('escapa o nome digitado no cadastro (sem HTML injetado no e-mail)', () => {
    const m = verificationEmail('<img src=x onerror=alert(1)> Silva', link, 24);
    expect(m.html).not.toContain('<img src=x');
    expect(m.html).toContain('&lt;img');
  });
});

describe('escolha do envio', () => {
  it('sem SMTP_HOST, usa o envio simulado; com SMTP_HOST, usa SMTP', () => {
    expect(createMailer({ SMTP_PORT: 587, MAIL_FROM: 'x@y.z' })).toBeInstanceOf(ConsoleMailer);
    const smtp = createMailer({ SMTP_HOST: 'sandbox.smtp.mailtrap.io', SMTP_PORT: 2525, SMTP_USER: 'usuario-mt', SMTP_PASS: 'senha-secreta-123', MAIL_FROM: 'x@y.z' });
    expect(smtp).toBeInstanceOf(SmtpMailer);
    // O log de inicialização mostra o servidor, mas nunca usuário ou senha.
    expect(smtp.description).toBe('SMTP sandbox.smtp.mailtrap.io:2525 (com autenticação)');
    expect(smtp.description).not.toMatch(/usuario-mt|senha-secreta-123/);
  });
});

/** Decodifica quoted-printable (como o nodemailer codifica corpo com acentos e linhas longas). */
const decodeQP = (raw: string) =>
  raw.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));

describe('envio por SMTP (servidor SMTP local, como o Mailtrap)', () => {
  const received: { from?: string; to: string[]; raw: string; user?: string }[] = [];
  let server: SMTPServer;
  let port: number;

  beforeAll(async () => {
    server = new SMTPServer({
      secure: false,
      disabledCommands: ['STARTTLS'],
      authOptional: false,
      onAuth(auth, _session, cb) {
        if (auth.username === 'mailtrap-user' && auth.password === 'mailtrap-pass') return cb(null, { user: auth.username });
        cb(new Error('Credenciais inválidas'));
      },
      onData(stream, session, cb) {
        let raw = '';
        stream.on('data', (c: Buffer) => (raw += c.toString('utf8')));
        stream.on('end', () => {
          received.push({
            from: session.envelope.mailFrom ? session.envelope.mailFrom.address : undefined,
            to: session.envelope.rcptTo.map((r) => r.address),
            raw,
            user: session.user as string | undefined,
          });
          cb();
        });
      },
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.server.address() as { port: number }).port;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const mailer = (pass = 'mailtrap-pass') =>
    new SmtpMailer({ host: '127.0.0.1', port, secure: false, user: 'mailtrap-user', pass, from: 'Fast Street <nao-responda@faststreet.dev>' });

  it('autentica, entrega com remetente, destinatário, texto e HTML', async () => {
    await mailer().verify();
    await mailer().send({ to: 'lucas@faststreet.dev', ...verificationEmail('Lucas', 'http://x/verify?token=t1', 24) });
    const m = received.at(-1)!;
    expect(m.user).toBe('mailtrap-user');
    expect(m.from).toBe('nao-responda@faststreet.dev');
    expect(m.to).toEqual(['lucas@faststreet.dev']);
    expect(m.raw).toMatch(/Content-Type: text\/plain/);
    expect(m.raw).toMatch(/Content-Type: text\/html/);
    expect(decodeQP(m.raw)).toContain('http://x/verify?token=t1');
    expect(decodeQP(m.raw)).toContain('href="http://x/verify?token=t1"');
  });

  it('com senha errada, o envio falha (e o verify da inicialização acusa)', async () => {
    await expect(mailer('errada').verify()).rejects.toThrow();
  });
});

describe('cadastro com o provedor de e-mail fora do ar', () => {
  const broken: Mailer = {
    description: 'quebrado',
    send: async () => {
      throw new Error('SMTP indisponível');
    },
  };
  const app = createApp({ mailer: broken });
  let cidadeId: number;

  beforeAll(async () => {
    await migrate(process.env.DATABASE_URL, () => {});
    const [rows] = await pool.query<any[]>("SELECT id FROM cidade WHERE nome = 'Cascavel'");
    cidadeId = rows[0].id;
  });
  beforeEach(resetDb);
  afterAll(() => pool.end());

  it('cria a conta mesmo assim; o reenvio continua respondendo igual', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'lucas@faststreet.dev', senha: 'Pista2026!', perfil: 'piloto', nomeCompleto: 'Lucas', cidadeId, termosAceitos: true })
      .expect(201);
    await pool.query('UPDATE token_autenticacao SET created_at = created_at - INTERVAL 61 SECOND');
    await request(app).post('/auth/verify-email/resend').send({ email: 'lucas@faststreet.dev' }).expect(202);
  });
});
