import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CaretRight } from 'phosphor-react-native';
import type { EventoFeed } from '../../features/feed/api';
import { blocoData, distancia, TIPO_LOCAL, vagas } from '../../features/feed/format';
import { colors, fonts, type } from '../../theme';

/** Linha das listas "Esta semana" / "Mais eventos": bloco de data + nome + local · distância · visibilidade. */
export function EventRow({ evento, onPress, comMes }: { evento: EventoFeed; onPress: () => void; comMes?: boolean }) {
  const d = blocoData(evento.inicioEm);
  const v = vagas(evento.vagas.restantes, evento.vagas.total);
  const vis = evento.visibilidade === 'pub' ? 'Público' : 'Requer aprovação';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${evento.nome}, ${d.dia} ${d.numero} ${d.mes}, ${TIPO_LOCAL[evento.local.tipo]}, ${distancia(evento.distanciaKm)}, ${vis}`}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.ghostPressed }]}
    >
      <View style={styles.date}>
        <Text style={styles.weekday}>{comMes ? d.mes : d.dia}</Text>
        <Text style={styles.day}>{d.numero}</Text>
      </View>
      <View style={styles.texts}>
        <Text style={[type.button, { color: colors.text }]} numberOfLines={1}>{evento.nome}</Text>
        <Text style={[type.caption, { color: colors.textSecondary }]} numberOfLines={1}>
          {TIPO_LOCAL[evento.local.tipo]} · {distancia(evento.distanciaKm)} · {vis}
          {v.nivel === 'esgotadas' ? ' · Esgotado' : ''}
        </Text>
      </View>
      <CaretRight size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 68, flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.surface },
  date: { width: 48 },
  weekday: { fontFamily: fonts.display, fontSize: 12, lineHeight: 12, letterSpacing: 1.4, color: colors.textSecondary },
  day: { fontFamily: fonts.display, fontSize: 28, lineHeight: 30, color: colors.text },
  texts: { flex: 1, gap: 3, minWidth: 0 },
});
