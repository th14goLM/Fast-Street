import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowClockwise, CameraPlus, CheckCircle, X } from 'phosphor-react-native';
import type { Photo } from '../features/uploads/usePhotoUploads';
import { colors, fonts, radius, type } from '../theme';

interface Props {
  photos: Photo[];
  max: number;
  onAdd: () => void;
  onRetry: (key: string) => void;
  onRemove: (key: string) => void;
}

/** Grade 3×N de fotos do veículo: enviada ✓, progresso em %, erro com "Tentar novamente", Adicionar. */
export function PhotoGrid({ photos, max, onAdd, onRetry, onRemove }: Props) {
  return (
    <View style={styles.grid}>
      {photos.map((p, i) => (
        <View key={p.key} style={styles.cell}>
          <View style={[styles.tile, { borderColor: p.status === 'error' ? colors.danger : colors.surfaceElevated }]}>
            <Image source={{ uri: p.localUri }} style={[StyleSheet.absoluteFill, p.status !== 'done' && { opacity: 0.35 }]} resizeMode="cover" />
            {p.status === 'done' && (
              <View style={styles.check} accessibilityLabel={`Foto ${i + 1} enviada`}>
                <CheckCircle size={18} weight="fill" color={colors.success} />
              </View>
            )}
            {(p.status === 'uploading' || p.status === 'preparing') && (
              <>
                <View style={styles.center} accessibilityLabel={`Enviando foto ${i + 1}: ${Math.round(p.progress * 100)}%`}>
                  <Text style={styles.pct}>{p.status === 'preparing' ? '…' : `${Math.round(p.progress * 100)}%`}</Text>
                </View>
                <View style={[styles.bar, { width: `${Math.round(p.progress * 100)}%` }]} />
              </>
            )}
            {p.status === 'error' && (
              <Pressable
                onPress={() => onRetry(p.key)}
                accessibilityRole="button"
                accessibilityLabel={`Tentar enviar a foto ${i + 1} de novo`}
                style={[StyleSheet.absoluteFill, styles.center, styles.error]}
              >
                <ArrowClockwise size={22} color={colors.dangerText} />
                <Text style={[type.caption, styles.errorText]}>Tentar novamente</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => onRemove(p.key)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Remover foto ${i + 1}`}
              style={styles.remove}
            >
              <X size={12} weight="bold" color={colors.text} />
            </Pressable>
          </View>
        </View>
      ))}
      {photos.length < max && (
        <View style={styles.cell}>
          <Pressable
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel="Adicionar fotos"
            style={({ pressed }) => [styles.tile, styles.center, styles.add, pressed && { backgroundColor: colors.ghostPressed }]}
          >
            <CameraPlus size={24} color={colors.textSecondary} />
            <Text style={[type.caption, { fontFamily: fonts.medium, color: colors.textSecondary }]}>Adicionar</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  cell: { width: '33.333%', padding: 4 },
  tile: { aspectRatio: 1, borderRadius: radius.control, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1 },
  add: { borderColor: colors.line, gap: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  pct: { fontFamily: fonts.display, fontSize: 22, color: colors.text, fontVariant: ['tabular-nums'] },
  bar: { position: 'absolute', left: 0, bottom: 0, height: 4, backgroundColor: colors.primary },
  error: { backgroundColor: 'rgba(239,68,68,0.08)', gap: 4 },
  errorText: { fontFamily: fonts.medium, color: colors.dangerText, textAlign: 'center' },
  remove: { position: 'absolute', top: 6, left: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(26,39,48,0.85)', alignItems: 'center', justifyContent: 'center' },
});
