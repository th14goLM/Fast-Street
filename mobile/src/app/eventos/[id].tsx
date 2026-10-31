import { router } from 'expo-router';
import { FlagCheckered } from 'phosphor-react-native';
import { ComingSoon } from '../../components/ComingSoon';
import { colors } from '../../theme';

export default function DetalheEvento() {
  return (
    <ComingSoon
      kicker="Evento"
      title="Detalhes"
      text="Regras, programação, vagas por categoria e inscrição (UC-05) vão ficar nesta tela."
      icon={<FlagCheckered size={28} color={colors.primaryText} />}
      onBack={() => router.back()}
    />
  );
}
