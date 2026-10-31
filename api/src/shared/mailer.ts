import nodemailer, { type Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  /** Versão em texto puro (obrigatória: clientes sem HTML e filtros de spam usam). */
  text: string;
  html?: string;
}

/** Porta de envio de e-mail. As telas e o serviço de autenticação só conhecem esta interface. */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
  /** Descrição para o log de inicialização (sem credenciais). */
  readonly description: string;
}

/** Sem SMTP configurado: imprime o e-mail (e o link) no terminal da API. */
export class ConsoleMailer implements Mailer {
  readonly description = 'simulado (o link aparece neste terminal; configure SMTP_* no .env para enviar de verdade)';

  async send({ to, subject, text }: MailMessage): Promise<void> {
    console.log(`\n✉️  [e-mail simulado] para: ${to}\n    assunto: ${subject}\n    ${text.replace(/\n/g, '\n    ')}\n`);
  }
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}

/**
 * Envio real por SMTP. Funciona com Mailtrap (sandbox de desenvolvimento), Gmail
 * (senha de app) e serviços de produção (Resend, Amazon SES, Brevo): muda só o .env.
 */
export class SmtpMailer implements Mailer {
  private readonly transport: Transporter;
  readonly description: string;

  constructor(private readonly config: SmtpConfig) {
    this.transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure, // true só na porta 465 (TLS direto); nas demais usa STARTTLS
      auth: config.user ? { user: config.user, pass: config.pass ?? '' } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
    });
    this.description = `SMTP ${config.host}:${config.port}${config.user ? ' (com autenticação)' : ''}`;
  }

  async send(message: MailMessage): Promise<void> {
    await this.transport.sendMail({ from: this.config.from, ...message });
  }

  /** Testa conexão e credenciais (usado no log de inicialização). */
  verify(): Promise<true> {
    return this.transport.verify();
  }
}

export interface MailEnv {
  SMTP_HOST?: string;
  SMTP_PORT: number;
  SMTP_SECURE?: boolean;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  MAIL_FROM: string;
}

/** SMTP quando SMTP_HOST estiver definido; senão, o envio simulado no terminal. */
export function createMailer(e: MailEnv): Mailer {
  if (!e.SMTP_HOST) return new ConsoleMailer();
  return new SmtpMailer({
    host: e.SMTP_HOST,
    port: e.SMTP_PORT,
    secure: e.SMTP_SECURE ?? e.SMTP_PORT === 465,
    user: e.SMTP_USER || undefined,
    pass: e.SMTP_PASS || undefined,
    from: e.MAIL_FROM,
  });
}
