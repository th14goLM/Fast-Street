import { z } from 'zod';
import { documentoTipo, onlyDigits } from '../../shared/validators/documento.js';

/** Mesmo padrão do protótipo (RN-CAD-01). */
const EMAIL_RE = /^\S+@\S+\.\S{2,}$/;

const email = z
  .string({ error: 'Informe um e-mail válido.' })
  .trim()
  .toLowerCase()
  .max(254, 'Informe um e-mail válido.')
  .regex(EMAIL_RE, 'Informe um e-mail válido.');

// bcrypt ignora o que passa de 72 bytes: limitamos para não aceitar senhas "truncadas".
const senha = z
  .string({ error: 'A senha precisa ter ao menos 8 caracteres.' })
  .min(8, 'A senha precisa ter ao menos 8 caracteres.')
  .refine((s) => Buffer.byteLength(s, 'utf8') <= 72, 'A senha pode ter no máximo 72 caracteres.');

export const PERFIS = ['piloto', 'org', 'ambos'] as const;
export type Perfil = (typeof PERFIS)[number];

export const RegisterSchema = z
  .object({
    email,
    senha,
    perfil: z.enum(PERFIS, { error: 'Escolha como você vai usar o Fast Street.' }),
    nomeCompleto: z.string({ error: 'Campo obrigatório.' }).trim().min(1, 'Campo obrigatório.').max(120, 'Use no máximo 120 caracteres.'),
    cidadeId: z.coerce.number({ error: 'Selecione sua cidade.' }).int().positive('Selecione sua cidade.'),
    termosAceitos: z.literal(true, { error: 'Aceite obrigatório para criar a conta.' }),
    organizacao: z
      .object({
        nome: z.string().trim().max(120, 'Use no máximo 120 caracteres.').default(''),
        documento: z.string().default('').transform(onlyDigits),
        telefone: z.string().default('').transform(onlyDigits),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.perfil === 'piloto') return;
    const org = data.organizacao ?? { nome: '', documento: '', telefone: '' };
    if (!org.nome) ctx.addIssue({ code: 'custom', path: ['organizacao', 'nome'], message: 'Campo obrigatório.' });
    if (!documentoTipo(org.documento))
      ctx.addIssue({ code: 'custom', path: ['organizacao', 'documento'], message: 'CPF (11 dígitos) ou CNPJ (14 dígitos) inválido.' });
    if (org.telefone.length < 10 || org.telefone.length > 11)
      ctx.addIssue({ code: 'custom', path: ['organizacao', 'telefone'], message: 'Telefone inválido.' });
  });
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email,
  senha: z.string({ error: 'Informe sua senha.' }).min(1, 'Informe sua senha.'),
  dispositivo: z.string().trim().max(200).optional(),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const ResendVerificationSchema = z.object({ email });
export const RefreshSchema = z.object({ refreshToken: z.string().min(20) });
export const VerifyEmailSchema = z.object({ token: z.string().min(20) });
