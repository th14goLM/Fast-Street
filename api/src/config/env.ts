import 'dotenv/config';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { EnvSchema } from './env.schema.js';

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:', z.prettifyError(parsed.error));
  // Causa mais comum em um clone novo: o .env não vai para o git (guarda senhas).
  const envPath = path.resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    console.error(
      `\nArquivo .env não encontrado em ${envPath}.\n` +
        'Crie-o a partir do exemplo e preencha DATABASE_URL e JWT_SECRET:\n' +
        '  copy .env.example .env      (Windows)\n' +
        '  cp .env.example .env        (macOS/Linux)\n' +
        'Passo a passo em docs/GUIA_MOBILE_API.md.',
    );
  }
  process.exit(1);
}

export const env = parsed.data;
export type { Env } from './env.schema.js';
