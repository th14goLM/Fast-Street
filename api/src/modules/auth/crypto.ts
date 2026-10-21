import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_COST = 12;

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, BCRYPT_COST);
export const verifyPassword = (plain: string, hash: string): Promise<boolean> => bcrypt.compare(plain, hash);

/**
 * Hash usado quando o e-mail não existe, para que o tempo de resposta do login
 * seja igual ao de uma senha errada (evita enumeração de contas por timing).
 */
export const DUMMY_HASH = bcrypt.hashSync('fast-street-dummy-password', BCRYPT_COST);

/** Token opaco de alta entropia (URL-safe) e seu SHA-256, que é o que vai para o banco. */
export function newOpaqueToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: sha256(token) };
}

export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
