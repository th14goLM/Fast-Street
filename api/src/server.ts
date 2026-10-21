import { env } from './config/env.js';
import { createApp } from './app.js';
import { pool } from './db/pool.js';

const server = createApp().listen(env.PORT, '0.0.0.0', () => {
  console.log(`Fast Street API ouvindo em http://0.0.0.0:${env.PORT} (${env.NODE_ENV})`);
});

const shutdown = () => {
  server.close(() => void pool.end().then(() => process.exit(0)));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
