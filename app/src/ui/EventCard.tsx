import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import { ImageSlot } from './ImageSlot';
import { Overline, Tag, VacancyBar, VisibilityBadge } from './display';
import { EVENT_TYPES, LOCAL_ICON } from '@/domain/catalog';
import { km } from '@/domain/format';
import type { EventItem } from '@/domain/types';
import styles from './EventCard.module.css';

/** Event card used by the Feed carousel ("Perto de você"). */
export function EventCard({ event, left, width = 300 }: { event: EventItem; left: number; width?: number }) {
  return (
    <Link to={`/eventos/${event.id}`} className={styles.card} style={{ width }}>
      <div className={styles.media}>
        <ImageSlot id={`ev-${event.id}`} placeholder={event.local} />
        <div className={styles.fade} />
        <span className={styles.vis}>
          <VisibilityBadge pub={event.pub} overlay />
        </span>
      </div>
      <div className={styles.body}>
        <div className={styles.head}>
          <Overline>{EVENT_TYPES[event.type].label}</Overline>
          <span className="fs-display" style={{ fontSize: 24, lineHeight: 1.05 }}>
            {event.name}
          </span>
        </div>
        <div className={styles.meta}>
          <span>
            <Icon name="calendar-blank" size={15} color="var(--fs-text-secondary)" />
            {event.dateLabel}
          </span>
          <span>
            <Icon name={LOCAL_ICON[event.localType]} size={15} color="var(--fs-secondary)" />
            {event.localType} · {km(event.dist)}
          </span>
        </div>
        <div className={styles.tags}>
          {event.cats.map((c) => (
            <Tag key={c}>{c}</Tag>
          ))}
        </div>
        <VacancyBar left={left} total={event.total} />
      </div>
    </Link>
  );
}

export function EventCardSkeleton({ width = 300 }: { width?: number }) {
  return (
    <div className={styles.card} style={{ width }} aria-hidden>
      <div className="fs-skel fs-skel--2" style={{ height: 150, borderRadius: 0 }} />
      <div className={styles.body} style={{ paddingTop: 14 }}>
        <div className="fs-skel fs-skel--2" style={{ width: '30%', height: 10 }} />
        <div className="fs-skel fs-skel--2" style={{ width: '80%', height: 20 }} />
        <div className="fs-skel fs-skel--2" style={{ width: '60%', height: 12 }} />
        <div className="fs-skel fs-skel--2" style={{ height: 4 }} />
      </div>
    </div>
  );
}
