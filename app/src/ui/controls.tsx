import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconWeight } from './Icon';
import { cx } from '@/lib/cx';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'plain'
  | 'danger'
  | 'danger-soft'
  | 'danger-ghost'
  | 'success'
  | 'warning'
  | 'secondary-blue'
  | 'state-success'
  | 'state-warning'
  | 'state-off';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'default';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  icon?: string;
  iconWeight?: IconWeight;
  iconSize?: number;
  loading?: boolean;
}

export const buttonClass = (variant: ButtonVariant = 'primary', size: ButtonSize = 'default', block?: boolean, extra?: string) =>
  cx('fs-btn', variant !== 'primary' && `fs-btn--${variant}`, size !== 'default' && `fs-btn--${size}`, block && 'fs-btn--block', extra);

export function Button({ variant = 'primary', size = 'default', block, icon, iconWeight, iconSize = 16, loading, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, block, className)} aria-busy={loading || undefined} {...rest}>
      {loading ? <Icon name="circle-notch" size={iconSize} className="fs-spin" /> : icon && <Icon name={icon} weight={iconWeight} size={iconSize} />}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  label: string;
  variant?: 'outline' | 'plain' | 'glass';
  size?: number;
  dot?: boolean;
  count?: number;
  active?: boolean;
}

export function IconButton({ icon, label, variant = 'outline', size, dot, count, active, className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx('fs-icon-btn', variant !== 'outline' && `fs-icon-btn--${variant}`, active && 'fs-icon-btn--active', className)}
      {...rest}
    >
      <Icon name={icon} size={size} />
      {dot && <span className="fs-icon-btn__dot" />}
      {!!count && <span className="fs-count">{count}</span>}
    </button>
  );
}

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  on?: boolean;
  small?: boolean;
  error?: boolean;
  icon?: string;
  /** Show a check mark when selected (multi-select chips). */
  check?: boolean;
  role?: 'checkbox' | 'radio';
}

export function Chip({ on, small, error, icon, check, role = 'checkbox', className, children, type = 'button', ...rest }: ChipProps) {
  return (
    <button
      type={type}
      role={role}
      aria-checked={!!on}
      className={cx('fs-chip', small && 'fs-chip--sm', error && !on && 'fs-chip--error', className)}
      {...rest}
    >
      {check && on && <Icon name="check" weight="bold" size={12} />}
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  );
}

export interface SegOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: string;
}

interface SegmentedProps<T extends string> {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  block?: boolean;
  size?: 'sm' | 'md' | 'lg';
  dark?: boolean;
  label?: string;
  className?: string;
}

export function Segmented<T extends string>({ options, value, onChange, block, size = 'md', dark, label, className }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('fs-seg', block && 'fs-seg--block', size !== 'md' && `fs-seg--${size}`, dark && 'fs-seg--dark', className)}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className="fs-seg__opt" onClick={() => onChange(o.value)}>
          {o.icon && <Icon name={o.icon} size={18} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="fs-switch" onClick={() => onChange(!checked)} />;
}

interface CheckboxProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  error?: string;
  children: ReactNode;
}

/** Checkbox with a 44px hit area and rich label content (links allowed). */
export function Checkbox({ checked, onChange, label, error, children }: CheckboxProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className={cx('fs-check', error && !checked && 'fs-check--error')}>
        <button type="button" role="checkbox" aria-checked={checked} aria-label={label} className="fs-check__hit" onClick={() => onChange(!checked)}>
          <span className="fs-check__box">{checked && <Icon name="check" weight="bold" />}</span>
        </button>
        <span className="fs-check__label">{children}</span>
      </div>
      {error && !checked && (
        <span className="fs-field__error" style={{ paddingLeft: 34 }}>
          {error}
        </span>
      )}
    </div>
  );
}

export function RadioDot({ on, tone = 'primary' }: { on: boolean; tone?: 'primary' | 'danger' }) {
  return <span className={cx('fs-radio-dot', on && (tone === 'danger' ? 'fs-radio-dot--danger' : 'fs-radio-dot--on'))} aria-hidden />;
}
