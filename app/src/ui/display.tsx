import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';
import { cx } from '@/lib/cx';
import { LOCAL_ICON } from '@/domain/catalog';
import { TONE_BAR, TONE_TEXT, vacancy } from '@/domain/events';
import { initials } from '@/domain/format';
import { variation } from '@/domain/ranking';
import type { EventStatus, LocalType } from '@/domain/types';

export function Overline({ children, tone, style }: { children: ReactNode; tone?: 'muted' | 'secondary'; style?: CSSProperties }) {
  return (
    <span className={cx('fs-overline', tone && `fs-overline--${tone}`)} style={style}>
      {children}
    </span>
  );
}

/** Barlow Condensed uppercase heading. */
export function Title({
  as: Tag = 'h2',
  size,
  lh,
  children,
  style,
  className,
}: {
  as?: 'h1' | 'h2' | 'h3' | 'span';
  size: number;
  lh?: number;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <Tag className={cx('fs-display', className)} style={{ fontSize: size, lineHeight: lh, ...style }}>
      {children}
    </Tag>
  );
}

export function Tag({ children, md }: { children: ReactNode; md?: boolean }) {
  return <span className={cx('fs-tag', md && 'fs-tag--md')}>{children}</span>;
}

type BadgeTone = 'success' | 'live' | 'neutral' | 'danger' | 'warning' | 'secondary' | 'outline' | 'outline-warning' | 'place';

export function Badge({ tone, icon, iconWeight, dot, small, overlay, children }: { tone: BadgeTone; icon?: string; iconWeight?: 'fill' | 'bold'; dot?: boolean; small?: boolean; overlay?: boolean; children: ReactNode }) {
  return (
    <span className={cx('fs-badge', `fs-badge--${tone}`, small && 'fs-badge--sm', overlay && 'fs-badge--overlay')}>
      {dot && <span className="fs-badge__dot" />}
      {icon && <Icon name={icon} weight={iconWeight} size={small ? 11 : 12} />}
      {children}
    </span>
  );
}

const EVENT_STATUS: Record<EventStatus, { label: string; tone: BadgeTone; icon?: string; dot?: boolean }> = {
  rascunho: { label: 'Rascunho', tone: 'neutral' },
  aberto: { label: 'Aberto', tone: 'success', dot: true },
  andamento: { label: 'Em andamento', tone: 'live', dot: true },
  encerrado: { label: 'Encerrado', tone: 'neutral', icon: 'flag-checkered' },
  cancelado: { label: 'Cancelado', tone: 'danger', icon: 'x-circle' },
};

export function EventStatusBadge({ status, small }: { status: EventStatus; small?: boolean }) {
  const s = EVENT_STATUS[status];
  return (
    <Badge tone={s.tone} icon={s.icon} dot={s.dot} small={small}>
      {s.label}
    </Badge>
  );
}

export function VisibilityBadge({ pub, small, overlay }: { pub: boolean; small?: boolean; overlay?: boolean }) {
  return pub ? (
    <Badge tone="outline" icon="globe-simple" small={small} overlay={overlay}>
      Público
    </Badge>
  ) : (
    <Badge tone="outline-warning" icon="lock-simple" small={small} overlay={overlay}>
      Requer aprovação
    </Badge>
  );
}

export function LocalBadge({ type, prefix }: { type: LocalType; prefix?: string }) {
  return (
    <span className="fs-badge fs-badge--place">
      <Icon name={prefix ? 'shield-check' : LOCAL_ICON[type]} />
      {prefix ? `${prefix} · ${type}` : type}
    </span>
  );
}

export function RegistrationBadge({ status }: { status: 'confirmed' | 'pending' | 'rejected' }) {
  if (status === 'confirmed')
    return (
      <Badge tone="success" icon="check" iconWeight="bold">
        Confirmada
      </Badge>
    );
  if (status === 'pending')
    return (
      <Badge tone="warning" icon="hourglass-medium">
        Pendente
      </Badge>
    );
  return (
    <Badge tone="danger" icon="x" iconWeight="bold">
      Recusada
    </Badge>
  );
}

export function MainBadge({ md }: { md?: boolean }) {
  return (
    <span className="fs-badge fs-badge--secondary fs-badge--sm" style={md ? { fontSize: 12 } : undefined}>
      <Icon name="star" weight="fill" size={11} />
      Principal
    </span>
  );
}

export function VerifiedSeal({ children = 'Organizador verificado', size = 13 }: { children?: ReactNode; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--fs-secondary)', fontSize: size - 1 }}>
      <Icon name="seal-check" weight="fill" size={size + 1} />
      {children}
    </span>
  );
}

export function Progress({ pct, color, height = 4, label }: { pct: number; color?: string; height?: number; label?: string }) {
  return (
    <div className="fs-progress" style={{ height }} role={label ? 'progressbar' : undefined} aria-label={label} aria-valuenow={label ? Math.round(pct) : undefined}>
      <span style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
}

/** "Vagas restantes · 18 de 40" row with the tone-coloured bar. */
export function VacancyBar({ left, total }: { left: number; total: number }) {
  const v = vacancy(left, total);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ color: TONE_TEXT[v.tone] }}>{v.label}</span>
        <span style={{ fontWeight: 500 }}>{v.count}</span>
      </div>
      <Progress pct={v.pct} color={TONE_BAR[v.tone]} />
    </div>
  );
}

export function Avatar({ name, size = 36, style }: { name: string; size?: number; style?: CSSProperties }) {
  return (
    <span className="fs-avatar" style={{ width: size, height: size, fontSize: size >= 40 ? 13 : 12, ...style }} aria-hidden>
      {initials(name)}
    </span>
  );
}

/** Position badge (P1, P2…) – gulf blue for the podium. */
export function PosBadge({ pos, size = 15, podium = typeof pos === 'number' ? pos <= 3 : true, style }: { pos: number | string; size?: number; podium?: boolean; style?: CSSProperties }) {
  return (
    <span className={cx('fs-pos', !podium && 'fs-pos--off')} style={{ fontSize: size, ...style }}>
      {typeof pos === 'number' ? `P${pos}` : pos}
    </span>
  );
}

export function Variation({ delta, size = 12 }: { delta: number; size?: number }) {
  const v = variation(delta);
  return (
    <span className={cx('fs-var', `fs-var--${v.dir}`)} style={{ fontSize: size + 1 }} aria-label={delta ? `${delta > 0 ? 'subiu' : 'caiu'} ${v.n}` : 'sem variação'}>
      <Icon name={v.icon} weight={delta ? 'bold' : 'regular'} size={size - 1} />
      {v.n}
    </span>
  );
}

interface TabsProps<T extends string> {
  tabs: { value: T; label: ReactNode; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  fill?: boolean;
  label?: string;
}

export function Tabs<T extends string>({ tabs, value, onChange, fill, label }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={cx('fs-tabs', fill && 'fs-tabs--fill')}>
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={t.value === value} className="fs-tab" onClick={() => onChange(t.value)}>
          {t.label}
          {t.count !== undefined && (
            <span style={{ minWidth: 22, height: 20, padding: '0 6px', borderRadius: 6, background: 'var(--fs-surface)', color: 'var(--fs-text-body)', font: '500 12px/20px var(--fs-font-body)' }}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Thin segmented progress used by onboarding and registration steps. */
export function StepBar({ total, current, style }: { total: number; current: number; style?: CSSProperties }) {
  return (
    <div className="fs-steps" style={{ gridTemplateColumns: `repeat(${total}, 1fr)`, ...style }} role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={current + 1}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i <= current ? 'is-on' : undefined} />
      ))}
    </div>
  );
}

export function SectionHeader({ title, action, size = 26 }: { title: ReactNode; action?: ReactNode; size?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <Title as="h3" size={size} lh={1}>
        {title}
      </Title>
      {action}
    </div>
  );
}
