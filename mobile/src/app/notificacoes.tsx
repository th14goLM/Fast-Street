import { router } from 'expo-router';
import { Bell } from 'phosphor-react-native';
import { ComingSoon } from '../components/ComingSoon';
import { colors } from '../theme';

export default function Notificacoes() {
  return (
    <ComingSoon
      kicker="Central"
      title="Notificações"
      text="Inscrições aprovadas, lembretes de briefing e novos eventos perto de você vão aparecer aqui."
      icon={<Bell size={28} color={colors.primaryText} />}
      onBack={() => router.back()}
    />
  );
}
