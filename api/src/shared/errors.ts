export type FieldErrors = Record<string, string>;

/** Erro de domínio com status HTTP e código estável, consumido pelo app. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: FieldErrors,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  invalidCredentials: () => new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos'),
  emailNotVerified: (email: string) =>
    new AppError(403, 'EMAIL_NOT_VERIFIED', 'Sua conta ainda não foi verificada.', undefined, { email }),
  emailTaken: () =>
    new AppError(409, 'EMAIL_TAKEN', 'Este e-mail já tem uma conta.', { email: 'E-mail já cadastrado.' }),
  unauthorized: () => new AppError(401, 'UNAUTHORIZED', 'Sessão inválida ou expirada.'),
  notFound: (what = 'Recurso') => new AppError(404, 'NOT_FOUND', `${what} não encontrado.`),
};
