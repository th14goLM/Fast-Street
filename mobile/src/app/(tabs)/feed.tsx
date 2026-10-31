import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, CaretRight, CheckCircle, EnvelopeSimpleOpen, Info, MapPin, GpsSlash, NavigationArrow, SlidersHorizontal, X } from 'phosphor-react-native';
import { CitySheet } from '../../components/feed/CitySheet';
import { CARD_WIDTH, EventCard } from '../../components/feed/EventCard';
import { EventRow } from '../../components/feed/EventRow';
import { FeedErro, FeedSemPermissao, FeedSkeleton, FeedVazio, OfflineBanner } from '../../components/feed/FeedStates';
import { FilterSheet, nomeCategoria, useCategorias } from '../../components/feed/FilterSheet';
import { useAuth } from '../../context/AuthContext';
import type { EventoFeed } from '../../features/feed/api';
import { escolherCidade, pedirLocalizacao } from '../../features/feed/location';
import { contarFiltros, FILTROS_PADRAO, RAIO_PADRAO, useFeed, type Filtros } from '../../features/feed/useFeed';
import { colors, fonts, radius, space, touch, type } from '../../theme';

/** Até esta distância o evento entra no carrossel "Perto de você". */
const PERTO_KM = 15;

/** Avisos de chegada vindos do fim do onboarding (mesmos textos do protótipo). */
function avisoDe(aviso: string | undefined): { kind: 'ok' | 'info'; text: string } | null {
  if (!aviso) return null;
  if (aviso === 'org') return { kind: 'ok', text: 'Conta criada · bem-vindo à Central do Organizador' };
  if (aviso === 'sem-veiculo') return { kind: 'info', text: 'Cadastre um veículo na Garagem para se inscrever em eventos.' };
  if (aviso.startsWith('veiculo:')) return { kind: 'ok', text: `Garagem pronta · ${aviso.slice(8)} é seu veículo principal` };
  return null;
}

/** Separa a resposta nas seções do Feed sem repetir eventos. */
function secoes(eventos: EventoFeed[]) {
  const perto = eventos.filter((e) => e.distanciaKm <= PERTO_KM);
  const resto = eventos.filter((e) => e.distanciaKm > PERTO_KM);
  return { perto, semana: resto.filter((e) => e.estaSemana), mais: resto.filter((e) => !e.estaSemana) };
}

const PERIODO_LABEL = { semana: 'Esta semana', mes: 'Este mês' } as const;

/** Feed de eventos (UC-03) com filtros (UC-22). */
export default function Feed() {
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();
  const { aviso: avisoParam } = useLocalSearchParams<{ aviso?: string }>();
  const [aviso, setAviso] = useState(() => avisoDe(avisoParam));
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_PADRAO);
  const [sheet, setSheet] = useState<'filtros' | 'cidade' | null>(null);
  const { carregando, resultado, atualizando, recarregar } = useFeed(filtros);
  const categorias = useCategorias();
  const ativos = contarFiltros(filtros);

  // O aviso de boas-vindas some sozinho depois de alguns segundos.
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 6000);
    return () => clearTimeout(t);
  }, [aviso]);

  const abrirEvento = (id: string) => router.push({ pathname: '/eventos/[id]', params: { id } });

  async function trocarLocal(cidadeId: number | null) {
    setSheet(null);
    if (cidadeId) await escolherCidade(cidadeId);
    else if (!(await pedirLocalizacao())) {
      Alert.alert('Localização não permitida', 'Mostrando os eventos perto da cidade do seu cadastro. Você pode permitir a localização nos ajustes do aparelho.');
    }
    recarregar();
  }

  async function permitirLocalizacao() {
    if (await pedirLocalizacao()) recarregar();
    else setSheet('cidade');
  }

  const ok = resultado?.status === 'ok' ? resultado : null;
  const origem = ok?.data.origem;
  const semPermissao = resultado?.status === 'semPermissao';
  const kicker = semPermissao ? 'Localização desativada' : origem?.tipo === 'gps' ? 'Sua localização' : 'Local escolhido';
  const cidadeNome = origem?.cidade?.nome ?? (semPermissao || carregando ? '—' : 'Perto de você');

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => setSheet('cidade')} accessibilityRole="button" accessibilityLabel={`${kicker}: ${cidadeNome}. Alterar local`} style={{ flex: 1, gap: 4 }}>
          <View style={styles.row}>
            {semPermissao ? (
              <GpsSlash size={14} color={colors.textSecondary} />
            ) : origem?.tipo === 'gps' ? (
              <NavigationArrow size={14} weight="fill" color={colors.primaryText} />
            ) : (
              <MapPin size={14} weight="fill" color={colors.primaryText} />
            )}
            <Text style={[type.overline, { color: colors.textSecondary }]}>{kicker}</Text>
          </View>
          <Text style={styles.cidade} numberOfLines={1}>{cidadeNome}</Text>
          <Text style={[type.label, { fontFamily: fonts.medium, color: colors.primaryText }]}>Alterar local</Text>
        </Pressable>
        <IconButton label={ativos ? `Filtros, ${ativos} ativos` : 'Filtros'} ativo={ativos > 0} badge={ativos || undefined} onPress={() => setSheet('filtros')}>
          <SlidersHorizontal size={22} color={ativos ? colors.primaryText : colors.text} />
        </IconButton>
        <IconButton label="Notificações" onPress={() => router.push('/notificacoes')}>
          <Bell size={22} color={colors.text} />
        </IconButton>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32, gap: 24 }}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={() => recarregar(true)} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {(aviso || (usuario && !usuario.emailVerificado) || ativos > 0) && (
          <View style={styles.padded}>
            {aviso && (
              <View style={styles.toast} accessibilityRole="alert">
                {aviso.kind === 'ok' ? <CheckCircle size={20} weight="fill" color={colors.success} /> : <Info size={20} weight="fill" color={colors.gulf} />}
                <Text style={[type.label, { color: colors.text, flex: 1 }]}>{aviso.text}</Text>
                <Pressable onPress={() => setAviso(null)} accessibilityLabel="Fechar aviso" hitSlop={12}>
                  <X size={16} color={colors.textSecondary} />
                </Pressable>
              </View>
            )}

            {usuario && !usuario.emailVerificado && (
              <Pressable onPress={() => router.navigate('/perfil')} accessibilityRole="button" style={styles.emailBanner}>
                <EnvelopeSimpleOpen size={18} color={colors.warningText} />
                <Text style={[type.label, { color: colors.text, flex: 1 }]}>Confirme seu e-mail para se inscrever em eventos</Text>
                <CaretRight size={16} color={colors.textSecondary} />
              </Pressable>
            )}

            {ativos > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {filtros.categorias.map((id) => (
                  <FiltroChip
                    key={id}
                    label={nomeCategoria(id, categorias)}
                    onRemove={() => setFiltros((f) => ({ ...f, categorias: f.categorias.filter((c) => c !== id) }))}
                  />
                ))}
                {filtros.periodo !== 'qualquer' && (
                  <FiltroChip label={PERIODO_LABEL[filtros.periodo]} onRemove={() => setFiltros((f) => ({ ...f, periodo: 'qualquer' }))} />
                )}
                {filtros.raioKm !== RAIO_PADRAO && (
                  <FiltroChip label={`Até ${filtros.raioKm} km`} onRemove={() => setFiltros((f) => ({ ...f, raioKm: RAIO_PADRAO }))} />
                )}
                <Pressable onPress={() => setFiltros(FILTROS_PADRAO)} accessibilityRole="button" style={styles.limpar}>
                  <Text style={[type.label, { fontFamily: fonts.medium, color: colors.primaryText }]}>Limpar</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        )}

        {carregando || !resultado ? (
          <View style={styles.padded}>
            <FeedSkeleton />
          </View>
        ) : resultado.status === 'semPermissao' ? (
          <View style={styles.padded}>
            <FeedSemPermissao onPermitir={permitirLocalizacao} onManual={() => setSheet('cidade')} />
          </View>
        ) : resultado.status === 'erro' ? (
          <View style={styles.padded}>
            <FeedErro message={resultado.message} onRetry={() => recarregar()} />
          </View>
        ) : (
          <>
            {resultado.offline && (
              <View style={styles.padded}>
                <OfflineBanner geradoEm={resultado.data.geradoEm} />
              </View>
            )}
            {resultado.data.eventos.length === 0 ? (
              <View style={styles.padded}>
                <FeedVazio
                  raioKm={resultado.data.raioKm}
                  comFiltros={ativos > 0}
                  onLimpar={() => setFiltros(FILTROS_PADRAO)}
                  onAmpliar={() => setFiltros((f) => ({ ...f, raioKm: 200 }))}
                />
              </View>
            ) : (
              <Secoes eventos={resultado.data.eventos} onOpen={abrirEvento} />
            )}
          </>
        )}
      </ScrollView>

      <FilterSheet
        visible={sheet === 'filtros'}
        filtros={filtros}
        onClose={() => setSheet(null)}
        onApply={(f) => {
          setSheet(null);
          setFiltros(f);
        }}
      />
      <CitySheet
        visible={sheet === 'cidade'}
        cidadeAtualId={origem?.tipo === 'cidade' ? (origem.cidade?.id ?? null) : null}
        onClose={() => setSheet(null)}
        onSelect={trocarLocal}
      />
    </View>
  );
}

function Secoes({ eventos, onOpen }: { eventos: EventoFeed[]; onOpen: (id: string) => void }) {
  const { perto, semana, mais } = secoes(eventos);
  return (
    <>
      {perto.length > 0 && (
        <View style={{ gap: 12 }}>
          <View style={[styles.padded, styles.sectionHeader]}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Perto de você</Text>
            <Pressable onPress={() => router.navigate('/mapa')} accessibilityRole="link" hitSlop={8}>
              <Text style={[type.label, { fontFamily: fonts.medium, color: colors.primaryText }]}>Ver no mapa</Text>
            </Pressable>
          </View>
          <FlatList
            horizontal
            data={perto}
            keyExtractor={(e) => e.id}
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + 12}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 12 }}
            renderItem={({ item }) => <EventCard evento={item} onPress={() => onOpen(item.id)} />}
          />
        </View>
      )}
      {semana.length > 0 && <Lista titulo="Esta semana" eventos={semana} onOpen={onOpen} />}
      {mais.length > 0 && <Lista titulo={perto.length || semana.length ? 'Mais eventos' : 'Próximos eventos'} eventos={mais} onOpen={onOpen} comMes />}
    </>
  );
}

function Lista({ titulo, eventos, onOpen, comMes }: { titulo: string; eventos: EventoFeed[]; onOpen: (id: string) => void; comMes?: boolean }) {
  return (
    <View style={[styles.padded, { gap: 12 }]}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{titulo}</Text>
      <View style={{ gap: 8 }}>
        {eventos.map((e) => (
          <EventRow key={e.id} evento={e} comMes={comMes} onPress={() => onOpen(e.id)} />
        ))}
      </View>
    </View>
  );
}

function IconButton({ label, onPress, ativo, badge, children }: { label: string; onPress: () => void; ativo?: boolean; badge?: number; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconBtn, ativo && { borderColor: colors.primary }, pressed && { backgroundColor: colors.ghostPressed }]}
    >
      {children}
      {badge !== undefined && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

function FiltroChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Remover filtro ${label}`} style={styles.chip}>
      <Text style={[type.label, { fontFamily: fonts.medium, color: colors.primaryText }]}>{label}</Text>
      <X size={14} weight="bold" color={colors.primaryText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: space.gutter, paddingBottom: 12 },
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  cidade: { fontFamily: fonts.display, fontSize: 22, lineHeight: 24, textTransform: 'uppercase', color: colors.text },
  iconBtn: { width: touch.min, height: touch.min, borderRadius: radius.control, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.text },
  padded: { paddingHorizontal: space.gutter, gap: 12 },
  toast: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: radius.control, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  emailBanner: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: radius.control, backgroundColor: colors.warningTint, borderWidth: 1, borderColor: colors.warningBorder },
  chips: { gap: 8, alignItems: 'center' },
  chip: { flexDirection: 'row', gap: 6, alignItems: 'center', height: 32, paddingHorizontal: 12, borderRadius: radius.chip, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primaryTintStrong },
  limpar: { height: 32, justifyContent: 'center', paddingHorizontal: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...type.title, fontSize: 22, lineHeight: 24, color: colors.text },
});
