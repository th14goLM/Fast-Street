import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function persist(tokens: SessionTokens | null) {
  if (tokens) await secureStorage.set(KEYS.session, JSON.stringify(tokens));
  else await secureStorage.remove(KEYS.session);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [tokens, setTokens] = useState<SessionTokens | null>(null);

  // Restaura a sessão salva: rotaciona o refresh token e busca o usuário.
  useEffect(() => {
    (async () => {
      try {
        const raw = await secureStorage.get(KEYS.session);
        if (!raw) return setStatus('signedOut');
        const saved = JSON.parse(raw) as SessionTokens;
        const fresh = await authApi.refresh(saved.refreshToken);
        const { usuario: u } = await authApi.me(fresh.accessToken);
        await persist(fresh);
        setTokens(fresh);
        setUsuario(u);
        setStatus('signedIn');
      } catch (err) {
        // Sem rede: mantém os tokens para tentar de novo depois; sessão inválida: limpa.
        if (!(err instanceof ApiError && err.status === 0)) await persist(null);
        setStatus('signedOut');
      }
    })();
  }, []);

  const start = useCallback(async ({ usuario: u, tokens: t }: AuthResponse) => {
    await persist(t);
    setTokens(t);
    setUsuario(u);
    setStatus('signedIn');
    return u;
  }, []);

  const signIn = useCallback(async (email: string, senha: string) => start(await authApi.login(email, senha)), [start]);
  const signUp = useCallback(async (payload: RegisterPayload) => start(await authApi.register(payload)), [start]);

  const signOut = useCallback(async () => {
    const t = tokens;
    await persist(null);
    setTokens(null);
    setUsuario(null);
    setStatus('signedOut');
    if (t) await authApi.logout(t.refreshToken).catch(() => undefined);
  }, [tokens]);

  const value = useMemo(() => ({ status, usuario, signIn, signUp, signOut }), [status, usuario, signIn, signUp, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
