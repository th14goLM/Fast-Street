import { forwardRef, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { colors, radius, space, touch, type } from '../../theme';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  /** Erro sem mensagem própria (ex.: "E-mail já cadastrado" com link logo abaixo). */
  invalid?: boolean;
  helper?: ReactNode;
  right?: ReactNode;
}

export const TextField = forwardRef<TextInputInstance, TextFieldProps>(function TextField(
  { label, error, invalid, helper, right, onFocus, onBlur, ...input },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const hasError = !!error || !!invalid;
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View>
        {focused && <View pointerEvents="none" style={styles.focusRing} />}
        <TextInput
          ref={ref}
          {...input}
          accessibilityLabel={label}
          accessibilityHint={error}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            right ? { paddingRight: 48 } : null,
            hasError && styles.inputError,
            focused && !hasError && { borderColor: colors.primary },
          ]}
        />
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      {helper}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { ...type.label, color: colors.textMuted },
  input: {
    ...type.input,
    minHeight: touch.input,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.text,
    // Na web, remove o contorno padrão do navegador: o foco usa o anel laranja do DS.
    ...Platform.select({ web: { outlineWidth: 0 }, default: {} }),
  },
  inputError: { borderColor: colors.danger, backgroundColor: colors.dangerFieldBg },
  // Anel de foco de 3px (box-shadow do protótipo).
  focusRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: radius.control + 3,
    borderWidth: 3,
    borderColor: colors.focusRing,
  },
  right: { position: 'absolute', right: 2, top: 2 },
  error: { ...type.caption, color: colors.dangerText, marginTop: space.xs - 4 },
});
