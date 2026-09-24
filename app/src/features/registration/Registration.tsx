import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/ui/Icon';
import { Button, Checkbox } from '@/ui/controls';
import { Badge, MainBadge, Overline, StepBar, Title } from '@/ui/display';
import { ImageSlot } from '@/ui/ImageSlot';
import { RouteSheet } from '@/ui/overlays';
import { BackButton, Screen, TopBar } from '@/layout/Screen';
import { EVENTS } from '@/data/events';
import { compatibleVehicles, registrationBlocker } from '@/domain/events';
import { km } from '@/domain/format';
import type { EventItem, Vehicle } from '@/domain/types';
import { useNetwork } from '@/lib/network';
import { mainVehicle, spotsLeft, useApp } from '@/store/app';
import s from './registration.module.css';

type Result = 'ok' | 'pending' | 'full' | 'incompat' | 'noveh';
type Step = 'vehicle' | 'review' | Result;

/** UC-05 (público) / UC-24 (privado): inscrição rápida em 2 passos + telas de resultado. */
export function Registration() {
  const { id } = useParams();
  const event = EVENTS.find((e) => e.id === id);
  const from = (useLocation().state as { from?: string } | null)?.from ?? (event ? `/eventos/${event.id}` : '/mapa');
  if (!event) return <Navigate to="/feed" replace />;
  return <RegistrationFlow key={event.id} event={event} from={from} />;
}

function RegistrationFlow({ event, from }: { event: EventItem; from: string }) {
  const navigate = useNavigate();
  const vehicles = useApp((st) => st.vehicles);
  const [step, setStep] = useState<Step>(() => registrationBlocker(event, useApp.getState().vehicles) ?? 'vehicle');
  const [vehId, setVehId] = useState<string | undefined>(() => {
    const main = mainVehicle(useApp.getState().vehicles);
    return main && event.cats.includes(main.cat) ? main.id : undefined;
  });
  const [rules, setRules] = useState(false);
  const [busy, setBusy] = useState(false);
  const [route, setRoute] = useState(false);
  const selVeh = vehicles.find((v) => v.id === vehId);
  const backLabel = from === '/mapa' ? 'Voltar ao mapa' : 'Voltar ao evento';

  const confirm = () => {
    if (!rules || !selVeh) return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      const st = useApp.getState();
      if (useNetwork.getState().raceSoldOut || spotsLeft(event.id, st) <= 0) {
        st.markSoldOut(event.id);
        setStep('full');
        return;
      }
      const status = event.pub ? 'ok' : 'pending';
      st.register(event.id, selVeh.id, status);
      st.pushNotification(
        status === 'ok'
          ? { type: 'confirmed', title: 'Inscrição confirmada', body: `${event.name} · ${selVeh.name} · ${selVeh.cat}.`, href: `/eventos/${event.id}` }
          : { type: 'pending', title: 'Inscrição pendente', body: `${event.name} exige aprovação. Avisaremos quando o organizador responder.`, href: `/eventos/${event.id}` },
      );
      setStep(status);
    }, 700);
  };

  if (step === 'vehicle' || step === 'review') {
    return (
      <Screen
        header={
          <TopBar>
            <BackButton onClick={() => (step === 'review' ? setStep('vehicle') : navigate(from))} />
            <StepBar total={2} current={step === 'vehicle' ? 0 : 1} style={{ flex: 1, paddingRight: 16 }} />
          </TopBar>
        }
        footer={
          step === 'vehicle' ? (
            <Button size="lg" block disabled={!selVeh} onClick={() => setStep('review')}>
              Continuar
            </Button>
          ) : (
            <Button size="lg" block disabled={!rules} loading={busy} onClick={confirm}>
              {event.pub ? 'Confirmar inscrição' : 'Enviar para aprovação'}
            </Button>
          )
        }
      >
        <div className={s.body}>
          {step === 'vehicle' ? (
            <>
              <div className={s.heading}>
                <Overline>{event.pub ? 'UC-05' : 'UC-24'} · Passo 1 de 2</Overline>
                <Title as="h1" size={38}>
                  Escolha o veículo
                </Title>
                <p style={{ fontSize: 14, marginTop: 4 }} className="fs-muted">
                  {event.name} aceita {event.cats.join(', ')}.
                </p>
              </div>
              <div role="radiogroup" aria-label="Veículo" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {vehicles.map((v) => (
                  <VehicleOption key={v.id} v={v} ok={event.cats.includes(v.cat)} selected={v.id === vehId} onPick={() => setVehId(v.id)} />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className={s.heading}>
                <Overline>{event.pub ? 'UC-05' : 'UC-24'} · Passo 2 de 2</Overline>
                <Title as="h1" size={38}>
                  Revisar inscrição
                </Title>
              </div>
              <div className="fs-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className={s.reviewBlock}>
                  <span className="fs-caption">Evento</span>
                  <span className="fs-display" style={{ fontSize: 22, lineHeight: 1.05 }}>
                    {event.name}
                  </span>
                  <span className="fs-body" style={{ fontSize: 13 }}>
                    {event.dateLabel}
                  </span>
                  <span className="fs-body" style={{ fontSize: 13 }}>
                    {event.localType} · {event.local}
                  </span>
                </div>
                <div className={s.sep} />
                <div className={s.reviewBlock} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="fs-caption">Veículo · categoria</span>
                    <span style={{ fontSize: 15, fontWeight: 500 }}>
                      {selVeh?.name} · {selVeh?.year}
                    </span>
                    <span className="fs-body" style={{ fontSize: 13 }}>
                      {selVeh?.cat}
                    </span>
                  </span>
                  <Button variant="ghost" style={{ padding: '0 10px' }} onClick={() => setStep('vehicle')}>
                    Trocar
                  </Button>
                </div>
                <div className={s.sep} />
                <div className={s.reviewBlock} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <Icon name={event.pub ? 'globe-simple' : 'lock-simple'} size={18} color={event.pub ? 'var(--fs-text)' : 'var(--fs-warning-text)'} style={{ marginTop: 1 }} />
                  <span className="fs-body" style={{ fontSize: 13, lineHeight: 1.5 }}>
                    {event.pub ? 'Evento público: sua inscrição é confirmada na hora.' : 'Evento privado: o organizador precisa aprovar sua inscrição. Você será notificado.'}
                  </span>
                </div>
              </div>
              <Checkbox checked={rules} onChange={setRules} label="Aceitar regras">
                Li as <Link to={`/eventos/${event.id}`}>regras do evento</Link> e sei que o uso de equipamento de segurança é obrigatório.
              </Checkbox>
              <p style={{ fontSize: 12, lineHeight: 1.5 }} className="fs-muted">
                O Fast Street não processa pagamentos. Taxas, se houver, são combinadas com o organizador.
              </p>
            </>
          )}
        </div>
      </Screen>
    );
  }

  return (
    <>
      <ResultScreen
        result={step}
        event={event}
        vehicle={selVeh}
        backLabel={backLabel}
        onBack={() => navigate(from)}
        onRoute={() => setRoute(true)}
        onUseVehicle={(v) => {
          setVehId(v);
          setRules(false);
          setStep('vehicle');
        }}
      />
      <RouteSheet open={route} onClose={() => setRoute(false)} place={event.local} />
    </>
  );
}

function VehicleOption({ v, ok, selected, onPick }: { v: Vehicle; ok: boolean; selected: boolean; onPick: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={selected} disabled={!ok} className="fs-option" style={{ minHeight: 72 }} onClick={onPick}>
      <span className={`fs-radio-dot${selected ? ' fs-radio-dot--on' : ''}`} />
      <span style={{ width: 52, height: 52, flex: 'none', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
        {v.photos?.[0] ? <img src={v.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageSlot id={`veh-${v.id}`} placeholder=" " editable={false} />}
      </span>
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>
          {v.name} · {v.year}
        </span>
        <span style={{ fontSize: 12, color: ok ? 'var(--fs-text-secondary)' : 'var(--fs-danger-text)', display: 'flex', gap: 4, alignItems: 'center' }}>
          <Icon name={ok ? 'tag' : 'prohibit'} size={12} />
          {ok ? v.cat : `${v.cat} não é aceito neste evento`}
        </span>
      </span>
      {v.main && <MainBadge />}
    </button>
  );
}

const RESULT_VIEW: Record<Result, { icon: string; color: string; glow: string; kicker: string; title: string }> = {
  ok: { icon: 'check-circle', color: 'var(--fs-success)', glow: 'rgba(34,197,94,.12)', kicker: 'UC-05 · Confirmada', title: 'Inscrição confirmada' },
  pending: { icon: 'hourglass-medium', color: 'var(--fs-warning)', glow: 'rgba(245,158,11,.12)', kicker: 'UC-24 · Pendente', title: 'Aguardando aprovação do organizador' },
  full: { icon: 'prohibit', color: 'var(--fs-danger-text)', glow: 'rgba(239,68,68,.12)', kicker: 'UC-05 · Vagas esgotadas', title: 'As vagas acabaram' },
  incompat: { icon: 'swap', color: 'var(--fs-warning)', glow: 'rgba(245,158,11,.10)', kicker: 'UC-05 · Categoria incompatível', title: 'Veículo principal incompatível' },
  noveh: { icon: 'garage', color: 'var(--fs-secondary)', glow: 'rgba(176,206,226,.10)', kicker: 'UC-05 · Sem veículo', title: 'Sua garagem está vazia' },
};

function ResultScreen({
  result,
  event,
  vehicle,
  backLabel,
  onBack,
  onRoute,
  onUseVehicle,
}: {
  result: Result;
  event: EventItem;
  vehicle?: Vehicle;
  backLabel: string;
  onBack: () => void;
  onRoute: () => void;
  onUseVehicle: (id: string) => void;
}) {
  const navigate = useNavigate();
  const vehicles = useApp((st) => st.vehicles);
  const regs = useApp((st) => st.registrations);
  const soldOut = useApp((st) => st.soldOut);
  const main = mainVehicle(vehicles);
  const compat = compatibleVehicles(event, vehicles);
  const v = RESULT_VIEW[result];
  const alts = EVENTS.filter((x) => x.id !== event.id && x.status !== 'encerrado' && spotsLeft(x.id, { registrations: regs, soldOut }) > 0 && (vehicle ? x.cats.includes(vehicle.cat) : true)).slice(0, 2);

  const body: Record<Result, string> = {
    ok: 'Você está no grid. Enviaremos um lembrete na véspera com o horário do briefing.',
    pending: `${event.org} vai analisar sua inscrição. Você recebe uma notificação quando ela for aprovada ou recusada.`,
    full: 'As últimas vagas foram preenchidas enquanto você revisava a inscrição. Nenhum dado foi perdido.',
    incompat: `Seu ${main?.name ?? 'veículo'} (${main?.cat}) não é aceito. ${event.name} aceita ${event.cats.join(', ')}.`,
    noveh: 'Para se inscrever você precisa de pelo menos um veículo cadastrado. Leva cerca de 1 minuto.',
  };

  const newVehicle = () => navigate('/garagem/novo', { state: { returnTo: `/eventos/${event.id}` } });
  const primary: Partial<Record<Result, { label: string; icon: string; onClick: () => void }>> = {
    ok: { label: 'Abrir no Maps/Waze', icon: 'navigation-arrow', onClick: onRoute },
    pending: { label: 'Ver minhas inscrições', icon: 'list-checks', onClick: () => navigate(`/eventos/${event.id}`) },
    incompat: compat.length ? undefined : { label: 'Cadastrar veículo', icon: 'plus', onClick: newVehicle },
    noveh: { label: 'Cadastrar veículo', icon: 'plus', onClick: newVehicle },
  };
  const p = primary[result];

  return (
    <Screen
      plainFooter
      footer={
        <>
          {p && (
            <Button size="lg" icon={p.icon} iconSize={18} onClick={p.onClick}>
              {p.label}
            </Button>
          )}
          <Button variant="secondary" size="md" onClick={onBack}>
            {backLabel}
          </Button>
        </>
      }
      bodyStyle={{ background: `radial-gradient(100% 50% at 0% 10%, ${v.glow}, transparent 70%)` }}
    >
      <div className={s.result} role="status">
        <div className={s.resultIcon} style={{ borderColor: v.color, color: v.color }}>
          <Icon name={v.icon} size={36} />
        </div>
        <Overline style={{ color: v.color }}>{v.kicker}</Overline>
        <Title as="h1" size={42}>
          {v.title}
        </Title>
        <p style={{ fontSize: 15, lineHeight: 1.55 }} className="fs-body">
          {body[result]}
        </p>

        {(result === 'ok' || result === 'pending') && vehicle && (
          <div className="fs-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span className="fs-display" style={{ fontSize: 20, lineHeight: 1.05 }}>
                {event.name}
              </span>
              {result === 'ok' ? (
                <Badge tone="success" icon="check" iconWeight="bold">
                  Confirmada
                </Badge>
              ) : (
                <Badge tone="warning" icon="hourglass-medium">
                  Pendente
                </Badge>
              )}
            </div>
            <span className="fs-body" style={{ fontSize: 13 }}>
              {event.dateLabel} · {event.localType}
            </span>
            <span className="fs-body" style={{ fontSize: 13 }}>
              {vehicle.name} · {vehicle.cat}
            </span>
          </div>
        )}

        {result === 'incompat' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13 }} className="fs-muted">
              {compat.length ? 'Compatíveis na sua garagem' : 'Nenhum veículo compatível na sua garagem'}
            </span>
            {compat.map((c) => (
              <div key={c.id} className="fs-card" style={{ padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'center', minHeight: 60 }}>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>
                    {c.name} · {c.year}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--fs-success-text)' }}>{c.cat} · compatível</span>
                </span>
                <Button style={{ padding: '0 14px', fontSize: 13 }} onClick={() => onUseVehicle(c.id)}>
                  Usar este
                </Button>
              </div>
            ))}
          </div>
        )}

        {result === 'full' && alts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13 }} className="fs-muted">
              Eventos parecidos com vagas
            </span>
            {alts.map((a) => (
              <Link key={a.id} to={`/eventos/${a.id}`} className="fs-card" style={{ padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'center', minHeight: 60, color: 'var(--fs-text)', textDecoration: 'none' }}>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{a.name}</span>
                  <span className="fs-caption">
                    {a.dateLabel} · {km(a.dist)}
                  </span>
                </span>
                <Icon name="caret-right" size={16} color="var(--fs-text-secondary)" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </Screen>
  );
}
