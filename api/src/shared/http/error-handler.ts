import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, type FieldErrors } from '../errors.js';

/** Converte `organizacao.documento` etc. em mapa campo → primeira mensagem. */
export function zodFieldErrors(err: ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    fields[key] ??= issue.message;
  }
  return fields;
}

const summary = (n: number): string => `Revise ${n} ${n > 1 ? 'campos destacados.' : 'campo destacado.'}`;

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const fields = zodFieldErrors(err);
    res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: summary(Object.keys(fields).length), fields } });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, fields: err.fields, ...err.details } });
    return;
  }
  // JSON malformado no corpo da requisição.
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'JSON inválido.' } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Erro inesperado. Tente novamente.' } });
};
