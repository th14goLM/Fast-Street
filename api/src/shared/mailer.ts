export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/** Porta de envio de e-mail. Troque o ConsoleMailer por SMTP/SES/Resend em produção. */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export class ConsoleMailer implements Mailer {
  async send({ to, subject, text }: MailMessage): Promise<void> {
    console.log(`\n✉️  [e-mail simulado] para: ${to}\n    assunto: ${subject}\n    ${text.replace(/\n/g, '\n    ')}\n`);
  }
}
