import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/ui/Icon';
import { Button } from '@/ui/controls';
import { MainBadge, Overline, PosBadge, SectionHeader, Tag, Title } from '@/ui/display';
import { EmptyState, ErrorCard, OfflineBanner, Skeleton } from '@/ui/feedback';
import { ImageSlot } from '@/ui/ImageSlot';
import { Modal } from '@/ui/overlays';
import { BackButton, Screen, TopBar } from '@/layout/Screen';
import { vehicleMissing } from '@/domain/validation';
import type { Vehicle } from '@/domain/types';
import { useDemoFill } from '@/lib/demoFill';
import { useLoad } from '@/lib/network';
import { toast } from '@/lib/toast';
import { donePhotos, usePhotoUploads } from '@/lib/usePhotoUploads';
import { useApp } from '@/store/app';
import { EMPTY_VEHICLE_FORM, VehicleFormFields, type VehicleFormValues } from './VehicleFormFields';
import { formToVehicle, vehicleToForm } from './vehicleForm';
import s from './garage.module.css';

function VehiclePhoto({ v, index = 0, placeholder = 'Foto do carro' }: { v: Vehicle; index?: number; placeholder?: string }) {
  const src = v.photos?.[index];
  return src ? <img src={src} alt="" className={s.photo} /> : <ImageSlot id={index ? `veh-${v.id}-${index}` : `veh-${v.id}`} placeholder={placeholder} />;
}

const specLine = (v: Vehicle) => [v.pot && `${v.pot} cv`, v.motor].filter(Boolean).join(' · ');

/** UC-02 · Garagem: list with the main vehicle first. */
export function Garage() {
  const navigate = useNavigate();
  const load = useLoad('garage');
  const vehicles = useApp((st) => st.vehicles);
  const sorted = [...vehicles].sort((a, b) => Number(b.main) - Number(a.main));
  const ready = load.status === 'ready';

  return (
    <Screen
      label="Garagem"
      header={
        <header className={s.header}>
          <Title as="h1" size={36} lh={1} style={{ flex: 1 }}>
            Garagem
          </Title>
          {ready && vehicles.length > 0 && (
            <Button icon="plus" onClick={() => navigate('/garagem/novo')} style={{ padding: '0 14px' }}>
              Veículo
            </Button>
          )}
        </header>
      }
      bodyClassName={s.listBody}
    >
      {load.offline && ready && <OfflineBanner updated="há 3 min" />}
      {load.status === 'loading' &&
        [1, 2, 3].map((k) => (
          <div key={k} className={s.skel} aria-hidden>
            <Skeleton w={132} h={112} r={0} alt />
            <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Skeleton w="40%" h={12} r={4} alt />
              <Skeleton w="80%" h={18} alt />
              <Skeleton w="50%" h={12} r={4} alt />
            </div>
          </div>
        ))}
      {load.status === 'error' && <ErrorCard title="Não foi possível carregar sua garagem" onRetry={load.retry} />}
      {ready && vehicles.length === 0 && (
        <EmptyState icon="garage" title="Sua garagem está vazia" text="Cadastre seu primeiro veículo para se inscrever em eventos. Leva cerca de 1 minuto." titleSize={28} style={{ marginTop: 40 }}>
          <Button size="md" icon="plus" onClick={() => navigate('/garagem/novo')}>
            Cadastrar veículo
          </Button>
        </EmptyState>
      )}
      {ready &&
        sorted.map((v) => (
          <Link key={v.id} to={`/garagem/${v.id}`} className={s.car} data-main={v.main || undefined}>
            <div className={s.carMedia}>
              <VehiclePhoto v={v} />
            </div>
            <div className={s.carBody}>
              {v.main && (
                <span style={{ alignSelf: 'flex-start' }}>
                  <MainBadge />
                </span>
              )}
              <span className="fs-display" style={{ fontSize: 22, lineHeight: 1.05 }}>
                {v.name}
              </span>
              <span className="fs-caption">
                {v.year} · {v.color}
              </span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Tag>{v.cat}</Tag>
                <span className="fs-body" style={{ fontSize: 12 }}>
                  {specLine(v)}
                </span>
              </div>
            </div>
          </Link>
        ))}
    </Screen>
  );
}

/** UC-19 · Detalhe do veículo with history and "Tornar principal". */
export function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const v = useApp((st) => st.vehicles.find((x) => x.id === id));
  if (!v) return <Navigate to="/garagem" replace />;

  const specs: [string, string, boolean?][] = [
    ['Motor', v.motor || '—', true],
    ['Potência', v.pot ? `${v.pot} cv` : '—'],
    ['Torque', v.torque ? `${v.torque} kgfm` : '—'],
    ['Peso', v.peso ? `${v.peso} kg` : '—'],
    ['Transmissão', v.trans || '—'],
  ];
  const mods = v.mods.split('\n').filter(Boolean);

  return (
    <div className={s.detail}>
      <div className={s.hero}>
        <VehiclePhoto v={v} placeholder="Foto principal" />
        <div className={s.heroShade} />
        <div className={s.heroBar}>
          <BackButton variant="glass" to="/garagem" />
          <Button variant="plain" icon="pencil-simple" style={{ background: 'rgba(26,39,48,.75)', padding: '0 14px' }} onClick={() => navigate(`/garagem/${v.id}/editar`)}>
            Editar
          </Button>
        </div>
      </div>
      <div className={s.detailContent}>
        <div className={s.thumbs}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={s.thumb}>
              <VehiclePhoto v={v} index={i} placeholder=" " />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Tag md>{v.cat}</Tag>
            {v.main && <MainBadge md />}
          </div>
          <Title as="h1" size={40}>
            {v.name}
          </Title>
          <span style={{ fontSize: 14 }} className="fs-muted">
            {v.year} · {v.color}
          </span>
        </div>
        {!v.main && (
          <Button
            variant="secondary-blue"
            size="md"
            icon="star"
            iconSize={18}
            onClick={() => {
              useApp.getState().makeMain(v.id);
              toast(`${v.name} agora é seu veículo principal`);
            }}
          >
            Tornar principal
          </Button>
        )}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionHeader title="Especificações" size={22} />
          <div className={s.specs}>
            {specs.map(([k, val, wide]) => (
              <div key={k} className={s.spec} style={wide ? { gridColumn: '1 / -1' } : undefined}>
                <span className="fs-caption">{k}</span>
                <span className="fs-display" style={{ fontSize: 20, lineHeight: 1.1 }}>
                  {val}
                </span>
              </div>
            ))}
          </div>
          {mods.length > 0 && (
            <div className={s.spec} style={{ gap: 6 }}>
              <span className="fs-caption">Modificações</span>
              {mods.map((m) => (
                <span key={m} style={{ fontSize: 14, display: 'flex', gap: 8 }}>
                  <Icon name="wrench" color="var(--fs-secondary)" style={{ marginTop: 3 }} />
                  {m}
                </span>
              ))}
            </div>
          )}
        </section>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SectionHeader title="Histórico de eventos" size={22} />
          {!v.history.length && (
            <span style={{ fontSize: 14 }} className="fs-muted">
              Este veículo ainda não participou de eventos.
            </span>
          )}
          {v.history.map((h) => (
            <div key={h.name} className="fs-row" style={{ cursor: 'default' }}>
              <PosBadge pos={h.pos} size={16} podium={['P1', 'P2', 'P3'].includes(h.pos)} style={{ width: 44 }} />
              <span className="fs-row__main">
                <span className="fs-row__title">{h.name}</span>
                <span className="fs-row__sub">
                  {h.date} · {h.cat}
                </span>
              </span>
              <span className="fs-num" style={{ fontSize: 16 }}>
                +{h.pts} PTS
              </span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

const GOLF_PLACEHOLDERS = { modelo: 'Ex.: Golf GTI', ano: '2016', cor: 'Branco', motor: '2.0 TSI', pot: '230', torque: '35,7', peso: '1.380', trans: 'DSG 6' };

/** UC-01 cadastro (novo) / UC-20-21 edição, with per-photo upload and delete. */
export function VehicleEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const returnTo = (useLocation().state as { returnTo?: string } | null)?.returnTo;
  const editing = useApp((st) => (id ? st.vehicles.find((v) => v.id === id) : undefined));
  const [form, setForm] = useState<VehicleFormValues>(() => (editing ? vehicleToForm(editing) : EMPTY_VEHICLE_FORM));
  const uploads = usePhotoUploads(editing ? (editing.photos?.length ? editing.photos.map((url, i) => ({ key: `e${i}`, url, status: 'done' as const, progress: 100 })) : donePhotos(4)) : []);
  const [specs, setSpecs] = useState(!!editing);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const missing = vehicleMissing(form, uploads.done);

  useDemoFill(() => {
    setForm({ ...EMPTY_VEHICLE_FORM, marca: 'Volkswagen', modelo: 'Gol GTI', ano: '1994', cor: 'Preto', cat: 'Aspirado' });
    for (let i = uploads.items.length; i < 3; i++) uploads.addPlaceholder();
  });

  if (id && !editing) return <Navigate to="/garagem" replace />;

  const close = () => navigate(editing ? `/garagem/${editing.id}` : returnTo ?? '/garagem');

  const save = () => {
    if (missing.length) return;
    const data = { ...formToVehicle(form), photos: uploads.items.map((p) => p.url).filter(Boolean) as string[] };
    const st = useApp.getState();
    if (editing) {
      st.updateVehicle(editing.id, data);
      toast('Alterações salvas');
      navigate(`/garagem/${editing.id}`);
    } else {
      st.addVehicle(data);
      toast('Veículo cadastrado na garagem');
      navigate(returnTo ?? '/garagem');
    }
  };

  return (
    <Screen
      header={
        <TopBar>
          <BackButton icon="x" label="Fechar" onClick={close} />
          <Overline style={{ flex: 1, fontSize: 13 }}>{editing ? 'UC-20 · Editar veículo' : 'UC-01 · Novo veículo'}</Overline>
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
            {editing ? 'Salvar alterações' : 'Salvar veículo'}
          </Button>
        </>
      }
    >
      <div className={s.form}>
        <Title as="h1" size={38}>
          {editing ? `Editar ${form.modelo || 'veículo'}` : 'Cadastrar veículo'}
        </Title>
        <VehicleFormFields
          value={form}
          onChange={(p) => setForm((f) => ({ ...f, ...p }))}
          uploads={uploads}
          specsOpen={specs}
          onToggleSpecs={() => setSpecs((x) => !x)}
          tileMode="remove"
          photosLabel="Fotos · mínimo 3"
          placeholders={GOLF_PLACEHOLDERS}
        />
        {editing && (
          <Button variant="danger-ghost" icon="trash" style={{ alignSelf: 'flex-start', padding: '0 14px' }} onClick={() => setConfirmDelete(true)}>
            Excluir veículo
          </Button>
        )}
      </div>
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Excluir veículo?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                useApp.getState().removeVehicle(editing!.id);
                toast('Veículo excluído');
                navigate('/garagem', { replace: true });
              }}
            >
              Excluir
            </Button>
          </>
        }
      >
        <p style={{ fontSize: 14, lineHeight: 1.5 }} className="fs-body">
          O histórico de eventos permanece no seu perfil. Inscrições futuras com este carro serão canceladas.
        </p>
      </Modal>
    </Screen>
  );
}
