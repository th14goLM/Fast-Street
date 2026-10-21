import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, ImageSlot } from '../components/ui';
import { KEYS, secureStorage } from '../lib/storage';
import { colors, radius, space, touch, type } from '../theme';
import { images } from '../theme/images';

const SLIDES = [
  {
    title: 'Sua garagem virtual',
    text: 'Cadastre seus carros com fotos e especificações e escolha o principal para se inscrever em eventos.',
    placeholder: 'Carro nos boxes',
  },
  {
    title: 'Eventos no mapa',
    text: 'Track days, arrancadas autorizadas e encontros em autódromos e áreas privadas perto de você.',
    placeholder: 'Vista aérea do autódromo',
  },
  {
    title: 'Suba no ranking',
    text: 'Resultados publicados pelos organizadores viram pontos, pódios e conquistas.',
    placeholder: 'Pódio / pit lane',
  },
] as const;

/** Carrossel de 3 slides (protótipo: imagem de 480px em tela de 844px ≈ 57%). */
export default function Onboarding() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList<(typeof SLIDES)[number]>>(null);
  const imageH = Math.min(480, Math.round(height * 0.57));
  const last = index === SLIDES.length - 1;

  useEffect(() => {
    void secureStorage.set(KEYS.onboardingSeen, '1');
  }, []);

  const goTo = (i: number) => {
    list.current?.scrollToIndex({ index: i, animated: true });
    setIndex(i);
  };

  // Atualiza o slide ativo ao terminar o arrasto (swipe).
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={styles.root}>
      <FlatList
        ref={list}
        data={SLIDES}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.title}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item, index: i }) => (
          <View style={{ width }}>
            <View style={{ height: imageH }}>
              <ImageSlot source={images.onboarding[i] ?? null} placeholder={item.placeholder} />
              <LinearGradient
                pointerEvents="none"
                colors={[colors.background, 'rgba(26,39,48,0)']}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
                style={styles.fade}
              />
            </View>
            <View style={styles.texts}>
              <Text style={[type.counter, { color: colors.primaryText }]}>{`0${i + 1} / 03`}</Text>
              <Text accessibilityRole="header" style={[type.displayM, { color: colors.text }]}>{item.title}</Text>
              <Text style={[type.bodyL, { color: colors.textSecondary }]}>{item.text}</Text>
            </View>
          </View>
        )}
      />

      <Pressable
        onPress={() => router.push('/cadastro')}
        accessibilityRole="button"
        style={({ pressed }) => [styles.skip, { top: insets.top + 5 }, pressed && { backgroundColor: colors.surface }]}
      >
        <Text style={[type.button, { fontSize: 14, color: colors.text }]}>Pular</Text>
      </Pressable>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]}>
        <View style={styles.dots} accessibilityRole="tablist">
          {SLIDES.map((s, i) => (
            <Pressable
              key={s.title}
              onPress={() => goTo(i)}
              hitSlop={10}
              accessibilityRole="tab"
              accessibilityLabel={`Slide ${i + 1} de 3`}
              accessibilityState={{ selected: i === index }}
              style={[styles.dot, { width: i === index ? 24 : 6, backgroundColor: i === index ? colors.primary : colors.line }]}
            />
          ))}
        </View>
        <Button label={last ? 'Criar conta' : 'Próximo'} onPress={() => (last ? router.push('/cadastro') : goTo(index + 1))} />
        <Button label="Já tenho conta" variant="ghost" onPress={() => router.push('/login')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 160 },
  texts: { paddingHorizontal: space.gutterWide, gap: space.md },
  skip: {
    position: 'absolute',
    right: 16,
    minHeight: touch.min,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    backgroundColor: colors.scrim,
    justifyContent: 'center',
  },
  footer: { paddingHorizontal: space.gutterWide, gap: space.sm },
  dots: { flexDirection: 'row', gap: 6, marginBottom: space.lg },
  dot: { height: 6, borderRadius: 3 },
});
