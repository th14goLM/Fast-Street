import { Pressable, Text, type StyleProp, type TextStyle } from 'react-native';
import { colors, type } from '../../theme';

/** Link inline laranja (texto de corpo usa #F28A62 por contraste). */
export function TextLink({ label, onPress, style }: { label: string; onPress: () => void; style?: StyleProp<TextStyle> }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" hitSlop={8}>
      {({ pressed }) => (
        <Text style={[type.body, { color: pressed ? colors.primary : colors.primaryText }, style]}>{label}</Text>
      )}
    </Pressable>
  );
}
