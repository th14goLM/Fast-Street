import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/ui/Icon';
import { Button } from '@/ui/controls';
import { Field, Input, Textarea } from '@/ui/form';
import { Overline, StepBar, Title } from '@/ui/display';
import { ImageSlot } from '@/ui/ImageSlot';
import { SystemAlert } from '@/ui/overlays';
import { Screen, TopBar } from '@/layout/Screen';
import { vehicleMissing } from '@/domain/validation';
import { useDemoFill } from '@/lib/demoFill';
import { usePhotoUploads } from '@/lib/usePhotoUploads';
import { toast } from '@/lib/toast';
import { useApp } from '@/store/app';
import { EMPTY_VEHICLE_FORM, VehicleFormFields, type VehicleFormValues } from '@/features/garage/VehicleFormFields';
import { formToVehicle } from '@/features/garage/vehicleForm';
import s from './auth.module.css';

/** UC-16 · Dados opcionais (passo 2 de 4). */
export function OptionalProfile() {
  const navigate = useNavigate();
  const user = useApp((st) => st.user);
  const updateUser = useApp((st) => st.updateUser);
  const [bio, setBio] = useState(user.bio);
  const [ig, setIg] = useState(user.instagram);
  const [yt, setYt] = useState(user.youtube);
  const next = () => navigate('/cadastro/localizacao');

  useDemoFill(() => {
    setBio('Track days desde 2018, foco em Turismo e Turbo.');
    setIg('@lucas.andrade.tt');
  });

  return (
    <Screen
      header={
        <TopBar style={{ paddingLeft: 24 }}>
          <StepBar total={4} current={1} style={{ flex: 1 }} />
          <Button variant="secondary" onClick={next}>
            Pular
          </Button>
        </TopBar>
      }
      footer={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="plain" size="lg" onClick={next}>
            Pular
          </Button>
          <Button
            size="lg"
            style={{ flex: 1 }}
            onClick={() => {
              updateUser({ bio, instagram: ig, youtube: yt });
              next();
            }}
          >
            Continuar
          </Button>
        </div>
      }
    >
      <div className={s.form} style={{ gap: 20, paddingTop: 12 }}>
        <div className={s.heading}>
          <Overline>UC-16 · Passo 2 de 4 · Opcional</Overline>
          <Title as="h1" size={40}>
            Complete seu perfil
          </Title>
          <p style={{ fontSize: 14, marginTop: 4 }} className="fs-muted">
            Você pode editar depois em Perfil.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 96, height: 96, flex: 'none', position: 'relative' }}>
            <ImageSlot id="avatar" shape="circle" placeholder="Foto" pick />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 500 }}>Foto de perfil</span>
            <span style={{ fontSize: 13 }} className="fs-muted">
              Toque no círculo para escolher. Aparece no ranking e nas inscrições.
            </span>
          </div>
        </div>
        <Field label="Bio" aside={`${bio.length}/160`}>
          {(id) => <Textarea id={id} maxLength={160} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Ex.: Track days desde 2018, foco em Turismo." />}
        </Field>
        <Field label="Instagram">{(id) => <Input id={id} icon="instagram-logo" value={ig} onChange={(e) => setIg(e.target.value)} placeholder="@seuperfil" />}</Field>
        <Field label="YouTube">{(id) => <Input id={id} icon="youtube-logo" value={yt} onChange={(e) => setYt(e.target.value)} placeholder="youtube.com/@canal" />}</Field>
      </div>
    </Screen>
  );
}

/** Pre-permission for location (passo 3 de 4), followed by the OS prompt. */
export function PermissionLocation() {
  const navigate = useNavigate();
  const setLocation = useApp((st) => st.setLocation);
  const [prompt, setPrompt] = useState(false);
  const decide = (granted: boolean) => {
    setLocation(granted ? 'granted' : 'denied');
    navigate('/cadastro/notificacoes');
  };

  const ask = () => {
    // Use the real browser prompt when available; fall back to the designed mock.
    if ('geolocation' in navigator && window.isSecureContext && !import.meta.env.DEV) {
      navigator.geolocation.getCurrentPosition(
        () => decide(true),
        () => decide(false),
        { timeout: 8000 },
      );
    } else setPrompt(true);
  };

  return (
    <Screen
      style={{ background: 'radial-gradient(120% 60% at 0% 20%, #22323e, #1a2730 60%)' }}
      header={
        <div style={{ padding: '16px 24px 0' }}>
          <StepBar total={4} current={2} />
        </div>
      }
      plainFooter
      footer={
        <>
          <Button size="lg" onClick={ask}>
            Permitir localização
          </Button>
          <Button variant="plain" size="md" onClick={() => decide(false)}>
            Definir local manualmente
          </Button>
        </>
      }
    >
      <div className={s.permBody}>
        <div className="fs-icon-tile fs-icon-tile--hero">
          <Icon name="map-pin-area" />
        </div>
        <Overline>Passo 3 de 4 · Localização</Overline>
        <Title as="h1" size={44}>
          Eventos perto de você
        </Title>
        <p style={{ fontSize: 15, lineHeight: 1.55 }} className="fs-body">
          Usamos sua localização para mostrar eventos e parceiros próximos e calcular a distância até cada local.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
          <div className={s.permPoint}>
            <Icon name="eye-slash" />
            Sua posição nunca aparece para outros usuários.
          </div>
          <div className={s.permPoint}>
            <Icon name="map-trifold" />O mapa mostra apenas eventos e parceiros.
          </div>
          <div className={s.permPoint}>
            <Icon name="hand-pointing" />
            Prefere não permitir? Defina a cidade manualmente.
          </div>
        </div>
      </div>
      <SystemAlert
        open={prompt}
        title={'Permitir que "Fast Street" use sua localização?'}
        text="Para mostrar eventos e parceiros perto de você."
        buttons={[
          { label: 'Permitir uma vez', onClick: () => decide(true) },
          { label: 'Permitir ao usar o app', bold: true, onClick: () => decide(true) },
          { label: 'Não permitir', onClick: () => decide(false) },
        ]}
      />
    </Screen>
  );
}

/** Pre-permission for notifications. Organizer-only accounts skip the vehicle step. */
export function PermissionNotifications() {
  const navigate = useNavigate();
  const perfil = useApp((st) => st.user.perfil);
  const setPerm = useApp((st) => st.setNotificationsPermission);
  const [prompt, setPrompt] = useState(false);

  const next = (granted: boolean) => {
    setPerm(granted ? 'granted' : 'denied');
    if (perfil === 'org') {
      useApp.getState().setMode('org');
      toast('Conta criada · bem-vindo à Central do Organizador');
      navigate('/feed', { replace: true });
    } else navigate('/cadastro/veiculo');
  };

  const ask = async () => {
    if ('Notification' in window && window.isSecureContext && !import.meta.env.DEV) {
      const r = await Notification.requestPermission().catch(() => 'denied' as const);
      next(r === 'granted');
    } else setPrompt(true);
  };

  return (
    <Screen
      style={{ background: 'radial-gradient(120% 60% at 0% 20%, #22323e, #1a2730 60%)' }}
      header={
        <div style={{ padding: '16px 24px 0' }}>
          <StepBar total={4} current={2} />
        </div>
      }
      plainFooter
      footer={
        <>
          <Button size="lg" onClick={ask}>
            Ativar notificações
          </Button>
          <Button variant="plain" size="md" onClick={() => next(false)}>
            Agora não
          </Button>
        </>
      }
    >
      <div className={s.permBody}>
        <div className="fs-icon-tile fs-icon-tile--hero">
          <Icon name="bell-ringing" />
        </div>
        <Overline>Passo 3 de 4 · Notificações</Overline>
        <Title as="h1" size={44}>
          Fique no grid
        </Title>
        <p style={{ fontSize: 15, lineHeight: 1.55 }} className="fs-body">
          Avisamos quando algo importante acontecer com seus eventos. Você escolhe os tipos em Configurações.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <div className={s.permItem}>
            <Icon name="check-circle" weight="fill" color="var(--fs-success)" />
            Inscrição aprovada
          </div>
          <div className={s.permItem}>
            <Icon name="flag-checkered" color="var(--fs-primary-text)" />
            Novo evento na sua região
          </div>
          <div className={s.permItem}>
            <Icon name="trophy" weight="fill" color="var(--fs-secondary)" />
            Resultado publicado e conquistas
          </div>
        </div>
      </div>
      <SystemAlert
        open={prompt}
        title={'"Fast Street" deseja enviar notificações'}
        text="Alertas, sons e indicadores. Configure em Ajustes."
        buttons={[
          { label: 'Não permitir', onClick: () => next(false) },
          { label: 'Permitir', bold: true, onClick: () => next(true) },
        ]}
      />
    </Screen>
  );
}

/** UC-01 · Primeiro veículo (passo 4 de 4). Becomes the main vehicle. */
export function FirstVehicle() {
  const navigate = useNavigate();
  const addVehicle = useApp((st) => st.addVehicle);
  const uploads = usePhotoUploads();
  const [v, setV] = useState<VehicleFormValues>(EMPTY_VEHICLE_FORM);
  const [specs, setSpecs] = useState(false);
  const missing = vehicleMissing(v, uploads.done);

  useDemoFill(() => {
    setV({ ...EMPTY_VEHICLE_FORM, marca: 'Honda', modelo: 'Civic Si', ano: '2019', cor: 'Cinza Grafite', cat: 'Turbo' });
    const need = 3 - uploads.items.length;
    for (let i = 0; i < need; i++) uploads.addPlaceholder();
  });

  const save = () => {
    if (missing.length) return;
    const saved = addVehicle({ ...formToVehicle(v), photos: uploads.items.map((p) => p.url).filter(Boolean) as string[] });
    toast(`Garagem pronta · ${saved.name} é seu veículo principal`);
    navigate('/feed', { replace: true });
  };

  const skip = () => {
    toast('Cadastre um veículo na Garagem para se inscrever em eventos.', { tone: 'info' });
    navigate('/feed', { replace: true });
  };

  return (
    <Screen
      header={
        <TopBar style={{ paddingLeft: 24 }}>
          <StepBar total={4} current={3} style={{ flex: 1 }} />
          <Button variant="plain" onClick={skip}>
            Fazer depois
          </Button>
        </TopBar>
      }
      footer={
        <>
          {missing.length > 0 && (
            <span className="fs-caption" style={{ textAlign: 'center' }}>
              Falta: {missing.join(', ')}
            </span>
          )}
          <Button size="lg" disabled={missing.length > 0} onClick={save}>
            Salvar e ir para o Feed
          </Button>
        </>
      }
    >
      <div className={s.form} style={{ paddingTop: 12 }}>
        <div className={s.heading}>
          <Overline>UC-01 · Passo 4 de 4</Overline>
          <Title as="h1" size={40}>
            Seu primeiro veículo
          </Title>
          <p style={{ fontSize: 14, marginTop: 4 }} className="fs-muted">
            Necessário para se inscrever em eventos. Ele será o seu veículo principal.
          </p>
        </div>
        <VehicleFormFields value={v} onChange={(p) => setV((cur) => ({ ...cur, ...p }))} uploads={uploads} specsOpen={specs} onToggleSpecs={() => setSpecs((x) => !x)} />
      </div>
    </Screen>
  );
}
