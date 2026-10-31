import { useState } from 'react';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { EyeSlash, HandPointing, MapPinArea, MapTrifold } from 'phosphor-react-native';
import { PermissionPoint, PermissionStep } from '../../components/PermissionStep';
import { KEYS, secureStorage } from '../../lib/storage';
import { colors } from '../../theme';

/** Passo 3 de 4 · Localização. Sem permissão, o app usa a cidade escolhida no cadastro. */
export default function PermissaoLocalizacao() {
  const [asking, setAsking] = useState(false);
  const next = () => router.replace('/cadastro/notificacoes');

  async function allow() {
    setAsking(true);
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      await secureStorage.set(KEYS.locationMode, granted ? 'gps' : 'manual');
    } catch {
      // Plataforma sem suporte (ou erro do sistema): segue com a cidade do cadastro.
      await secureStorage.set(KEYS.locationMode, 'manual');
    } finally {
      setAsking(false);
      next();
    }
  }

  async function manual() {
    await secureStorage.set(KEYS.locationMode, 'manual');
    next();
  }

  return (
    <PermissionStep
      kicker="Passo 3 de 4 · Localização"
      title="Eventos perto de você"
      text="Usamos sua localização para mostrar eventos e parceiros próximos e calcular a distância até cada local."
      icon={<MapPinArea size={36} color={colors.primaryText} />}
      primary={{ label: 'Permitir localização', onPress: allow, loading: asking }}
      secondary={{ label: 'Definir local manualmente', onPress: manual }}
    >
      <PermissionPoint icon={<EyeSlash size={20} color={colors.gulf} />}>Sua posição nunca aparece para outros usuários.</PermissionPoint>
      <PermissionPoint icon={<MapTrifold size={20} color={colors.gulf} />}>O mapa mostra apenas eventos e parceiros.</PermissionPoint>
      <PermissionPoint icon={<HandPointing size={20} color={colors.gulf} />}>
        Prefere não permitir? Usamos a cidade que você escolheu no cadastro.
      </PermissionPoint>
    </PermissionStep>
  );
}
