import type { Category, LocalType, Perfil } from './types';

export const EXISTING_EMAIL = 'piloto@faststreet.com.br';
export const EMAIL_RE = /^\S+@\S+\.\S{2,}$/;

export interface SignupForm {
  email: string;
  pwd: string;
  perfil: Perfil;
  nome: string;
  cidade: string;
  org: string;
  doc: string;
  tel: string;
  terms: boolean;
}

export type SignupErrors = Partial<Record<keyof SignupForm, string>>;

/** `email: 'exists'` is a sentinel for "E-mail já cadastrado" (rendered with a login link). */
export function validateSignup(su: SignupForm): SignupErrors {
  const e: SignupErrors = {};
  if (!EMAIL_RE.test(su.email)) e.email = 'Informe um e-mail válido.';
  else if (su.email.trim().toLowerCase() === EXISTING_EMAIL) e.email = 'exists';
  if (su.pwd.length < 8) e.pwd = 'A senha precisa ter ao menos 8 caracteres.';
  if (!su.nome.trim()) e.nome = 'Campo obrigatório.';
  if (!su.cidade) e.cidade = 'Selecione sua cidade.';
  if (su.perfil !== 'piloto') {
    if (!su.org.trim()) e.org = 'Campo obrigatório.';
    const d = su.doc.replace(/\D/g, '');
    if (d.length !== 11 && d.length !== 14) e.doc = 'CPF (11 dígitos) ou CNPJ (14 dígitos) inválido.';
    if (su.tel.replace(/\D/g, '').length < 10) e.tel = 'Telefone inválido.';
  }
  if (!su.terms) e.terms = 'Aceite obrigatório para criar a conta.';
  return e;
}

export function signupErrorSummary(e: SignupErrors) {
  const n = Object.values(e).filter(Boolean).length;
  if (e.email === 'exists' && n === 1) return 'Este e-mail já tem uma conta.';
  return `Revise ${n} ${n > 1 ? 'campos destacados.' : 'campo destacado.'}`;
}

export type LoginOutcome = 'ok' | 'error' | 'unverified';

/** Mock auth rules from the prototype. */
export function checkLogin(email: string, pwd: string): LoginOutcome {
  if (/naoverificado/i.test(email)) return 'unverified';
  if (EMAIL_RE.test(email) && pwd.length >= 8 && pwd !== '12345678') return 'ok';
  return 'error';
}

export interface VehicleFormLike {
  marca: string;
  modelo: string;
  ano: string;
  cat: string;
}

export const MIN_PHOTOS = 3;

/** Human list of what is still missing to save a vehicle (empty = valid). */
export function vehicleMissing(v: VehicleFormLike, photosDone: number): string[] {
  const miss: string[] = [];
  const lacking = MIN_PHOTOS - photosDone;
  if (lacking > 0) miss.push(`${lacking} ${lacking > 1 ? 'fotos' : 'foto'}`);
  if (!v.marca) miss.push('marca');
  if (!v.modelo.trim()) miss.push('modelo');
  if (!/^\d{4}$/.test(v.ano)) miss.push('ano');
  if (!v.cat) miss.push('categoria');
  return miss;
}

export interface EventForm {
  nome: string;
  tipo: string;
  desc: string;
  regras: string;
  cats: Category[];
  vagas: string;
  date: string;
  time: string;
  addr: string;
  place: number | null;
  pinX: number;
  pinY: number;
  localType: LocalType | '';
  vis: 'pub' | 'priv';
}

export type EventFormErrors = Partial<Record<'nome' | 'tipo' | 'regras' | 'cats' | 'vagas' | 'date' | 'time' | 'addr' | 'localType', string>>;

export function validateEventStep(f: EventForm, step: number, today: string): EventFormErrors {
  const e: EventFormErrors = {};
  if (step === 1) {
    if (!f.nome.trim()) e.nome = 'Informe o nome do evento.';
    if (!f.tipo) e.tipo = 'Escolha o tipo de evento.';
    if (!f.regras.trim()) e.regras = 'Descreva as regras mínimas de segurança.';
  }
  if (step === 2) {
    if (!f.cats.length) e.cats = 'Selecione ao menos 1 categoria.';
    if (!(Number(f.vagas) > 0)) e.vagas = 'O limite de vagas precisa ser maior que 0.';
  }
  if (step === 3) {
    if (!f.date) e.date = 'Informe a data do evento.';
    else if (f.date < today) e.date = 'A data não pode estar no passado.';
    if (!f.time) e.time = 'Informe o horário.';
    if (f.place === null) e.addr = 'Selecione um local na busca.';
    if (!f.localType) e.localType = 'Tipo de local autorizado é obrigatório.';
  }
  return e;
}
