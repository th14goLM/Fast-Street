import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Icon } from '@/ui/Icon';
import { Avatar, VerifiedSeal } from '@/ui/display';
import { ToastHost } from '@/ui/feedback';
import { OVERLAY_ROOT_ID } from '@/ui/overlays';
import { useIsDesktop } from '@/lib/useMediaQuery';
import { useApp } from '@/store/app';
import { eventCounts, useOrganizer } from '@/store/organizer';
import { DevPanel } from './DevPanel';

export const NAV_ITEMS = [
  { to: '/feed', label: 'Feed', icon: 'house-simple' },
  { to: '/mapa', label: 'Mapa', icon: 'map-trifold' },
  { to: '/garagem', label: 'Garagem', icon: 'garage' },
  { to: '/ranking', label: 'Ranking', icon: 'trophy' },
  { to: '/perfil', label: 'Perfil', icon: 'user-circle' },
];

const TAB_ROOTS = NAV_ITEMS.map((n) => n.to);

/** Mobile column: the pilot app at 390–480px, with the overlay layer for sheets and modals. */
export function AppColumn({ nav }: { nav?: boolean }) {
  return (
    <div className="fs-column">
      <div className="fs-column__view">
        <Outlet />
      </div>
      {nav && <BottomNav />}
      <div id={OVERLAY_ROOT_ID} className="fs-overlay-root" />
      <ToastHost />
    </div>
  );
}

function BottomNav() {
  return (
    <nav className="fs-bottom-nav" aria-label="Navegação principal">
      {NAV_ITEMS.map((n) => (
        <NavLink key={n.to} to={n.to} className="fs-bottom-nav__item">
          {({ isActive }) => (
            <>
              <Icon name={n.icon} weight={isActive ? 'fill' : 'regular'} />
              {n.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function Sidebar() {
  const { pathname } = useLocation();
  const mode = useApp((s) => s.mode);
  const user = useApp((s) => s.user);
  const unread = useApp((s) => s.notifications.some((n) => n.unread));
  const events = useOrganizer((s) => s.events);
  const regs = useOrganizer((s) => s.regs);
  const isOrgUser = user.perfil !== 'piloto';
  const showCentral = isOrgUser && (mode === 'org' || pathname.startsWith('/organizador'));
  const pending = events.filter((e) => e.status === 'aberto').reduce((n, e) => n + eventCounts(e, regs).pending, 0);
  const inOrganizer = pathname.startsWith('/organizador');

  return (
    <aside className="fs-sidebar" aria-label="Navegação">
      <Link to="/feed" className="fs-sidebar__brand">
        <span className="fs-sidebar__logo">
          <Icon name="flag-checkered" />
        </span>
        <span className="fs-display" style={{ fontSize: 18, lineHeight: 1, letterSpacing: '.12em' }}>
          Fast Street
        </span>
      </Link>
      {NAV_ITEMS.map((n) => (
        <NavLink
          key={n.to}
          to={n.to === '/ranking' && inOrganizer ? '/organizador/ranking' : n.to}
          className={({ isActive }) => `fs-sidebar__item${isActive ? ' active' : ''}`}
        >
          <Icon name={n.icon} />
          {n.label}
        </NavLink>
      ))}
      <div className="fs-sidebar__divider" />
      {showCentral && (
        <>
          <span className="fs-sidebar__section">Organizador</span>
          <NavLink to="/organizador" end={false} className={({ isActive }) => `fs-sidebar__item${isActive && !pathname.endsWith('/ranking') ? ' active' : ''}`}>
            <Icon name="clipboard-text" />
            <span style={{ flex: 1 }}>Central do Organizador</span>
            {pending > 0 && <span className="fs-count">{pending}</span>}
          </NavLink>
        </>
      )}
      <NavLink to="/notificacoes" className={({ isActive }) => `fs-sidebar__item${isActive ? ' active' : ''}`}>
        <Icon name="bell" />
        <span style={{ flex: 1 }}>Notificações</span>
        {unread && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--fs-primary)' }} />}
      </NavLink>
      <Link to="/perfil" className="fs-sidebar__user">
        <Avatar name={user.name} />
        <span style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{user.name}</span>
          {isOrgUser && user.orgName ? <VerifiedSeal size={11}>{user.orgName}</VerifiedSeal> : <span className="fs-caption">Piloto</span>}
        </span>
      </Link>
    </aside>
  );
}

/**
 * Authenticated shell.
 * - Mobile: app column with the bottom nav on the 5 tab roots.
 * - Desktop (≥1024px): sidebar; pilot screens stay in a centred column, the
 *   Central do Organizador uses the full width.
 */
export function AuthedShell() {
  const signedIn = useApp((s) => s.signedIn);
  const desktop = useIsDesktop();
  const { pathname } = useLocation();
  if (!signedIn) return <Navigate to="/boas-vindas" replace />;

  const isTabRoot = TAB_ROOTS.includes(pathname);
  const wide = pathname.startsWith('/organizador');

  if (!desktop) {
    return (
      <>
        {wide ? <WideArea /> : <AppColumn nav={isTabRoot} />}
        <DevPanel />
      </>
    );
  }

  return (
    <div className="fs-desktop">
      <Sidebar />
      <main className="fs-desktop__main">
        {wide ? (
          <WideArea />
        ) : (
          <div className="fs-desktop__pilot">
            <AppColumn />
          </div>
        )}
      </main>
      <DevPanel />
    </div>
  );
}

/** Full-width area (Central do Organizador) with its own overlay layer. */
function WideArea() {
  return (
    <div className="fs-desktop__wide" style={{ background: 'var(--fs-bg)', minHeight: '100dvh' }}>
      <Outlet />
      <div id={OVERLAY_ROOT_ID} className="fs-overlay-root" style={{ position: 'fixed' }} />
      <ToastHost placement="bottom-right" />
    </div>
  );
}

/** Public (signed-out) flow: onboarding, login and signup. */
export function PublicShell() {
  return (
    <>
      <div className="fs-desktop__pilot" style={{ height: '100dvh' }}>
        <AppColumn />
      </div>
      <DevPanel />
    </>
  );
}
