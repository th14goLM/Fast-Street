import { Platform } from 'react-native';
import { API_URL } from './config';
import { ApiError, NETWORK_ERROR } from './http';

export type Finalidade = 'foto_perfil' | 'foto_veiculo';

export interface UploadResult {
  id: string;
  url: string;
}

/**
 * Envia uma imagem para POST /uploads com progresso real (0–1). Usa XMLHttpRequest
 * porque o fetch do React Native não informa o progresso de envio.
 */
export async function uploadImage(
  uri: string,
  finalidade: Finalidade,
  accessToken: string,
  onProgress?: (fraction: number) => void,
): Promise<UploadResult> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    // Na web o seletor devolve blob:/data: URIs; o FormData precisa do Blob em si.
    const blob = await (await fetch(uri)).blob();
    form.append('arquivo', blob, 'foto.jpg');
  } else {
    // No iOS/Android o FormData aceita o descritor { uri, name, type } e lê o arquivo nativamente.
    form.append('arquivo', { uri, name: 'foto.jpg', type: 'image/jpeg' } as unknown as Blob);
  }

  return new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/uploads?finalidade=${finalidade}`);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = 60_000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      let body: { id?: string; url?: string; error?: { code: string; message: string } } | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* resposta não-JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body?.id && body.url) return resolve({ id: body.id, url: body.url });
      reject(new ApiError(xhr.status, body?.error?.code ?? 'UPLOAD_FAILED', body?.error?.message ?? 'Falha no envio da foto.'));
    };
    const networkError = () => reject(new ApiError(0, NETWORK_ERROR, 'Falha no envio. Verifique sua conexão.'));
    xhr.onerror = networkError;
    xhr.ontimeout = networkError;
    xhr.send(form);
  });
}
