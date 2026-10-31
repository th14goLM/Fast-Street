import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Armazenamento de segredos (tokens). Keychain/Keystore no iOS/Android;
 * na web (apenas desenvolvimento) cai para localStorage.
 */
export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return void globalThis.localStorage?.setItem(key, value);
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') return void globalThis.localStorage?.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  },
};

export const KEYS = {
  session: 'fs.session',
  onboardingSeen: 'fs.onboardingSeen',
  /** 'gps' ou 'manual' (usa a cidade do cadastro). */
  locationMode: 'fs.locationMode',
} as const;
