import { Trophy } from 'phosphor-react-native';
import { ComingSoon } from '../../components/ComingSoon';
import { colors } from '../../theme';

export default function Ranking() {
  return (
    <ComingSoon
      kicker="Resultados oficiais"
      title="Ranking"
      text="Classificação por categoria e por temporada, com os resultados publicados pelos organizadores."
      icon={<Trophy size={28} color={colors.gulf} />}
    />
  );
}
