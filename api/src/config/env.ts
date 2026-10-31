import 'dotenv/config';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().startsWith('mysql://', 'DATABASE_URL deve começar com mysql://'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa de pelo menos 32 caracteres'),
  PUBLIC_API_URL: z.url().default('http://localhost:3333'),
  // Pasta das fotos enviadas (perfil e veículos). Relativa à pasta api/.
  UPLOAD_DIR: z.string().default('uploads'),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
});

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
export type Env = typeof env;
