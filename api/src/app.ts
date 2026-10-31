import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { AuthService } from './modules/auth/auth.service.js';
import { catalogoRoutes } from './modules/catalogo/catalogo.routes.js';
import { cidadesRoutes } from './modules/cidades/cidades.routes.js';
import { uploadsRoutes } from './modules/uploads/uploads.routes.js';
import { usuariosRoutes } from './modules/usuarios/usuarios.routes.js';
import { veiculosRoutes } from './modules/veiculos/veiculos.routes.js';
import { errorHandler } from './shared/http/error-handler.js';
import { createMailer, type Mailer } from './shared/mailer.js';
import { MEDIA_PREFIX, UPLOAD_ROOT } from './shared/storage.js';

export function createApp({ mailer = createMailer(env) }: { mailer?: Mailer } = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  // As fotos (/media) são exibidas pelo app, que roda em outra origem: libera o CORP para elas.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.CORS_ORIGINS.length ? env.CORS_ORIGINS : true }));
  app.use(express.json({ limit: '32kb' }));

  app.get('/health', async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  });
  app.use('/auth', authRoutes(new AuthService(mailer)));
  app.use('/cidades', cidadesRoutes());
  app.use('/catalogo', catalogoRoutes());
  app.use('/usuarios', usuariosRoutes());
  app.use('/uploads', uploadsRoutes());
  app.use('/veiculos', veiculosRoutes());
  // Imagens enviadas. Nomes são UUIDs (não adivinháveis); sem listagem de diretório.
  app.use(MEDIA_PREFIX, express.static(UPLOAD_ROOT, { index: false, dotfiles: 'deny', maxAge: '7d', immutable: true }));

  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } }));
  app.use(errorHandler);
  return app;
}
