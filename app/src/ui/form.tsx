import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Icon } from './Icon';
import { cx } from '@/lib/cx';
import { meterBars } from '@/domain/password';

interface FieldProps {
  label?: ReactNode;
  /** Right side of the label row (e.g. a character counter). */
  aside?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}

/** Label + control + hint/error, wired for accessibility. */
export function Field({ label, aside, hint, error, className, style, children }: FieldProps) {
  const id = useId();
  const msgId = error || hint ? `${id}-msg` : undefined;
  return (
    <div className={cx('fs-field', className)} style={style}>
      {label && (
        <label htmlFor={id} className="fs-field__label">
          <span>{label}</span>
          {aside && <span className="fs-muted">{aside}</span>}
        </label>
      )}
      {children(id, msgId)}
      {error ? (
        <span id={msgId} className="fs-field__error" role="alert">
          {error}
        </span>
      ) : (
        hint && (
          <span id={msgId} className="fs-field__hint">
            {hint}
          </span>
        )
      )}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  icon?: string;
  small?: boolean;
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ invalid, icon, small, trailing, className, ...rest }, ref) {
  const input = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx('fs-input', icon && 'fs-input--icon', !!trailing && 'fs-input--trail', small && 'fs-input--sm', className)}
      {...rest}
    />
  );
  if (!icon && !trailing) return input;
  return (
    <div className="fs-control">
      {icon && <Icon name={icon} className="fs-control__icon" />}
      {input}
      {trailing}
    </div>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  placeholder?: string;
  options: readonly string[];
}

export function Select({ invalid, placeholder = 'Selecione', options, className, ...rest }: SelectProps) {
  return (
    <div className="fs-control">
      <select aria-invalid={invalid || undefined} className={cx('fs-input', className)} {...rest}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <Icon name="caret-down" className="fs-control__trail" />
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  small?: boolean;
}

export function Textarea({ invalid, small, className, ...rest }: TextareaProps) {
  return <textarea aria-invalid={invalid || undefined} className={cx('fs-input', small && 'fs-input--sm', className)} {...rest} />;
}

export function PasswordMeter({ score }: { score: number }) {
  return (
    <div className="fs-password-meter" aria-hidden>
      {meterBars(score).map((c, i) => (
        <span key={i} style={c ? { background: c } : undefined} />
      ))}
    </div>
  );
}
