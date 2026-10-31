import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowClockwise, Camera, InstagramLogo, YoutubeLogo } from 'phosphor-react-native';
import { AuthScreen } from '../../components/AuthScreen';
import { OnboardingHeader } from '../../components/OnboardingHeader';
import { Button, ErrorAlert, FileHint, ScreenTitle, TextField } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { perfilApi } from '../../features/perfil/api';
import { usePhotoUploads } from '../../features/uploads/usePhotoUploads';
import { ApiError } from '../../lib/http';
import { colors, type } from '../../theme';

const BIO_MAX = 160;

/** UC-16 · Dados opcionais (passo 2 de 4). Tudo pode ser pulado e editado depois em Perfil. */
export default function DadosOpcionais() {
  const { withToken, setUsuario } = useAuth();
  const foto = usePhotoUploads('foto_perfil', 1);
  const [bio, setBio] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const next = () => router.replace('/cadastro/localizacao');
  const avatar = foto.photos[0];

  async function pickAvatar() {
    if (avatar) foto.remove(avatar.key);
    await foto.pick();
  }

  async function save() {
    const vazio = !bio.trim() && !instagram.trim() && !youtube.trim() && !avatar;
    if (vazio) return next();
    setSaving(true);
    setSummary(null);
    try {
      const { usuario } = await withToken((token) =>
        perfilApi.update(token, {
          bio: bio.trim() || null,
          instagram: instagram.trim() || null,
          youtube: youtube.trim() || null,
          ...(foto.uploadIds[0] ? { fotoUploadId: foto.uploadIds[0] } : {}),
        }),
      );
      setUsuario(usuario);
      next();
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      setSummary(err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const clearError = (k: string) => errors[k] && setErrors((e) => ({ ...e, [k]: '' }));
  const avatarBusy = avatar && (avatar.status === 'preparing' || avatar.status === 'uploading');

  return (
    <AuthScreen
      stickyFooter
      header={<OnboardingHeader step={2} action={{ label: 'Pular', onPress: next, outlined: true }} />}
      footer={
        <View style={styles.footer}>
          <Button label="Pular" variant="ghost" onPress={next} style={styles.skip} />
          <Button label="Continuar" onPress={save} loading={saving} disabled={!!avatarBusy} style={{ flex: 1 }} />
        </View>
      }
    >
      <View style={{ gap: 4 }}>
        <ScreenTitle kicker="Passo 2 de 4 · Opcional" title="Complete seu perfil" size="M" />
        <Text style={[type.body, { color: colors.textSecondary }]}>Você pode editar depois em Perfil.</Text>
      </View>

      {summary && <ErrorAlert compact message={summary} />}

      <View style={styles.avatarRow}>
        <Pressable
          onPress={pickAvatar}
          accessibilityRole="button"
          accessibilityLabel={avatar ? 'Trocar foto de perfil' : 'Escolher foto de perfil'}
          style={[styles.avatar, avatar?.status === 'error' && { borderColor: colors.danger }]}
        >
          {avatar ? (
            <Image source={{ uri: avatar.localUri }} style={[StyleSheet.absoluteFill, avatar.status !== 'done' && { opacity: 0.4 }]} />
          ) : (
            <Camera size={28} color={colors.textSecondary} />
          )}
          {avatarBusy && <ActivityIndicator color={colors.primary} />}
          {avatar?.status === 'error' && <ArrowClockwise size={24} color={colors.dangerText} />}
        </Pressable>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[type.button, { color: colors.text }]}>Foto de perfil</Text>
          <Text style={[type.label, { color: colors.textSecondary }]}>
            {avatar?.status === 'error' ? avatar.error : 'Toque no círculo para escolher. Aparece no ranking e nas inscrições.'}
          </Text>
          <FileHint />
        </View>
      </View>

      <TextField
        label="Bio"
        labelRight={<Text style={[type.label, { color: colors.textSecondary }]}>{bio.length}/{BIO_MAX}</Text>}
        value={bio}
        onChangeText={(v) => {
          setBio(v.slice(0, BIO_MAX));
          clearError('bio');
        }}
        maxLength={BIO_MAX}
        multiline
        placeholder="Ex.: Track days desde 2018, foco em Turismo."
        error={errors.bio || undefined}
      />
      <TextField
        label="Instagram"
        left={<InstagramLogo size={20} color={colors.textSecondary} />}
        value={instagram}
        onChangeText={(v) => {
          setInstagram(v);
          clearError('instagram');
        }}
        placeholder="@seuperfil"
        autoCapitalize="none"
        autoCorrect={false}
        error={errors.instagram || undefined}
      />
      <TextField
        label="YouTube"
        left={<YoutubeLogo size={20} color={colors.textSecondary} />}
        value={youtube}
        onChangeText={(v) => {
          setYoutube(v);
          clearError('youtube');
        }}
        placeholder="youtube.com/@canal"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        error={errors.youtube || undefined}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: 8 },
  skip: { paddingHorizontal: 20, minHeight: 52 },
  avatarRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
