import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { BellRinging, CheckCircle, FlagCheckered, Trophy } from 'phosphor-react-native';
import { PermissionStep } from '../../components/PermissionStep';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, type } from '../../theme';

/** Passo 3 de 4 · Notificações. Conta só Organizador não cadastra veículo e termina aqui. */
export default function PermissaoNotificacoes() {
  const { usuario } = useAuth();
  const [asking, setAsking] = useState(false);

  const next = () => {
    if (usuario?.perfil === 'org') router.replace({ pathname: '/feed', params: { aviso: 'org' } });
    else router.replace('/cadastro/veiculo');
  };

  async function allow() {
    setAsking(true);
    try {
      await Notifications.requestPermissionsAsync();
    } catch {
      // Web/Expo Go sem suporte: a preferência pode ser ligada depois em Configurações.
    } finally {
      setAsking(false);
      next();
    }
  }

  return (
    <PermissionStep
      kicker="Passo 3 de 4 · Notificações"
      title="Fique no grid"
      text="Avisamos quando algo importante acontecer com seus eventos. Você escolhe os tipos em Configurações."
      icon={<BellRinging size={36} color={colors.primaryText} />}
      primary={{ label: 'Ativar notificações', onPress: allow, loading: asking }}
      secondary={{ label: 'Agora não', onPress: next }}
    >
      <View style={{ gap: 8 }}>
        <Item icon={<CheckCircle size={20} weight="fill" color={colors.success} />} label="Inscrição aprovada" />
        <Item icon={<FlagCheckered size={20} color={colors.primaryText} />} label="Novo evento na sua região" />
        <Item icon={<Trophy size={20} weight="fill" color={colors.gulf} />} label="Resultado publicado e conquistas" />
      </View>
    </PermissionStep>
  );
}

function Item({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.item}>
      {icon}
      <Text style={[type.body, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceElevated,
  },
});
