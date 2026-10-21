import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { env } from '../../config/env.js';
import { requireAuth } from '../../shared/http/require-auth.js';
import { LoginSchema, RefreshSchema, RegisterSchema, ResendVerificationSchema, VerifyEmailSchema } from './auth.schemas.js';
import type { AuthService } from './auth.service.js';
import { verificationPage } from './verification-page.js';

export function authRoutes(service: AuthService): Router {
  const router = Router();

  // Proteção contra força bruta / abuso de envio de e-mail (por IP).
  const sensitive = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => env.NODE_ENV === 'test',
    handler: (_req, res) =>
      res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Muitas tentativas. Aguarde alguns minutos.' } }),
  });

  const device = (ua: string | undefined) => ua?.slice(0, 200);

  router.post('/register', sensitive, async (req, res) => {
    const input = RegisterSchema.parse(req.body);
    const result = await service.register(input, device(req.get('user-agent')));
    res.status(201).json(result);
  });

  router.post('/login', sensitive, async (req, res) => {
    const input = LoginSchema.parse({ dispositivo: device(req.get('user-agent')), ...req.body });
    res.json(await service.login(input));
  });

  router.post('/verify-email/resend', sensitive, async (req, res) => {
    const { email } = ResendVerificationSchema.parse(req.body);
    res.status(202).json(await service.resendVerification(email));
  });

  // Link clicado no e-mail (abre no navegador do celular).
  router.get('/verify-email', async (req, res) => {
    const parsed = VerifyEmailSchema.safeParse({ token: req.query.token });
    const ok = parsed.success && (await service.verifyEmail(parsed.data.token));
    res.status(ok ? 200 : 400).type('html').send(verificationPage(ok));
  });

  // Mesmo fluxo em JSON, para deep link no app numa próxima etapa.
  router.post('/verify-email', async (req, res) => {
    const { token } = VerifyEmailSchema.parse(req.body);
    const ok = await service.verifyEmail(token);
    if (!ok) {
      res.status(400).json({ error: { code: 'INVALID_TOKEN', message: 'Link inválido ou expirado.' } });
      return;
    }
    res.json({ verified: true });
  });

  router.post('/refresh', async (req, res) => {
    const { refreshToken } = RefreshSchema.parse(req.body);
    res.json(await service.refresh(refreshToken));
  });

  router.post('/logout', async (req, res) => {
    const { refreshToken } = RefreshSchema.parse(req.body);
    await service.logout(refreshToken);
    res.status(204).end();
  });

  router.get('/me', requireAuth, async (req, res) => {
    res.json({ usuario: await service.me(req.auth!.sub) });
  });

  return router;
}
