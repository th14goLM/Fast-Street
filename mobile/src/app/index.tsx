import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { AccentRule, BrandMark, ImageSlot } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { KEYS, secureStorage } from '../lib/storage';
import { colors, type } from '../theme';
import { images } from '../theme/images';

const SPLASH_MS = 1800; // igual ao protótipo

/** Splash da marca. Toque para pular; decide o destino conforme sessão e onboarding. */
export default function Splash() {
  const { status } = useAuth();
  const [timeUp, setTimeUp] = useState(false);
  const navigated = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setTimeUp(true), SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!timeUp || status === 'loading' || navigated.current) return;
    navigated.current = true;
    (async () => {
      if (status === 'signedIn') return router.replace('/inicio');
      const seen = await secureStorage.get(KEYS.onboardingSeen);
      router.replace(seen ? '/login' : '/onboarding');
    })();
  }, [timeUp, status]);

  return (
    <Pressable style={styles.root} onPress={() => setTimeUp(true)} accessibilityRole="button" accessibilityLabel="Fast Street. Toque para continuar">
      <ImageSlot source={images.splash} placeholder="Grid de largada / autódromo à noite" />
      <LinearGradient
        pointerEvents="none"
        colors={[colors.background, 'rgba(26,39,48,0.4)', 'rgba(26,39,48,0.2)']}
        locations={[0.3, 0.7, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content} pointerEvents="none">
        <BrandMark />
        <Text style={[type.brand, { color: colors.text }]}>{'Fast\nStreet'}</Text>
        <Text style={[type.bodyL, { color: colors.textMuted }]}>Eventos legalizados em locais autorizados.</Text>
        <AccentRule />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { position: 'absolute', left: 28, right: 28, bottom: 72, gap: 16 },
});
