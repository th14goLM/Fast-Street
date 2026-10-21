import { useEffect, useState } from 'react';

/** Contagem regressiva em segundos (cooldown de reenvio de e-mail, RN-CAD-07). */
export function useCooldown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return { left, start: (seconds: number) => setLeft(seconds) };
}
