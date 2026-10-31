import { MapTrifold } from 'phosphor-react-native';
import { ComingSoon } from '../../components/ComingSoon';
import { colors } from '../../theme';

export default function Mapa() {
  return (
    <ComingSoon
      kicker="Eventos no mapa"
      title="Mapa"
      text="Os eventos do Feed vão aparecer aqui como pinos, com a mesma origem e os mesmos filtros (UC-04)."
      icon={<MapTrifold size={28} color={colors.primaryText} />}
    />
  );
}
