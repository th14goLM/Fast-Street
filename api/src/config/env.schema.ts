import { z } from 'zod';

/** Campo vazio no .env (ex.: "SMTP_PORT=") conta como não definido. */
const blank = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

/**
 * Trechos de valores de exemplo (o JWT_SECRET do api/.env.example e o endereço do antigo modelo de
 * produção com Docker). Se aparecerem em produção, o arquivo foi copiado sem ser editado: a API
 * recusa subir em vez de rodar com um segredo público.
 */
export const PLACEHOLDERS_PRODUCAO = {
  JWT_SECRET: /troque/i,
  PUBLIC_API_URL: /SEU-IP/i,
} as const;

/** Esquema das variáveis de ambiente da API. Sem efeitos colaterais: pode ser importado nos testes. */
export const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3333),
    // Interface de escuta. Em produção (systemd + Nginx) use 127.0.0.1: só o Nginx alcança a API.
    // 0.0.0.0 (padrão) atende o desenvolvimento no celular e o contêiner Docker.
    HOST: z.union([z.ipv4(), z.ipv6(), z.literal('localhost')]).default('0.0.0.0'),
    DATABASE_URL: z
      .string()
      .startsWith('mysql://', 'DATABASE_URL deve começar com mysql://')
      .refine((v) => URL.canParse(v), 'DATABASE_URL inválida. Formato: mysql://usuario:senha@127.0.0.1:3306/fast_street')
      .refine(
        (v) => !URL.canParse(v) || /^\/[A-Za-z0-9_]+$/.test(new URL(v).pathname),
        'Falta o nome do banco no fim da DATABASE_URL (ex.: mysql://root:senha@127.0.0.1:3306/fast_street)',
      ),
    // Segundos que o migrate/seed esperam por um bloqueio (lock) antes de desistir com a explicação.
    DB_LOCK_WAIT_TIMEOUT: z.preprocess(
      blank,
      z.coerce.number({ error: 'DB_LOCK_WAIT_TIMEOUT deve ser um número de segundos.' }).int().min(1).max(31_536_000).default(30),
    ),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa de pelo menos 32 caracteres'),
    PUBLIC_API_URL: z.url().default('http://localhost:3333'),
    // Pasta das fotos enviadas (perfil e veículos). Relativa à pasta api/.
    UPLOAD_DIR: z.string().default('uploads'),
    // Envio de e-mail por SMTP (Mailtrap em desenvolvimento). Sem SMTP_HOST, o e-mail é simulado no terminal.
    SMTP_HOST: z.string().trim().optional().transform((v) => v || undefined),
    SMTP_PORT: z.preprocess(blank, z.coerce.number().int().positive().default(587)),
    SMTP_SECURE: z.preprocess(
      blank,
      z
        .enum(['true', 'false'], { error: 'SMTP_SECURE deve ser true, false ou vazio.' })
        .optional()
        .transform((v) => (v === undefined ? undefined : v === 'true')),
    ),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    MAIL_FROM: z.string().default('Fast Street <nao-responda@faststreet.dev>'),
    CORS_ORIGINS: z
      .string()
      .default('')
      .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    if (PLACEHOLDERS_PRODUCAO.JWT_SECRET.test(env.JWT_SECRET)) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET ainda é o valor de exemplo. Gere um novo no servidor: openssl rand -base64 48',
      });
    }
    if (PLACEHOLDERS_PRODUCAO.PUBLIC_API_URL.test(env.PUBLIC_API_URL)) {
      ctx.addIssue({
        code: 'custom',
        path: ['PUBLIC_API_URL'],
        message: 'PUBLIC_API_URL ainda é o valor de exemplo. Use o endereço público: http://<IP-elástico> ou https://<domínio>',
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;
