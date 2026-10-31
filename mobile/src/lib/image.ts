import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export const MAX_IMAGE_BYTES = 1024 * 1024; // 1024 KB, mesmo limite da API (RN-VEI-02)

/** Tentativas da maior para a menor qualidade até caber no limite. */
const ATTEMPTS = [
  { width: 1600, compress: 0.82 },
  { width: 1600, compress: 0.65 },
  { width: 1280, compress: 0.6 },
  { width: 1024, compress: 0.5 },
];

export interface PreparedImage {
  uri: string;
  width: number;
  height: number;
  bytes: number;
}

/** Tamanho real a partir do base64 (descontando o padding "="). */
const base64Bytes = (b64: string) => Math.floor((b64.length * 3) / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0);

/**
 * Fotos de celular costumam passar de 1024 KB (e o iPhone usa HEIC). Aqui a imagem é
 * reduzida e convertida para JPEG até caber no limite, para o usuário não ver erro à toa.
 */
export async function prepareImage(uri: string, originalWidth: number): Promise<PreparedImage> {
  for (const { width, compress } of ATTEMPTS) {
    const context = ImageManipulator.manipulate(uri);
    if (originalWidth > width) context.resize({ width });
    const ref = await context.renderAsync();
    const result = await ref.saveAsync({ format: SaveFormat.JPEG, compress, base64: true });
    const bytes = result.base64 ? base64Bytes(result.base64) : 0;
    if (bytes && bytes <= MAX_IMAGE_BYTES) return { uri: result.uri, width: result.width, height: result.height, bytes };
  }
  throw new Error('Não foi possível reduzir a foto para até 1024 KB. Escolha outra imagem.');
}
