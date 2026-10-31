import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { Check, MagnifyingGlass, NavigationArrow } from 'phosphor-react-native';
import { authApi, type Cidade } from '../../features/auth/api';
import { colors, fonts, radius, type } from '../../theme';
import { BottomSheet } from '../BottomSheet';
import { TextField } from '../ui';

/** Ignora acento e caixa: "foz" encontra "Foz do Iguaçu", "cascavel" encontra "Cascavel". */
const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface Props {
  visible: boolean;
  /** Cidade atual do cabeçalho (marca com check), se a origem for uma cidade escolhida. */
  cidadeAtualId: number | null;
  onClose: () => void;
  onSelect: (cidadeId: number | null) => void;
}

/** "Alterar local": escolhe uma cidade ou volta para a localização do aparelho. */
export function CitySheet({ visible, cidadeAtualId, onClose, onSelect }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {visible && <CityPicker cidadeAtualId={cidadeAtualId} onSelect={onSelect} />}
    </BottomSheet>
  );
}

function CityPicker({ cidadeAtualId, onSelect }: Pick<Props, 'cidadeAtualId' | 'onSelect'>) {
  const [cidades, setCidades] = useState<Cidade[] | null>(null);
  const [erro, setErro] = useState(false);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    authApi
      .cidades()
      .then((r) => setCidades(r.cidades))
      .catch(() => setErro(true));
  }, []);

  const filtradas = useMemo(() => {
    const q = normalizar(busca.trim());
    return (cidades ?? []).filter((c) => !q || normalizar(c.nome).includes(q));
  }, [cidades, busca]);

  return (
    <>
      <Text accessibilityRole="header" style={styles.title}>Alterar local</Text>
      <TextField
        label="Buscar cidade"
        placeholder="Digite o nome da cidade"
        value={busca}
        onChangeText={setBusca}
        left={<MagnifyingGlass size={18} color={colors.textSecondary} />}
        autoCorrect={false}
        dense
      />
      <Pressable
        onPress={() => onSelect(null)}
        accessibilityRole="button"
        style={({ pressed }) => [styles.gps, pressed && { backgroundColor: colors.primaryTint }]}
      >
        <NavigationArrow size={18} weight="fill" color={colors.primaryText} />
        <Text style={[type.body, { fontFamily: fonts.medium, color: colors.primaryText }]}>Usar minha localização atual</Text>
      </Pressable>

      {erro ? (
        <Text style={[type.label, { color: colors.dangerText }]}>Não foi possível carregar as cidades. Feche e tente de novo.</Text>
      ) : !cidades ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <FlatList
          data={filtradas}
          keyExtractor={(c) => String(c.id)}
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: 320 }}
          ListEmptyComponent={<Text style={[type.label, { color: colors.textSecondary }]}>Nenhuma cidade encontrada.</Text>}
          renderItem={({ item }) => {
            const atual = item.id === cidadeAtualId;
            return (
              <Pressable
                onPress={() => onSelect(item.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: atual }}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.ghostPressed }]}
              >
                <Text style={[type.body, { flex: 1, color: atual ? colors.primaryText : colors.text }]}>
                  {item.nome} <Text style={{ color: colors.textSecondary }}>· {item.uf}</Text>
                </Text>
                {atual && <Check size={18} weight="bold" color={colors.primaryText} />}
              </Pressable>
            );
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, color: colors.text },
  gps: { flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 48, paddingHorizontal: 12, borderRadius: radius.control, borderWidth: 1, borderColor: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.line },
});
