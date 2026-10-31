import { StyleSheet, Text, View } from 'react-native';
import { Info } from 'phosphor-react-native';
import { colors, type } from '../../theme';

/** Aviso de formato e tamanho em todo campo de upload (pedido do usuário no protótipo). */
export function FileHint({ perPhoto }: { perPhoto?: boolean }) {
  return (
    <View style={styles.row}>
      <Info size={14} color={colors.gulf} />
      <Text style={[type.caption, { color: colors.textSecondary }]}>PNG, JPG ou JPEG · até 1024 KB{perPhoto ? ' por foto' : ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 6 } });
