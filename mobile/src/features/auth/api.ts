import { request } from '../../lib/http';
import type { Perfil } from './validation';

export interface Usuario {
  id: string;
  email: string;
  nomeCompleto: string;
  perfil: Perfil;
  emailVerificado: boolean;
  cidade: { id: number; nome: string; uf: string };
  organizador: { nomeOrganizacao: string; verificado: boolean } | null;
  bio: string | null;
  instagram: string | null;
  youtubeUrl: string | null;
  fotoUrl: string | null;
}

export interface SessionTokens {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
}

export interface AuthResponse {
  usuario: Usuario;
  tokens: SessionTokens;
}

export interface RegisterPayload {
  email: string;
  senha: string;
  perfil: Perfil;
  nomeCompleto: string;
  cidadeId: number;
  termosAceitos: true;
  organizacao?: { nome: string; documento: string; telefone: string };
}

export interface Cidade {
  id: number;
  nome: string;
  uf: string;
}

export const authApi = {
  register: (p: RegisterPayload) => request<AuthResponse>('/auth/register', { method: 'POST', body: p }),
  login: (email: string, senha: string) => request<AuthResponse>('/auth/login', { method: 'POST', body: { email, senha } }),
  resendVerification: (email: string) =>
    request<{ retryAfterSeconds: number }>('/auth/verify-email/resend', { method: 'POST', body: { email } }),
  refresh: (refreshToken: string) => request<SessionTokens>('/auth/refresh', { method: 'POST', body: { refreshToken } }),
  logout: (refreshToken: string) => request<void>('/auth/logout', { method: 'POST', body: { refreshToken } }),
  me: (accessToken: string) => request<{ usuario: Usuario }>('/auth/me', { token: accessToken }),
  cidades: () => request<{ cidades: Cidade[] }>('/cidades'),
};
