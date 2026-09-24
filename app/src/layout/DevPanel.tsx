import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/ui/Icon';
import { Segmented, Switch } from '@/ui/controls';
import { useNetwork, type NetworkMode } from '@/lib/network';
import { useApp } from '@/store/app';
import { useOrganizer } from '@/store/organizer';
import { seedVehicles } from '@/data/pilot';
import { useDemoFillStore } from '@/lib/demoFill';
import styles from './DevPanel.module.css';

const DEV_FLAG = 'fast-street:dev';

function devEnabled() {
  if (import.meta.env.DEV) return true;
  try {
    const q = new URLSearchParams(location.search).get('dev');
    if (q === '1') localStorage.setItem(DEV_FLAG, '1');
    if (q === '0') localStorage.removeItem(DEV_FLAG);
    return localStorage.getItem(DEV_FLAG) === '1';
  } catch {
    return false;
  }
}

/**
 * QA panel replacing the prototypes' "Telas e estados" lists: simulates the
 * network (loading/erro/offline), location permission and an empty garage so
 * every designed state is reachable in the real app. Hidden in production
 * unless `?dev=1` is passed once.
 */
export function DevPanel() {
  const [enabled] = useState(devEnabled);
  const [open, setOpen] = useState(false);
  const { mode, setMode, raceSoldOut, setRaceSoldOut } = useNetwork();
  const location = useApp((s) => s.location);
  const vehicles = useApp((s) => s.vehicles);
  const filler = useDemoFillStore((s) => s.filler);
  if (!enabled) return null;

  const emptyGarage = vehicles.length === 0;
  const reset = () => {
    useApp.getState().resetDemo();
    useOrganizer.getState().reset();
    useApp.getState().signIn();
    setMode('online');
  };

  return (
    <div className={styles.wrap}>
      {open && (
        <div className={styles.panel} role="dialog" aria-label="Estados de demonstração">
          <div className={styles.head}>
            <span className="fs-overline">Estados (QA)</span>
            <button type="button" className={styles.close} aria-label="Fechar" onClick={() => setOpen(false)}>
              <Icon name="x" />
            </button>
          </div>
          {filler && (
            <button type="button" className="fs-btn fs-btn--sm" onClick={filler}>
              <Icon name="magic-wand" size={15} />
              Preencher dados fictícios
            </button>
          )}
          <label className={styles.label}>Rede</label>
          <Segmented<NetworkMode>
            block
            size="sm"
            dark
            value={mode}
            onChange={setMode}
            options={[
              { value: 'online', label: 'Online' },
              { value: 'slow', label: 'Lenta' },
              { value: 'error', label: 'Erro' },
              { value: 'offline', label: 'Offline' },
            ]}
          />
          <p className={styles.note}>“Lenta” mostra os skeletons; “Erro” falha na 1ª tentativa e o “Tentar novamente” funciona.</p>
          <div className={styles.row}>
            <span>Localização negada</span>
            <Switch label="Localização negada" checked={location === 'denied'} onChange={(v) => useApp.getState().setLocation(v ? 'denied' : 'granted')} />
          </div>
          <div className={styles.row}>
            <span>Garagem vazia</span>
            <Switch
              label="Garagem vazia"
              checked={emptyGarage}
              onChange={(v) => useApp.setState({ vehicles: v ? [] : seedVehicles() })}
            />
          </div>
          <div className={styles.row}>
            <span>Esgotar vagas ao confirmar</span>
            <Switch label="Esgotar vagas ao confirmar" checked={raceSoldOut} onChange={setRaceSoldOut} />
          </div>
          <div className={styles.links}>
            <Link to="/design-system">Design System</Link>
            <Link to="/organizador">Central do Organizador</Link>
            <button type="button" onClick={reset}>
              Restaurar dados demo
            </button>
          </div>
        </div>
      )}
      <button type="button" className={styles.fab} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Icon name="sliders-horizontal" size={16} />
        Estados
        {mode !== 'online' && <span className={styles.pill}>{mode}</span>}
      </button>
    </div>
  );
}
