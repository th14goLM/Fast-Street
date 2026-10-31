import { request } from '../../lib/http';
import type { Usuario } from '../auth/api';

export interface PerfilPayload {
  bio?: string | null;
  instagram?: string | null;
  youtube?: string | null;
  fotoUploadId?: string | null;
}

export const perfilApi = {
  update: (token: string, payload: PerfilPayload) => request<{ usuario: Usuario }>('/usuarios/me', { method: 'PATCH', body: payload, token }),
};
