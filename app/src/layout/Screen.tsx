import { forwardRef, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconButton } from '@/ui/controls';
import { cx } from '@/lib/cx';

interface ScreenProps {
  header?: ReactNode;
  footer?: ReactNode;
  plainFooter?: boolean;
  children: ReactNode;
  bodyStyle?: CSSProperties;
  bodyClassName?: string;
  style?: CSSProperties;
  label?: string;
}

/** Full-height screen: fixed header, scrollable body, fixed footer (CTA area). */
export const Screen = forwardRef<HTMLDivElement, ScreenProps>(function Screen({ header, footer, plainFooter, children, bodyStyle, bodyClassName, style, label }, ref) {
  return (
    <section className="fs-screen" style={style} aria-label={label}>
      {header}
      <div ref={ref} className={cx('fs-screen__body', bodyClassName)} style={bodyStyle}>
        {children}
      </div>
      {footer && <div className={cx('fs-screen__footer', plainFooter && 'fs-screen__footer--plain')}>{footer}</div>}
    </section>
  );
});

export function BackButton({ to, label = 'Voltar', icon = 'arrow-left', variant = 'plain', onClick }: { to?: string; label?: string; icon?: string; variant?: 'plain' | 'glass'; onClick?: () => void }) {
  const navigate = useNavigate();
  return (
    <IconButton
      icon={icon}
      label={label}
      variant={variant}
      onClick={() => {
        if (onClick) return onClick();
        if (to) return navigate(to);
        if (window.history.state?.idx > 0) navigate(-1);
        else navigate('/feed');
      }}
    />
  );
}

export function TopBar({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="fs-topbar" style={style}>
      {children}
    </div>
  );
}
