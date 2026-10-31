import { Tabs } from 'expo-router/js-tabs';
import { BottomNav } from '../../components/BottomNav';
import { colors } from '../../theme';

/** Área logada: Início (Feed), Mapa, Garagem, Ranking e Perfil. */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="mapa" />
      <Tabs.Screen name="garagem" />
      <Tabs.Screen name="ranking" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  );
}
