import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';
import { Button } from './controls';
import { Title } from './display';
import { cx } from '@/lib/cx';
import { useToast, type ToastTone } from '@/lib/toast';

export function OfflineBanner({ updated = 'há 12 min', solid, style }: { updated?: string; solid?: boolean; style?: CSSProperties }) {
  return (
    <div role="status" className={cx('fs-banner', solid ? 'fs-banner--offline-solid' : 'fs-banner--offline')} style={style}>
      <Icon name="wifi-slash" />
      <span style={{ flex: 1 }}>Exibindo dados salvos · atualizado {updated}</span>
    </div>
  );
}

export function ErrorCard({ title, text, onRetry, style }: { title: string; text?: string; onRetry: () => void; style?: CSSProperties }) {
  return (
    <div className="fs-error-card" style={style}>
      <Icon name="cloud-warning" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>{title}</span>
        {text && <span style={{ fontSize: 13 }} className="fs-muted">{text}</span>}
        <Button variant="secondary" size="default" icon="arrow-clockwise" iconSize={14} onClick={onRetry} style={{ alignSelf: 'flex-start', fontSize: 13, padding: '0 16px' }}>
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, text, children, bare, style, titleSize = 26 }: { icon: string; title: string; text?: ReactNode; children?: ReactNode; bare?: boolean; style?: CSSProperties; titleSize?: number }) {
  return (
    <div className={cx('fs-empty', bare && 'fs-empty--bare')} style={style}>
      <div className="fs-icon-tile">
        <Icon name={icon} />
      </div>
      <Title as="h3" size={titleSize} lh={1.05}>
        {title}
      </Title>
      {text && <p style={{ fontSize: 14, lineHeight: 1.5 }} className="fs-muted">{text}</p>}
      {children}
    </div>
  );
}

export function Skeleton({ w = '100%', h, r = 6, alt, style }: { w?: number | string; h: number; r?: number; alt?: boolean; style?: CSSProperties }) {
  return <div className={cx('fs-skel', alt && 'fs-skel--2')} style={{ width: w, height: h, borderRadius: r, flex: 'none', ...style }} aria-hidden />;
}

const TOAST_ICON: Record<ToastTone, [string, 'fill' | 'regular', string]> = {
  success: ['check-circle', 'fill', 'var(--fs-success)'],
  info: ['info', 'fill', 'var(--fs-secondary)'],
  error: ['warning-circle', 'fill', 'var(--fs-danger)'],
  achievement: ['trophy', 'fill', 'var(--fs-secondary)'],
  link: ['arrow-square-out', 'fill', 'var(--fs-secondary)'],
};

/** Global toast outlet. `placement` follows the prototypes: top on mobile, bottom-right on desktop. */
export function ToastHost({ placement = 'top' }: { placement?: 'top' | 'bottom-right' }) {
  const { toast, dismiss } = useToast();
  if (!toast) return null;
  const [icon, weight, color] = TOAST_ICON[toast.tone];
  const pos: CSSProperties =
    placement === 'top' ? { position: 'absolute', top: 'calc(env(safe-area-inset-top) + 64px)', left: 16, right: 16 } : { position: 'fixed', right: 24, bottom: 24, maxWidth: 420 };
  return (
    <div key={toast.id} role="status" aria-live="polite" className="fs-toast" style={{ ...pos, zIndex: 60 }}>
      <Icon name={icon} weight={weight} color={color} />
      <span className="fs-toast__text">{toast.text}</span>
      {toast.action ? (
        <Button variant="ghost" size="xs" onClick={() => (toast.action!.onClick(), dismiss())}>
          {toast.action.label}
        </Button>
      ) : (
        <button type="button" aria-label="Fechar" onClick={dismiss} className="fs-icon-btn fs-icon-btn--plain" style={{ width: 36, height: 36, fontSize: 16, color: 'var(--fs-text-secondary)' }}>
          <Icon name="x" />
        </button>
      )}
    </div>
  );
}
