import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Preferências e cache que não são segredo (local escolhido, cache do Feed).
 * Falhas de leitura/escrita nunca quebram a tela: o app segue sem o valor salvo.
 */
export const prefs = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  async set(key: string, value: unknown): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* armazenamento indisponível: ignora */
    }
  },
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      /* ignora */
    }
  },
};

export const PREF_KEYS = {
  /** Cidade escolhida em "Alterar local" (id) ou null para usar o GPS/cidade do cadastro. */
  feedCidade: 'fs.feed.cidade',
  /** Última resposta do Feed, para o modo offline. */
  feedCache: 'fs.feed.cache',
} as const;
