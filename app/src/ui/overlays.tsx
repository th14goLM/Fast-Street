import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@/lib/cx';
import { Title } from './display';

export const OVERLAY_ROOT_ID = 'fs-overlay-root';

/** Renders into the overlay layer of the current app column (covers the bottom nav too). */
function OverlayPortal({ children }: { children: ReactNode }) {
  const root = typeof document !== 'undefined' ? document.getElementById(OVERLAY_ROOT_ID) : null;
  return root ? createPortal(children, root) : <>{children}</>;
}

function useDialogBehaviour(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const first = ref.current?.querySelector<HTMLElement>('button, input, textarea, select, a[href]');
    first?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.({ preventScroll: true });
    };
    // Only re-run when the dialog opens or closes, not when the callback identity changes.
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return ref;
}

interface SheetProps {
  open: boolean;
  onClose: () => void;
  label: string;
  elevated?: boolean;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, label, elevated, children }: SheetProps) {
  const ref = useDialogBehaviour(open, onClose);
  if (!open) return null;
  return (
    <OverlayPortal>
      <div className="fs-overlay">
        <div className="fs-scrim" onClick={onClose} />
        <div ref={ref} role="dialog" aria-modal="true" aria-label={label} className={cx('fs-sheet', elevated && 'fs-sheet--elevated')}>
          <div className="fs-sheet__handle" />
          {children}
        </div>
      </div>
    </OverlayPortal>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  actions: ReactNode;
  width?: number;
}

export function Modal({ open, onClose, title, children, actions, width }: ModalProps) {
  const ref = useDialogBehaviour(open, onClose);
  if (!open) return null;
  return (
    <OverlayPortal>
      <div className="fs-overlay">
        <div className="fs-modal-wrap" onClick={(e) => e.target === e.currentTarget && onClose()}>
          <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="fs-modal" style={width ? { maxWidth: width, padding: 24 } : undefined}>
            <Title as="h3" size={width ? 26 : 24} lh={1}>
              {title}
            </Title>
            {children}
            <div className="fs-modal__actions">{actions}</div>
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}

/** Native-looking chooser to open the route in Google Maps or Waze. */
export function RouteSheet({ open, onClose, place }: { open: boolean; onClose: () => void; place: string }) {
  const ref = useDialogBehaviour(open, onClose);
  if (!open) return null;
  const q = encodeURIComponent(place);
  const go = (url: string) => {
    window.open(url, '_blank', 'noopener');
    onClose();
  };
  return (
    <OverlayPortal>
      <div className="fs-overlay">
        <div className="fs-scrim" style={{ background: 'rgba(10,15,19,.45)' }} onClick={onClose} />
        <div ref={ref} role="dialog" aria-modal="true" aria-label="Abrir rota" className="fs-sys" style={{ position: 'absolute', left: 8, right: 8, bottom: 30, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="fs-sys__group">
            <div className="fs-sys__caption">Abrir rota até {place} em</div>
            <button type="button" className="fs-sys__btn" onClick={() => go(`https://www.google.com/maps/dir/?api=1&destination=${q}`)}>
              Google Maps
            </button>
            <button type="button" className="fs-sys__btn" onClick={() => go(`https://waze.com/ul?q=${q}&navigate=yes`)}>
              Waze
            </button>
          </div>
          <button type="button" className="fs-sys__cancel" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </OverlayPortal>
  );
}

/** OS permission prompt mock shown after the in-app pre-permission. */
export function SystemAlert({ open, title, text, buttons }: { open: boolean; title: string; text: string; buttons: { label: string; bold?: boolean; onClick: () => void }[] }) {
  const ref = useDialogBehaviour(open, () => undefined);
  if (!open) return null;
  const inline = buttons.length === 2;
  return (
    <OverlayPortal>
      <div className="fs-overlay">
        <div ref={ref} role="alertdialog" aria-modal="true" aria-label={title} style={{ position: 'absolute', inset: 0, background: 'rgba(10,15,19,.55)', display: 'grid', placeItems: 'center' }}>
          <div className="fs-sys-alert">
            <div className="fs-sys-alert__body">
              <span className="fs-sys-alert__title">{title}</span>
              <span className="fs-sys-alert__text">{text}</span>
            </div>
            <div style={inline ? { display: 'grid', gridTemplateColumns: '1fr 1fr' } : undefined}>
              {buttons.map((b, i) => (
                <button
                  key={b.label}
                  type="button"
                  className={cx('fs-sys__btn', b.bold && 'fs-sys__btn--bold')}
                  style={inline && i === 0 ? { borderRight: '1px solid rgba(255,255,255,.12)' } : undefined}
                  onClick={b.onClick}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}
