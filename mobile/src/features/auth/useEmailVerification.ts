import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../../context/AuthContext';

const MIN_INTERVAL_MS = 3000;

/**
 * Descobre quando o usuário confirmou o e-mail. A confirmação acontece fora do app
 * (link aberto no app de e-mail ou no navegador), então checamos:
 * - quando o app volta para o primeiro plano;
 * - quando o usuário toca em "Já confirmei".
 */
export function useEmailVerification() {
  const { usuario, refreshUsuario } = useAuth();
  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);
  const [justVerified, setJustVerified] = useState(false);
  const lastCheck = useRef(0);
  const pending = !!usuario && !usuario.emailVerificado;

  const check = useCallback(
    async (manual: boolean) => {
      const now = Date.now();
      if (!manual && now - lastCheck.current < MIN_INTERVAL_MS) return;
      lastCheck.current = now;
      if (manual) setChecking(true);
      setNotYet(false);
      try {
        const u = await refreshUsuario();
        if (u.emailVerificado) setJustVerified(true);
        else if (manual) setNotYet(true);
      } catch {
        // Sem rede: tenta de novo na próxima volta ao app ou no próximo toque.
        if (manual) setNotYet(true);
      } finally {
        if (manual) setChecking(false);
      }
    },
    [refreshUsuario],
  );

  useEffect(() => {
    if (!pending) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check(false);
    });
    return () => sub.remove();
  }, [pending, check]);

  return { pending, checking, notYet, justVerified, checkNow: () => check(true) };
}
