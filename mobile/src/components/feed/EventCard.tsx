import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowsOutLineHorizontal, CalendarBlank, Barricade, FlagCheckered, GlobeSimple, LockSimple } from 'phosphor-react-native';
import type { EventoFeed, TipoLocal } from '../../features/feed/api';
import { dataEvento, distancia, TIPO_EVENTO, TIPO_LOCAL, vagas } from '../../features/feed/format';
import { colors, fonts, radius, type } from '../../theme';
import { ImageSlot } from '../ui';

export const CARD_WIDTH = 300;

export function LocalIcon({ tipo, size = 15, color = colors.gulf }: { tipo: TipoLocal; size?: number; color?: string }) {
  if (tipo === 'pista_arrancada') return <ArrowsOutLineHorizontal size={size} color={color} />;
  if (tipo === 'area_privada') return <Barricade size={size} color={color} />;
  return <FlagCheckered size={size} color={color} />;
}

/** Selo de visibilidade: Público (contorno neutro) ou Requer aprovação (âmbar, cadeado). */
export function VisibilidadeBadge({ visibilidade }: { visibilidade: 'pub' | 'priv' }) {
  const pub = visibilidade === 'pub';
  return (
    <View style={[styles.badge, { borderColor: pub ? colors.line : colors.warning }]}>
      {pub ? <GlobeSimple size={12} color={colors.text} /> : <LockSimple size={12} color={colors.warningText} />}
      <Text style={[type.caption, { fontFamily: fonts.medium, color: pub ? colors.text : colors.warningText }]}>{pub ? 'Público' : 'Requer aprovação'}</Text>
    </View>
  );
}

export function VagasBar({ restantes, total }: { restantes: number; total: number }) {
  const v = vagas(restantes, total);
  const cor = v.nivel === 'esgotadas' ? colors.dangerText : v.nivel === 'ultimas' ? colors.warningText : colors.textSecondary;
  const barra = v.nivel === 'esgotadas' ? colors.danger : v.nivel === 'ultimas' ? colors.warning : colors.primary;
  return (
    <View style={{ gap: 6 }} accessible accessibilityLabel={`${v.label}: ${v.contagem}`}>
      <View style={styles.between}>
        <Text style={[type.caption, { color: cor }]}>{v.label}</Text>
        <Text style={[type.caption, { fontFamily: fonts.medium, color: colors.text }]}>{v.contagem}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(v.ocupacao * 100)}%`, backgroundColor: barra }]} />
      </View>
    </View>
  );
}

/** Card de evento do carrossel "Perto de você" (300 px, capa 150 px). */
export function EventCard({ evento, onPress }: { evento: EventoFeed; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${TIPO_EVENTO[evento.tipo]}: ${evento.nome}, ${dataEvento(evento.inicioEm)}, ${distancia(evento.distanciaKm)}`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.cover}>
        {evento.capaUrl ? (
          <Image source={{ uri: evento.capaUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <ImageSlot source={null} placeholder={evento.local.nome} />
        )}
        <LinearGradient colors={['transparent', colors.surface]} style={styles.coverFade} pointerEvents="none" />
        <View style={styles.badgePos}>
          <VisibilidadeBadge visibilidade={evento.visibilidade} />
        </View>
      </View>
      <View style={styles.body}>
        <View style={{ gap: 4 }}>
          <Text style={[type.overline, { color: colors.primaryText }]}>{evento.emAndamento ? 'Acontecendo agora · ' : ''}{TIPO_EVENTO[evento.tipo]}</Text>
          <Text style={styles.name} numberOfLines={2}>{evento.nome}</Text>
        </View>
        <View style={{ gap: 4 }}>
          <View style={styles.row}>
            <CalendarBlank size={15} color={colors.textSecondary} />
            <Text style={[type.label, { color: colors.textMuted }]}>{dataEvento(evento.inicioEm)}</Text>
          </View>
          <View style={styles.row}>
            <LocalIcon tipo={evento.local.tipo} />
            <Text style={[type.label, { color: colors.textMuted }]} numberOfLines={1}>
              {TIPO_LOCAL[evento.local.tipo]} · {distancia(evento.distanciaKm)}
            </Text>
          </View>
        </View>
        <View style={styles.chips}>
          {evento.categorias.map((c) => (
            <Text key={c} style={styles.chip}>{c}</Text>
          ))}
        </View>
        <VagasBar restantes={evento.vagas.restantes} total={evento.vagas.total} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: CARD_WIDTH, borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceElevated, overflow: 'hidden' },
  cover: { height: 150 },
  coverFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 60 },
  badgePos: { position: 'absolute', top: 10, right: 10 },
  badge: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.chip, borderWidth: 1, backgroundColor: 'rgba(26,39,48,0.85)' },
  body: { paddingHorizontal: 14, paddingTop: 2, paddingBottom: 14, gap: 10 },
  name: { fontFamily: fonts.display, fontSize: 24, lineHeight: 25, textTransform: 'uppercase', color: colors.text },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { fontFamily: fonts.body, fontSize: 11, color: colors.text, backgroundColor: colors.neutralWarm, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.surfaceElevated, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
});
