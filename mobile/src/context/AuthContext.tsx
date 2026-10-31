import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { authApi, type AuthResponse, type RegisterPayload, type SessionTokens, type Usuario } from '../features/auth/api';
import { ApiError } from '../lib/http';
import { KEYS, secureStorage } from '../lib/storage';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: Status;
  usuario: Usuario | null;
  signIn: (email: string, senha: string) => Promise<Usuario>;
  signUp: (payload: RegisterPayload) => Promise<Usuario>;
  signOut: () => Promise<void>;
  /** Executa uma chamada autenticada, renovando o access token quando vence (15 min) ou volta 401. */
  withToken: <T>(call: (accessToken: string) => Promise<T>) => Promise<T>;
  /** Atualiza o usuário em memória depois de editar o perfil. */
  setUsuario: (u: Usuario) => void;
  /** Busca o usuário de novo na API (ex.: para saber se o e-mail já foi confirmado). */
  refreshUsuario: () => Promise<Usuario>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Tokens + instante (ms) em que o access token vence. */
type Session = SessionTokens & { expiresAt: number };

const withExpiry = (t: SessionTokens): Session => ({ ...t, expiresAt: Date.now() + t.accessTokenExpiresIn * 1000 });
const RENEW_MARGIN_MS = 30_000;

async function persist(session: Session | null) {
  if (session) await secureStorage.set(KEYS.session, JSON.stringify(session));
  else await secureStorage.remove(KEYS.session);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  // Ref (e não state): as chamadas em andamento precisam ver o token mais novo na hora.
  const session = useRef<Session | null>(null);
  const refreshing = useRef<Promise<Session> | null>(null);

  const clear = useCallback(async () => {
    session.current = null;
    await persist(null);
    setUsuario(null);
    setStatus('signedOut');
  }, []);

  /** Rotaciona o refresh token. Chamadas simultâneas compartilham a mesma renovação. */
  const refresh = useCallback(async (): Promise<Session> => {
    const current = session.current;
    if (!current) throw new ApiError(401, 'UNAUTHORIZED', 'Sessão encerrada.');
    refreshing.current ??= authApi
      .refresh(current.refreshToken)
      .then(async (t) => {
        const next = withExpiry(t);
        session.current = next;
        await persist(next);
        return next;
      })
      .finally(() => {
        refreshing.current = null;
      });
    return refreshing.current;
  }, []);

  // Restaura a sessão salva: rotaciona o refresh token e busca o usuário.
  useEffect(() => {
    (async () => {
      try {
        const raw = await secureStorage.get(KEYS.session);
        if (!raw) return setStatus('signedOut');
        session.current = JSON.parse(raw) as Session;
        const fresh = await refresh();
        const { usuario: u } = await authApi.me(fresh.accessToken);
        setUsuario(u);
        setStatus('signedIn');
      } catch (err) {
        // Sem rede: mantém os tokens para tentar de novo depois; sessão inválida: limpa.
        if (err instanceof ApiError && err.status === 0) {
          session.current = null;
          setStatus('signedOut');
        } else await clear();
      }
    })();
  }, [refresh, clear]);

  const withToken = useCallback(
    async <T,>(call: (accessToken: string) => Promise<T>): Promise<T> => {
      let s = session.current;
      if (!s) throw new ApiError(401, 'UNAUTHORIZED', 'Sessão encerrada. Entre de novo.');
      try {
        if (s.expiresAt - RENEW_MARGIN_MS < Date.now()) s = await refresh();
        return await call(s.accessToken);
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 401) throw err;
        // Token recusado: tenta uma renovação; se ela falhar, a sessão acabou.
        try {
          s = await refresh();
        } catch {
          await clear();
          throw new ApiError(401, 'UNAUTHORIZED', 'Sua sessão expirou. Entre de novo.');
        }
        return call(s.accessToken);
      }
    },
    [refresh, clear],
  );

  const start = useCallback(async ({ usuario: u, tokens: t }: AuthResponse) => {
    session.current = withExpiry(t);
    await persist(session.current);
    setUsuario(u);
    setStatus('signedIn');
    return u;
  }, []);

  const refreshUsuario = useCallback(async () => {
    const { usuario: u } = await withToken((token) => authApi.me(token));
    setUsuario(u);
    return u;
  }, [withToken]);

  const signIn = useCallback(async (email: string, senha: string) => start(await authApi.login(email, senha)), [start]);
  const signUp = useCallback(async (payload: RegisterPayload) => start(await authApi.register(payload)), [start]);

  const signOut = useCallback(async () => {
    const refreshToken = session.current?.refreshToken;
    await clear();
    if (refreshToken) await authApi.logout(refreshToken).catch(() => undefined);
  }, [clear]);

  const value = useMemo(
    () => ({ status, usuario, signIn, signUp, signOut, withToken, setUsuario, refreshUsuario }),
    [status, usuario, signIn, signUp, signOut, withToken, refreshUsuario],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
