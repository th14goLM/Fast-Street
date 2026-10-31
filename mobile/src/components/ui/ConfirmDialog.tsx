import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, type } from '../../theme';
import { Button } from './Button';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Ação destrutiva (vermelha) ou neutra (laranja do primário). */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal de confirmação do Design System (elev-lg, raio 16). Funciona igual em iOS, Android e web. */
export function ConfirmDialog({ visible, title, message, confirmLabel, cancelLabel = 'Cancelar', destructive, onConfirm, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel={cancelLabel} />
        <View style={styles.dialog} accessibilityRole="alert" accessibilityViewIsModal>
          <Text style={[type.title, { color: colors.text }]}>{title}</Text>
          <Text style={[type.body, { color: colors.textMuted }]}>{message}</Text>
          <View style={styles.actions}>
            <Button label={cancelLabel} variant="secondary" onPress={onCancel} style={styles.action} />
            <Button label={confirmLabel} variant={destructive ? 'danger' : 'primary'} onPress={onConfirm} style={styles.action} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 24 },
  dialog: {
    gap: 12,
    padding: 20,
    borderRadius: radius.card,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: '#5D7189',
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  action: { flex: 1 },
});
