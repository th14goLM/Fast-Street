import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import type { Periodo } from '../../features/feed/api';
import { contarFiltros, FILTROS_PADRAO, type Filtros } from '../../features/feed/useFeed';
import { veiculosApi, type ItemCatalogo } from '../../features/veiculos/api';
import { colors, fonts, radius, type } from '../../theme';
import { BottomSheet } from '../BottomSheet';
import { Button, Chip } from '../ui';

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: 'qualquer', label: 'Qualquer data' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mês' },
];

/** Categorias ficam em memória: o catálogo muda raramente e é o mesmo do cadastro do veículo. */
let categoriasCache: ItemCatalogo[] | null = null;

export function useCategorias() {
  const [categorias, setCategorias] = useState(categoriasCache ?? []);
  useEffect(() => {
    if (categoriasCache) return;
    veiculosApi
      .catalogo()
      .then((c) => {
        categoriasCache = c.categorias;
        setCategorias(c.categorias);
      })
      .catch(() => {
        /* sem catálogo: a seção some, o resto dos filtros funciona */
      });
  }, []);
  return categorias;
}

/** Nome da categoria pelo id (chips ativos do Feed). */
export function nomeCategoria(id: number, lista: ItemCatalogo[]) {
  return lista.find((c) => c.id === id)?.nome ?? `Categoria ${id}`;
}

interface Props {
  visible: boolean;
  filtros: Filtros;
  onClose: () => void;
  onApply: (f: Filtros) => void;
}

/**
 * Filtros do Feed (UC-22). Edita um rascunho; só altera o Feed em "Aplicar filtros".
 * Montada só quando visível, então o rascunho sempre começa dos filtros atuais.
 */
export function FilterSheet({ visible, filtros, onClose, onApply }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {visible && <FilterForm filtros={filtros} onApply={onApply} />}
    </BottomSheet>
  );
}

function FilterForm({ filtros, onApply }: Pick<Props, 'filtros' | 'onApply'>) {
  const categorias = useCategorias();
  const [rascunho, setRascunho] = useState(filtros);
  const ativos = contarFiltros(rascunho);

  const toggleCategoria = (id: number) =>
    setRascunho((r) => ({ ...r, categorias: r.categorias.includes(id) ? r.categorias.filter((c) => c !== id) : [...r.categorias, id] }));

  return (
    <>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>Filtros</Text>
        <Text style={[type.label, { color: ativos ? colors.primaryText : colors.textSecondary }]}>
          {ativos ? `${ativos} ${ativos === 1 ? 'ativo' : 'ativos'}` : 'Nenhum ativo'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ gap: 24 }} showsVerticalScrollIndicator={false}>
        {categorias.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.overline}>Categoria</Text>
            <View style={styles.chips}>
              {categorias.map((c) => (
                <Chip key={c.id} label={c.nome} selected={rascunho.categorias.includes(c.id)} onPress={() => toggleCategoria(c.id)} />
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.overline}>Data</Text>
          <View style={styles.segmented} accessibilityRole="radiogroup">
            {PERIODOS.map((p) => {
              const ativo = rascunho.periodo === p.value;
              return (
                <Pressable
                  key={p.value}
                  onPress={() => setRascunho((r) => ({ ...r, periodo: p.value }))}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: ativo }}
                  style={[styles.segment, ativo && styles.segmentOn]}
                >
                  <Text style={[type.label, { fontFamily: fonts.medium, color: ativo ? colors.primaryText : colors.textMuted }]}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.between}>
            <Text style={styles.overline}>Distância</Text>
            <Text style={[type.label, { fontFamily: fonts.medium, color: colors.text }]}>até {rascunho.raioKm} km</Text>
          </View>
          <Slider
            minimumValue={5}
            maximumValue={200}
            step={5}
            value={rascunho.raioKm}
            onValueChange={(v: number) => setRascunho((r) => ({ ...r, raioKm: Math.round(v) }))}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.line}
            thumbTintColor={colors.primary}
            accessibilityLabel="Distância máxima"
          />
          <View style={styles.between}>
            <Text style={[type.caption, { color: colors.textSecondary }]}>5 km</Text>
            <Text style={[type.caption, { color: colors.textSecondary }]}>200 km</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Button label="Limpar" variant="secondary" onPress={() => setRascunho(FILTROS_PADRAO)} disabled={!ativos} />
        </View>
        <View style={{ flex: 2 }}>
          <Button label={ativos ? `Aplicar filtros (${ativos})` : 'Aplicar filtros'} onPress={() => onApply(rascunho)} />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { ...type.title, color: colors.text },
  section: { gap: 12 },
  overline: { ...type.overline, color: colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segmented: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: radius.control, backgroundColor: colors.surface },
  segment: { flex: 1, minHeight: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  segmentOn: { backgroundColor: colors.primaryTintStrong, borderColor: colors.primary },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footer: { flexDirection: 'row', gap: 12 },
});
