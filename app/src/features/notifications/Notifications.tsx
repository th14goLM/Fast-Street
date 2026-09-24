import { useNavigate } from 'react-router-dom';
import { Icon } from '@/ui/Icon';
import { Button } from '@/ui/controls';
import { Title } from '@/ui/display';
import { EmptyState, ErrorCard, OfflineBanner, Skeleton } from '@/ui/feedback';
import { BackButton } from '@/layout/Screen';
import type { NotificationType } from '@/domain/types';
import { useLoad } from '@/lib/network';
import { useApp } from '@/store/app';
import s from './notifications.module.css';

export const NOTIFICATION_ICON: Record<NotificationType, [string, 'regular' | 'fill' | 'bold', string, string]> = {
  confirmed: ['check-circle', 'fill', 'var(--fs-success)', 'rgba(34,197,94,.14)'],
  pending: ['hourglass-medium', 'regular', 'var(--fs-warning-text)', 'rgba(245,158,11,.14)'],
  approved: ['check', 'bold', 'var(--fs-success-text)', 'rgba(34,197,94,.14)'],
  rejected: ['x-circle', 'regular', 'var(--fs-danger-text)', 'rgba(239,68,68,.14)'],
  newEvent: ['flag-checkered', 'regular', 'var(--fs-primary-text)', 'rgba(233,93,44,.14)'],
  reminder: ['alarm', 'regular', 'var(--fs-primary-text)', 'rgba(233,93,44,.14)'],
  result: ['trophy', 'fill', 'var(--fs-secondary)', 'rgba(176,206,226,.14)'],
  achievement: ['medal', 'fill', 'var(--fs-secondary)', 'rgba(176,206,226,.14)'],
};

/** UC-09 · Central de notificações agrupada por dia. */
export function Notifications() {
  const navigate = useNavigate();
  const load = useLoad('notifications');
  const items = useApp((st) => st.notifications);
  const ready = load.status === 'ready';
  const days = [...new Set(items.map((n) => n.day))];
  const unread = ready && items.some((n) => n.unread);

  return (
    <div className={s.screen}>
      <header className={s.header}>
        <BackButton />
        <Title as="h1" size={30} lh={1} style={{ flex: 1 }}>
          Notificações
        </Title>
        {unread && (
          <Button variant="ghost" size="xs" onClick={() => useApp.getState().markAllRead()}>
            Ler todas
          </Button>
        )}
      </header>
      <div className={s.body}>
        {load.offline && ready && <OfflineBanner updated="há 20 min" />}
        {load.status === 'loading' && [1, 2, 3, 4, 5].map((k) => <Skeleton key={k} h={72} r={14} />)}
        {load.status === 'error' && <ErrorCard title="Não foi possível carregar as notificações" onRetry={load.retry} />}
        {ready && !items.length && <EmptyState bare icon="bell-simple" title="Tudo em dia" titleSize={28} text="Avisos de inscrições, novos eventos e resultados aparecem aqui." />}
        {ready &&
          days.map((day) => (
            <section key={day} className={s.group}>
              <span className="fs-overline fs-overline--muted" style={{ padding: '0 4px 4px' }}>
                {day}
              </span>
              {items
                .filter((n) => n.day === day)
                .map((n) => {
                  const [icon, weight, color, bg] = NOTIFICATION_ICON[n.type];
                  return (
                    <button
                      key={n.id}
                      type="button"
                      className={s.item}
                      data-unread={n.unread || undefined}
                      onClick={() => {
                        useApp.getState().markRead(n.id);
                        navigate(n.href);
                      }}
                    >
                      <span className={s.icon} style={{ background: bg, color }}>
                        <Icon name={icon} weight={weight} size={20} />
                      </span>
                      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: n.unread ? 600 : 500, lineHeight: 1.35 }}>{n.title}</span>
                        <span style={{ fontSize: 13, lineHeight: 1.4 }} className="fs-muted">
                          {n.body}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--fs-text-muted)' }}>{n.time}</span>
                      </span>
                      {n.unread && <span className={s.dot} aria-label="Não lida" />}
                    </button>
                  );
                })}
            </section>
          ))}
      </div>
    </div>
  );
}
