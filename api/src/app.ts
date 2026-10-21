import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { AuthService } from './modules/auth/auth.service.js';
import { cidadesRoutes } from './modules/cidades/cidades.routes.js';
import { errorHandler } from './shared/http/error-handler.js';
import { ConsoleMailer, type Mailer } from './shared/mailer.js';

export function createApp({ mailer = new ConsoleMailer() }: { mailer?: Mailer } = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS.length ? env.CORS_ORIGINS : true }));
  app.use(express.json({ limit: '32kb' }));

  app.get('/health', async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  });
  app.use('/auth', authRoutes(new AuthService(mailer)));
  app.use('/cidades', cidadesRoutes());

  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } }));
  app.use(errorHandler);
  return app;
}
