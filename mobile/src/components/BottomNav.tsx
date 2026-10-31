import type { ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Garage, HouseSimple, MapTrifold, Trophy, UserCircle, type IconProps } from 'phosphor-react-native';
import { colors, fonts } from '../theme';

const ITENS: Record<string, { label: string; Icon: ComponentType<IconProps> }> = {
  feed: { label: 'Início', Icon: HouseSimple },
  mapa: { label: 'Mapa', Icon: MapTrifold },
  garagem: { label: 'Garagem', Icon: Garage },
  ranking: { label: 'Ranking', Icon: Trophy },
  perfil: { label: 'Perfil', Icon: UserCircle },
};

/** Barra inferior do protótipo: 5 abas, ativa em laranja com traço de 24×2 no topo. */
export function BottomNav({ state, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
      {state.routes.map((route, i) => {
        const item = ITENS[route.name];
        if (!item) return null;
        const ativo = state.index === i;
        const cor = ativo ? colors.primaryText : colors.textSecondary;
        return (
          <Pressable
            key={route.key}
            onPress={() => !ativo && navigateToTab(route.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativo }}
            accessibilityLabel={item.label}
            style={styles.item}
          >
            <View style={[styles.marker, ativo && { backgroundColor: colors.primary }]} />
            <item.Icon size={24} color={cor} weight={ativo ? 'fill' : 'regular'} />
            <Text style={[styles.label, { color: cor }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.surfaceElevated },
  item: { flex: 1, alignItems: 'center', gap: 4, paddingBottom: 6, minHeight: 56 },
  marker: { width: 24, height: 2, borderRadius: 1, marginBottom: 6 },
  label: { fontFamily: fonts.medium, fontSize: 11 },
});
