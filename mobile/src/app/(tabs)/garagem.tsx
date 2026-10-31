import { Garage } from 'phosphor-react-native';
import { ComingSoon } from '../../components/ComingSoon';
import { colors } from '../../theme';

export default function Garagem() {
  return (
    <ComingSoon
      kicker="Seus veículos"
      title="Garagem"
      text="Aqui você vai gerenciar seus veículos, escolher o principal e ver o histórico em cada evento."
      icon={<Garage size={28} color={colors.primaryText} />}
    />
  );
}
