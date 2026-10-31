/**
 * Validações do cadastro/login no cliente. Espelham api/src/modules/auth/auth.schemas.ts
 * (mesmas regras e mensagens) para dar feedback imediato; o servidor continua sendo a fonte da verdade.
 */
export type Perfil = 'piloto' | 'org' | 'ambos';

export interface SignupForm {
  email: string;
  senha: string;
  perfil: Perfil;
  nomeCompleto: string;
  cidadeId: number | null;
  orgNome: string;
  orgDocumento: string;
  orgTelefone: string;
  termosAceitos: boolean;
}

export type SignupField = keyof SignupForm;
export type SignupErrors = Partial<Record<SignupField, string>>;

const EMAIL_RE = /^\S+@\S+\.\S{2,}$/;
export const onlyDigits = (v: string) => v.replace(/\D/g, '');
export const isValidEmail = (v: string) => EMAIL_RE.test(v.trim());

const allSame = (d: string) => /^(\d)\1+$/.test(d);

export function isValidCpf(v: string): boolean {
  const d = onlyDigits(v);
  if (d.length !== 11 || allSame(d)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

export function isValidCnpj(v: string): boolean {
  const d = onlyDigits(v);
  if (d.length !== 14 || allSame(d)) return false;
  const calc = (len: number) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = w.reduce((acc, x, i) => acc + Number(d[i]) * x, 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

/** Máscara de exibição: 000.000.000-00 (até 11 dígitos) ou 00.000.000/0000-00. */
export function formatDocumento(v: string): string {
  const d = onlyDigits(v).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/** Valida um campo isolado (ao sair dele), com as mesmas regras do envio. */
export function validateField(field: SignupField, f: SignupForm): string | undefined {
  return validateSignup(f)[field];
}

/** Há algo digitado que se perderia ao sair da tela? */
export function isSignupDirty(f: SignupForm): boolean {
  return !!(f.email || f.senha || f.nomeCompleto || f.cidadeId || f.orgNome || f.orgDocumento || f.orgTelefone);
}

export function validateSignup(f: SignupForm): SignupErrors {
  const e: SignupErrors = {};
  if (!isValidEmail(f.email)) e.email = 'Informe um e-mail válido.';
  if (f.senha.length < 8) e.senha = 'A senha precisa ter ao menos 8 caracteres.';
  if (!f.nomeCompleto.trim()) e.nomeCompleto = 'Campo obrigatório.';
  if (!f.cidadeId) e.cidadeId = 'Selecione sua cidade.';
  if (f.perfil !== 'piloto') {
    if (!f.orgNome.trim()) e.orgNome = 'Campo obrigatório.';
    if (!isValidCpf(f.orgDocumento) && !isValidCnpj(f.orgDocumento)) e.orgDocumento = 'CPF (11 dígitos) ou CNPJ (14 dígitos) inválido.';
    const tel = onlyDigits(f.orgTelefone);
    if (tel.length < 10 || tel.length > 11) e.orgTelefone = 'Telefone inválido.';
  }
  if (!f.termosAceitos) e.termosAceitos = 'Aceite obrigatório para criar a conta.';
  return e;
}

/** Converte as chaves de erro da API (ex.: "organizacao.documento") para os campos do formulário. */
export function mapServerFields(fields: Record<string, string> | undefined): SignupErrors {
  if (!fields) return {};
  const map: Record<string, SignupField> = {
    email: 'email',
    senha: 'senha',
    perfil: 'perfil',
    nomeCompleto: 'nomeCompleto',
    cidadeId: 'cidadeId',
    termosAceitos: 'termosAceitos',
    'organizacao.nome': 'orgNome',
    'organizacao.documento': 'orgDocumento',
    'organizacao.telefone': 'orgTelefone',
  };
  const out: SignupErrors = {};
  for (const [k, v] of Object.entries(fields)) {
    const field = map[k];
    if (field) out[field] = v;
  }
  return out;
}

export const errorSummary = (n: number) => `Revise ${n} ${n > 1 ? 'campos destacados.' : 'campo destacado.'}`;

/** Máscara de exibição: (45) 99999-0000. */
export function formatPhone(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
