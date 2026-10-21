import { Image, StyleSheet, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import { ImageSquare } from 'phosphor-react-native';
import { colors, type } from '../../theme';

/**
 * Equivalente ao <image-slot> do protótipo: mostra a foto quando houver e,
 * enquanto não houver, um placeholder com a descrição do que deve entrar ali.
 */
export function ImageSlot({ source, placeholder, style }: { source: ImageSourcePropType | null; placeholder: string; style?: StyleProp<ViewStyle> }) {
  if (source) {
    return <Image source={source} resizeMode="cover" style={[StyleSheet.absoluteFill, style as object]} accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={[StyleSheet.absoluteFill, styles.placeholder, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <ImageSquare size={32} color={colors.textTertiary} />
      <Text style={[type.caption, { color: colors.textTertiary, textAlign: 'center' }]}>{placeholder}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
});
