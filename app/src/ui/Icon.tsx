import type { CSSProperties } from 'react';

export type IconWeight = 'regular' | 'fill' | 'bold';

interface IconProps {
  /** Phosphor icon name without the `ph-` prefix, e.g. "flag-checkered". */
  name: string;
  weight?: IconWeight;
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
  label?: string;
}

/** Phosphor icon (web font), the icon set specified by the design system. */
export function Icon({ name, weight = 'regular', size, color, className, style, label }: IconProps) {
  const base = weight === 'regular' ? 'ph' : `ph-${weight}`;
  return (
    <i
      className={`${base} ph-${name}${className ? ` ${className}` : ''}`}
      style={{ fontSize: size, color, ...style }}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    />
  );
}
