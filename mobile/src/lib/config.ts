import Constants from 'expo-constants';

/**
 * URL da API. Ordem de prioridade:
 * 1. EXPO_PUBLIC_API_URL (arquivo .env do app);
 * 2. em desenvolvimento, o IP da máquina que roda o Metro (funciona no celular físico
 *    na mesma rede) na porta 3333;
 * 3. localhost.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (__DEV__ && host) return `http://${host}:3333`;
  return 'http://localhost:3333';
}

export const API_URL = resolveApiUrl();
