import * as Location from 'expo-location';
import { KEYS, secureStorage } from '../../lib/storage';
import { prefs, PREF_KEYS } from '../../lib/prefs';

export type Origem =
  | { tipo: 'gps'; lat: number; lng: number }
  | { tipo: 'cidade'; cidadeId?: number } // sem cidadeId: a API usa a cidade do cadastro
  | { tipo: 'semPermissao' };

/**
 * De onde medir as distâncias:
 * 1. cidade escolhida em "Alterar local";
 * 2. GPS, se o usuário permitiu no onboarding;
 * 3. cidade do cadastro.
 */
export async function resolverOrigem(): Promise<Origem> {
  const escolhida = await prefs.get<number>(PREF_KEYS.feedCidade);
  if (escolhida) return { tipo: 'cidade', cidadeId: escolhida };

  const modo = await secureStorage.get(KEYS.locationMode);
  if (modo !== 'gps') return { tipo: 'cidade' };
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) return { tipo: 'semPermissao' };
    // Posição recente (rápida); se não houver, pede a atual com precisão moderada.
    const ultima = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000 });
    const pos = ultima ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { tipo: 'gps', lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return { tipo: 'cidade' };
  }
}

/** Pede a permissão de novo (estado "sem localização"). Retorna true se concedida. */
export async function pedirLocalizacao(): Promise<boolean> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    await secureStorage.set(KEYS.locationMode, granted ? 'gps' : 'manual');
    if (granted) await prefs.remove(PREF_KEYS.feedCidade);
    return granted;
  } catch {
    return false;
  }
}

/** "Alterar local": fixa uma cidade, ou volta ao GPS com null. */
export async function escolherCidade(cidadeId: number | null): Promise<void> {
  if (cidadeId) await prefs.set(PREF_KEYS.feedCidade, cidadeId);
  else {
    await prefs.remove(PREF_KEYS.feedCidade);
    await secureStorage.set(KEYS.locationMode, 'gps');
  }
}
