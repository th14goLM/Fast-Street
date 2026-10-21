import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, type TextInputInstance } from 'react-native';
import { Eye, EyeSlash } from 'phosphor-react-native';
import { colors, radius, touch } from '../../theme';
import { TextField, type TextFieldProps } from './TextField';

/** Campo de senha com botão de revelar (pedido do usuário no chat 1). */
export const PasswordField = forwardRef<TextInputInstance, Omit<TextFieldProps, 'right' | 'secureTextEntry'>>(
  function PasswordField(props, ref) {
    const [visible, setVisible] = useState(false);
    const Icon = visible ? EyeSlash : Eye;
    return (
      <TextField
        ref={ref}
        {...props}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        right={
          <Pressable
            onPress={() => setVisible((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
            accessibilityState={{ selected: visible }}
            style={({ pressed }) => [styles.eye, pressed && { backgroundColor: colors.neutralPressed }]}
          >
            <Icon size={20} color={colors.textSecondary} />
          </Pressable>
        }
      />
    );
  },
);

const styles = StyleSheet.create({
  eye: { width: touch.min, height: touch.min, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
