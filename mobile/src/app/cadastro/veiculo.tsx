import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { CaretDown, CaretUp, Wrench } from 'phosphor-react-native';
import { AuthScreen } from '../../components/AuthScreen';
import { OnboardingHeader } from '../../components/OnboardingHeader';
import { PhotoGrid } from '../../components/PhotoGrid';
import { Button, Chip, ErrorAlert, FileHint, ScreenTitle, SelectField, TextField, type Option } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { usePhotoUploads } from '../../features/uploads/usePhotoUploads';
import { veiculosApi, type ItemCatalogo } from '../../features/veiculos/api';
import { ApiError } from '../../lib/http';
import { colors, radius, type } from '../../theme';

const MIN_FOTOS = 3;
const MAX_FOTOS = 6;

interface Form {
  marcaId: number | null;
  modelo: string;
  ano: string;
  cor: string;
  categoriaId: number | null;
  motor: string;
  potenciaCv: string;
  torqueKgfm: string;
  pesoKg: string;
  transmissao: string;
  modificacoes: string;
}

const INITIAL: Form = {
  marcaId: null,
  modelo: '',
  ano: '',
  cor: '',
  categoriaId: null,
  motor: '',
  potenciaCv: '',
  torqueKgfm: '',
  pesoKg: '',
  transmissao: '',
  modificacoes: '',
};

/** Erros vindos da API mapeados para o campo do formulário. */
type Errors = Partial<Record<keyof Form | 'fotoIds', string>>;

/** UC-01 · Primeiro veículo (passo 4 de 4). Ele vira o veículo principal (RN-VEI-03). */
export default function PrimeiroVeiculo() {
  const { withToken } = useAuth();
  const fotos = usePhotoUploads('foto_veiculo', MAX_FOTOS);
  const [form, setForm] = useState<Form>(INITIAL);
  const [specsOpen, setSpecsOpen] = useState(false);
  const [marcas, setMarcas] = useState<Option<number>[]>([]);
  const [categorias, setCategorias] = useState<ItemCatalogo[]>([]);
  const [catalogo, setCatalogo] = useState<'loading' | 'ok' | 'error'>('loading');
  const [errors, setErrors] = useState<Errors>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadCatalogo = () =>
    veiculosApi
      .catalogo()
      .then(({ marcas: m, categorias: c }) => {
        setMarcas(m.map((x) => ({ value: x.id, label: x.nome })));
        setCategorias(c);
        setCatalogo('ok');
      })
      .catch(() => setCatalogo('error'));
  useEffect(() => {
    void loadCatalogo();
  }, []);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  // O que falta para habilitar o botão, como no protótipo ("Falta: 2 fotos, ano").
  const faltando: string[] = [];
  const faltamFotos = MIN_FOTOS - fotos.doneCount;
  if (faltamFotos > 0) faltando.push(`${faltamFotos} ${faltamFotos > 1 ? 'fotos' : 'foto'}`);
  if (!form.marcaId) faltando.push('marca');
  if (!form.modelo.trim()) faltando.push('modelo');
  if (!/^\d{4}$/.test(form.ano)) faltando.push('ano');
  if (!form.categoriaId) faltando.push('categoria');
  const pronto = faltando.length === 0 && !fotos.busy;

  const goFeed = (aviso: string) => router.replace({ pathname: '/feed', params: { aviso } });

  async function save() {
    if (!pronto) return;
    setSaving(true);
    setSummary(null);
    try {
      const { veiculo } = await withToken((token) =>
        veiculosApi.criar(token, {
          marcaId: form.marcaId!,
          modelo: form.modelo.trim(),
          ano: form.ano,
          cor: form.cor.trim() || undefined,
          categoriaId: form.categoriaId!,
          motor: form.motor.trim() || undefined,
          potenciaCv: form.potenciaCv.trim() || undefined,
          torqueKgfm: form.torqueKgfm.trim() || undefined,
          pesoKg: form.pesoKg.trim() || undefined,
          transmissao: form.transmissao.trim() || undefined,
          modificacoes: form.modificacoes.trim() || undefined,
          fotoIds: fotos.uploadIds,
        }),
      );
      goFeed(`veiculo:${veiculo.nome}`);
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        setErrors(err.fields as Errors);
        // Erros das especificações ficam escondidos se a seção estiver fechada.
        if (['motor', 'potenciaCv', 'torqueKgfm', 'pesoKg', 'transmissao', 'modificacoes'].some((k) => err.fields?.[k])) setSpecsOpen(true);
      }
      setSummary(err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthScreen
      gap={18}
      stickyFooter
      header={<OnboardingHeader step={4} action={{ label: 'Fazer depois', onPress: () => goFeed('sem-veiculo') }} />}
      footer={
        <View style={{ gap: 8 }}>
          {faltando.length > 0 && (
            <Text style={[type.caption, { color: colors.textSecondary, textAlign: 'center' }]}>Falta: {faltando.join(', ')}</Text>
          )}
          {faltando.length === 0 && fotos.busy && (
            <Text style={[type.caption, { color: colors.textSecondary, textAlign: 'center' }]}>Aguarde o envio das fotos…</Text>
          )}
          <Button label="Salvar e ir para o Feed" onPress={save} loading={saving} disabled={!pronto} />
        </View>
      }
    >
      <View style={{ gap: 4 }}>
        <ScreenTitle kicker="Passo 4 de 4" title="Seu primeiro veículo" size="M" />
        <Text style={[type.body, { color: colors.textSecondary }]}>
          Necessário para se inscrever em eventos. Ele será o seu veículo principal.
        </Text>
      </View>

      {summary && <ErrorAlert compact message={summary} />}

      <View style={{ gap: 8 }}>
        <View style={styles.between}>
          <Text style={[type.label, { color: colors.textMuted }]}>Fotos</Text>
          <Text style={[type.caption, { color: fotos.doneCount >= MIN_FOTOS ? colors.successText : colors.textSecondary }]}>
            {fotos.doneCount}/{MIN_FOTOS} mínimas
          </Text>
        </View>
        <PhotoGrid photos={fotos.photos} max={MAX_FOTOS} onAdd={() => void fotos.pick()} onRetry={fotos.retry} onRemove={fotos.remove} />
        <FileHint perPhoto />
        {fotos.errorCount > 0 && (
          <Text style={[type.caption, { color: colors.dangerText }]}>
            Falha no envio de {fotos.errorCount} {fotos.errorCount > 1 ? 'fotos' : 'foto'}. Seus dados continuam salvos; toque para tentar de novo.
          </Text>
        )}
        {errors.fotoIds ? <Text style={[type.caption, { color: colors.dangerText }]}>{errors.fotoIds}</Text> : null}
      </View>

      <View style={styles.grid2}>
        <View style={styles.col}>
          <SelectField
            label="Marca"
            value={form.marcaId}
            options={marcas}
            loading={catalogo === 'loading'}
            onOpen={() => {
              if (catalogo === 'error') {
                setCatalogo('loading');
                void loadCatalogo();
              }
            }}
            onChange={(v) => set('marcaId', v)}
            error={errors.marcaId ?? (catalogo === 'error' ? 'Não carregou. Toque de novo.' : undefined)}
          />
        </View>
        <View style={styles.col}>
          <TextField label="Modelo" value={form.modelo} onChangeText={(v) => set('modelo', v)} placeholder="Ex.: Civic Si" error={errors.modelo} />
        </View>
        <View style={styles.col}>
          <TextField
            label="Ano"
            value={form.ano}
            onChangeText={(v) => set('ano', v.replace(/\D/g, '').slice(0, 4))}
            placeholder="2019"
            keyboardType="number-pad"
            maxLength={4}
            error={errors.ano}
            invalid={form.ano.length > 0 && form.ano.length < 4}
          />
        </View>
        <View style={styles.col}>
          <TextField label="Cor" value={form.cor} onChangeText={(v) => set('cor', v)} placeholder="Cinza" error={errors.cor} />
        </View>
      </View>

      <View style={{ gap: 8 }} accessibilityRole="radiogroup">
        <Text style={[type.label, { color: colors.textMuted }]}>Categoria</Text>
        <View style={styles.chips}>
          {categorias.map((c) => (
            <Chip key={c.id} label={c.nome} selected={form.categoriaId === c.id} onPress={() => set('categoriaId', c.id)} invalid={!!errors.categoriaId} />
          ))}
        </View>
        {errors.categoriaId ? <Text style={[type.caption, { color: colors.dangerText }]}>{errors.categoriaId}</Text> : null}
      </View>

      <View style={styles.specs}>
        <Pressable
          onPress={() => setSpecsOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityState={{ expanded: specsOpen }}
          style={styles.specsHeader}
        >
          <Wrench size={20} color={colors.gulf} />
          <Text style={[type.button, { color: colors.text, flex: 1 }]}>
            Especificações técnicas <Text style={{ fontFamily: 'Inter_400Regular', color: colors.textSecondary }}>· opcional</Text>
          </Text>
          {specsOpen ? <CaretUp size={18} color={colors.textSecondary} /> : <CaretDown size={18} color={colors.textSecondary} />}
        </Pressable>
        {specsOpen && (
          <View style={styles.specsBody}>
            <TextField dense label="Motor" value={form.motor} onChangeText={(v) => set('motor', v)} placeholder="1.5 Turbo 16V" error={errors.motor} />
            <View style={styles.grid2}>
              <View style={styles.col}>
                <TextField dense label="Potência (cv)" value={form.potenciaCv} onChangeText={(v) => set('potenciaCv', v.replace(/\D/g, ''))} placeholder="205" keyboardType="number-pad" error={errors.potenciaCv} />
              </View>
              <View style={styles.col}>
                <TextField dense label="Torque (kgfm)" value={form.torqueKgfm} onChangeText={(v) => set('torqueKgfm', v.replace(/[^\d,.]/g, ''))} placeholder="26,5" keyboardType="decimal-pad" error={errors.torqueKgfm} />
              </View>
              <View style={styles.col}>
                <TextField dense label="Peso (kg)" value={form.pesoKg} onChangeText={(v) => set('pesoKg', v.replace(/[^\d.]/g, ''))} placeholder="1.335" keyboardType="number-pad" error={errors.pesoKg} />
              </View>
              <View style={styles.col}>
                <TextField dense label="Transmissão" value={form.transmissao} onChangeText={(v) => set('transmissao', v)} placeholder="Manual 6M" error={errors.transmissao} />
              </View>
            </View>
            <TextField
              dense
              multiline
              label="Modificações"
              value={form.modificacoes}
              onChangeText={(v) => set('modificacoes', v)}
              placeholder="Uma por linha. Ex.: Intake, escape inox, pastilhas de competição"
              error={errors.modificacoes}
            />
          </View>
        )}
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, rowGap: 12 },
  col: { width: '50%', paddingHorizontal: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specs: { borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceElevated, overflow: 'hidden' },
  specsHeader: { minHeight: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  specsBody: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4, gap: 12 },
});
