import { describe, expect, it } from 'vitest';
import { EnvSchema } from '../src/config/env.schema.js';

// Valores de exemplo que já foram copiados sem editar (incidente da migração para a AWS, 19/11/2026).
const JWT_EXEMPLO = 'troque-por-um-segredo-novo-com-pelo-menos-32-caracteres';
const URL_EXEMPLO = 'http://SEU-IP-ELASTICO';

const base = {
  DATABASE_URL: 'mysql://fast_street:senha@mysql:3306/fast_street',
  JWT_SECRET: 'Zr7xq2Lk9VbN4mPw8sTe1YhC6uJd3FgA5oRi0nKl',
  PUBLIC_API_URL: 'http://18.116.147.33',
};

const camposComErro = (env: Record<string, string>) => {
  const r = EnvSchema.safeParse(env);
  return r.success ? [] : r.error.issues.map((i) => i.path.join('.'));
};

describe('variáveis de ambiente em produção', () => {
  it('aceita valores reais', () => {
    expect(EnvSchema.safeParse({ ...base, NODE_ENV: 'production' }).success).toBe(true);
  });

  it('recusa o JWT_SECRET de exemplo', () => {
    expect(camposComErro({ ...base, NODE_ENV: 'production', JWT_SECRET: JWT_EXEMPLO })).toEqual(['JWT_SECRET']);
  });

  it('recusa o JWT_SECRET de exemplo sem diferenciar maiúsculas', () => {
    expect(camposComErro({ ...base, NODE_ENV: 'production', JWT_SECRET: JWT_EXEMPLO.toUpperCase() })).toEqual(['JWT_SECRET']);
  });

  it('recusa o PUBLIC_API_URL de exemplo', () => {
    expect(camposComErro({ ...base, NODE_ENV: 'production', PUBLIC_API_URL: URL_EXEMPLO })).toEqual(['PUBLIC_API_URL']);
  });

  it('aponta os dois campos quando o api/.env foi copiado sem editar', () => {
    expect(
      camposComErro({ ...base, NODE_ENV: 'production', JWT_SECRET: JWT_EXEMPLO, PUBLIC_API_URL: URL_EXEMPLO }).sort(),
    ).toEqual(['JWT_SECRET', 'PUBLIC_API_URL']);
  });

  it('escuta em 0.0.0.0 por padrão e aceita 127.0.0.1 (produção atrás do Nginx)', () => {
    const padrao = EnvSchema.parse({ ...base });
    expect(padrao.HOST).toBe('0.0.0.0');
    expect(EnvSchema.parse({ ...base, NODE_ENV: 'production', HOST: '127.0.0.1' }).HOST).toBe('127.0.0.1');
    expect(EnvSchema.safeParse({ ...base, HOST: 'servidor qualquer' }).success).toBe(false);
  });

  it('não bloqueia os valores de exemplo fora de produção', () => {
    for (const NODE_ENV of ['development', 'test']) {
      expect(
        EnvSchema.safeParse({ ...base, NODE_ENV, JWT_SECRET: JWT_EXEMPLO, PUBLIC_API_URL: URL_EXEMPLO }).success,
      ).toBe(true);
    }
  });
});
