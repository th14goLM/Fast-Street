import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretDown, Check } from 'phosphor-react-native';
import { colors, radius, touch, type } from '../../theme';

export interface Option<T extends string | number> {
  value: T;
  label: string;
}

interface Props<T extends string | number> {
  label: string;
  placeholder?: string;
  value: T | null;
  options: Option<T>[];
  onChange: (value: T) => void;
  error?: string;
  loading?: boolean;
  onOpen?: () => void;
}

/** Select de lista fechada: campo igual ao input + bottom sheet (raio 24, elev-lg). */
export function SelectField<T extends string | number>({ label, placeholder = 'Selecione', value, options, onChange, error, loading, onOpen }: Props<T>) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.wrap}>
      <Text style={[type.label, { color: colors.textMuted }]}>{label}</Text>
      <Pressable
        onPress={() => {
          onOpen?.();
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        accessibilityHint={error}
        style={[styles.field, error ? styles.fieldError : null]}
      >
        <Text style={[type.input, { color: selected ? colors.text : colors.textTertiary, flex: 1 }]} numberOfLines={1}>
          {loading ? 'Carregando…' : (selected?.label ?? placeholder)}
        </Text>
        <CaretDown size={18} color={colors.textSecondary} />
      </Pressable>
      {error ? <Text style={[type.caption, { color: colors.dangerText }]}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Fechar" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.grabber} />
          <Text style={[type.title, { color: colors.text, paddingHorizontal: 24, marginBottom: 8 }]}>{label}</Text>
          <FlatList
            data={options}
            keyExtractor={(o) => String(o.value)}
            renderItem={({ item }) => {
              const active = item.value === value;
              return (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  style={({ pressed }) => [styles.option, (pressed || active) && { backgroundColor: active ? colors.primaryTint : colors.ghostPressed }]}
                >
                  <Text style={[type.input, { color: active ? colors.primaryText : colors.text, flex: 1 }]}>{item.label}</Text>
                  {active && <Check size={18} weight="bold" color={colors.primaryText} />}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  field: {
    minHeight: touch.input,
    paddingLeft: 14,
    paddingRight: 14,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldError: { borderColor: colors.danger, backgroundColor: colors.dangerFieldBg },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    maxHeight: '60%',
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderWidth: 1,
    borderColor: '#5D7189',
    paddingTop: 10,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 14 },
  option: { minHeight: touch.input, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center' },
});
