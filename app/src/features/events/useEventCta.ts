import { useNavigate } from 'react-router-dom';
import { eventCta, type CtaState } from '@/domain/events';
import type { EventItem } from '@/domain/types';
import type { ButtonVariant } from '@/ui/controls';
import { spotsLeft, useApp } from '@/store/app';

export const CTA_VIEW: Record<CtaState, { label: string; icon: string; iconWeight?: 'bold'; variant: ButtonVariant; disabled: boolean }> = {
  open: { label: 'Inscrever-se', icon: 'lightning', variant: 'primary', disabled: false },
  pending: { label: 'Inscrição pendente', icon: 'hourglass-medium', variant: 'state-warning', disabled: true },
  confirmed: { label: 'Inscrito', icon: 'check', iconWeight: 'bold', variant: 'state-success', disabled: true },
  full: { label: 'Vagas esgotadas', icon: 'prohibit', variant: 'state-off', disabled: true },
  closed: { label: 'Ver resultados', icon: 'trophy', variant: 'secondary-blue', disabled: false },
};

/** Primary action for an event (map sheet and detail page share it). */
export function useEventCta(event: EventItem | undefined, from: string) {
  const navigate = useNavigate();
  const reg = useApp((s) => (event ? s.registrations[event.id] : undefined));
  const left = useApp((s) => (event ? spotsLeft(event.id, s) : 0));
  const state: CtaState = event ? eventCta(event, reg, left) : 'open';
  return {
    state,
    left,
    reg,
    view: CTA_VIEW[state],
    start: () => event && navigate(`/eventos/${event.id}/inscricao`, { state: { from } }),
  };
}
