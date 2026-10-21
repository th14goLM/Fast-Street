import type { RequestHandler } from 'express';
import { Errors } from '../errors.js';
import { verifyAccessToken, type AccessClaims } from '../../modules/auth/jwt.js';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AccessClaims;
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  const claims = scheme === 'Bearer' && token ? verifyAccessToken(token) : null;
  if (!claims) throw Errors.unauthorized();
  req.auth = claims;
  next();
};
