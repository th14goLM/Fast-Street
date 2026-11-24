import { env } from './config/env.js';
import { createApp } from './app.js';
import { pool } from './db/pool.js';
import { createMailer, SmtpMailer } from './shared/mailer.js';

const mailer = createMailer(env);
const server = createApp({ mailer }).listen(env.PORT, env.HOST, () => {
  console.log(`Fast Street API ouvindo em http://${env.HOST}:${env.PORT} (${env.NODE_ENV})`);
  console.log(`E-mail: ${mailer.description}`);
  // Confere as credenciais SMTP já na inicialização, para o erro não aparecer só no primeiro cadastro.
  if (mailer instanceof SmtpMailer) {
    mailer.verify().then(
      () => console.log('E-mail: conexão SMTP OK'),
      (err: Error) => console.error(`E-mail: falha na conexão SMTP (${err.message}). Confira SMTP_* no api/.env.`),
    );
  }
});

const shutdown = () => {
  server.close(() => void pool.end().then(() => process.exit(0)));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
