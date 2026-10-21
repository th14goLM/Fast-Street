import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const ISSUER = 'fast-street-api';

export interface AccessClaims {
  sub: string; // usuario.id
  sid: string; // sessao.id
}

export function signAccessToken(claims: AccessClaims): string {
  return jwt.sign(claims, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: ACCESS_TOKEN_TTL_SECONDS, issuer: ISSUER });
}

export function verifyAccessToken(token: string): AccessClaims | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'], issuer: ISSUER });
    if (typeof payload === 'string' || typeof payload.sub !== 'string' || typeof payload.sid !== 'string') return null;
    return { sub: payload.sub, sid: payload.sid };
  } catch {
    return null;
  }
}
