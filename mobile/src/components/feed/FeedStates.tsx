import { useEffect, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { CalendarX, CloudSlash, CloudWarning, GpsSlash } from 'phosphor-react-native';
import { haQuantoTempo } from '../../features/feed/format';
import { colors, radius, type } from '../../theme';
import { Button } from '../ui';

/** Bloco pulsante do skeleton (opacidade 0,5 ↔ 1). */
function Pulse({ style }: { style: object }) {
  const [op] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [op]);
  return <Animated.View style={[styles.pulse, style, { opacity: op }]} />;
}

export function FeedSkeleton() {
  return (
    <View style={{ gap: 28 }} accessibilityLabel="Carregando eventos" accessibilityRole="progressbar">
      <View style={{ gap: 12 }}>
        <Pulse style={{ width: 140, height: 14 }} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pulse style={{ width: 300, height: 320, borderRadius: radius.card }} />
          <Pulse style={{ width: 60, height: 320, borderRadius: radius.card }} />
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <Pulse style={{ width: 110, height: 14 }} />
        {[0, 1, 2].map((i) => (
          <Pulse key={i} style={{ height: 72, borderRadius: radius.card }} />
        ))}
      </View>
    </View>
  );
}

function StateCard({ icon, title, text, children }: { icon: ReactNode; title: string; text: string; children?: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.icon}>{icon}</View>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={[type.body, { color: colors.textMuted, textAlign: 'center' }]}>{text}</Text>
      {children && <View style={styles.actions}>{children}</View>}
    </View>
  );
}

export function FeedVazio({ raioKm, comFiltros, onLimpar, onAmpliar }: { raioKm: number; comFiltros: boolean; onLimpar: () => void; onAmpliar: () => void }) {
  return (
    <StateCard
      icon={<CalendarX size={28} color={colors.primaryText} />}
      title="Nenhum evento encontrado"
      text={`Nada em ${raioKm} km${comFiltros ? ' com os filtros atuais' : ''}. Tente ampliar a distância ou mudar as categorias.`}
    >
      {comFiltros && <Button label="Limpar filtros" variant="secondary" compact onPress={onLimpar} />}
      {raioKm < 200 && <Button label="Ampliar para 200 km" compact onPress={onAmpliar} />}
    </StateCard>
  );
}

export function FeedSemPermissao({ onPermitir, onManual }: { onPermitir: () => void; onManual: () => void }) {
  return (
    <StateCard
      icon={<GpsSlash size={28} color={colors.primaryText} />}
      title="Mostre eventos perto de você"
      text="Permita o acesso à localização para ver os eventos mais próximos, ou escolha uma cidade."
    >
      <Button label="Permitir localização" compact onPress={onPermitir} />
      <Button label="Definir local manualmente" variant="ghost" compact onPress={onManual} />
    </StateCard>
  );
}

export function FeedErro({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <StateCard icon={<CloudWarning size={28} color={colors.dangerText} />} title="Não foi possível carregar os eventos" text={message}>
      <Button label="Tentar novamente" variant="secondary" compact onPress={onRetry} />
    </StateCard>
  );
}

/** Banner do modo offline: dados da última resposta salva. */
export function OfflineBanner({ geradoEm }: { geradoEm: string }) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <CloudSlash size={18} color={colors.warningText} />
      <Text style={[type.label, { color: colors.text, flex: 1 }]}>
        Sem conexão · exibindo dados salvos, atualizados {haQuantoTempo(geradoEm)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pulse: { backgroundColor: colors.surfaceElevated, borderRadius: 6 },
  card: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 28,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceElevated,
  },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated, marginBottom: 4 },
  title: { ...type.title, fontSize: 22, lineHeight: 24, color: colors.text, textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: 8, marginTop: 8 },
  banner: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.control,
    backgroundColor: colors.warningTint,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
});
