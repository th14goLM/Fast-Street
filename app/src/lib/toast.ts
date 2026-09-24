import { create } from 'zustand';

export type ToastTone = 'success' | 'info' | 'error' | 'achievement' | 'link';

export interface Toast {
  id: number;
  text: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
  /** Auto-dismiss delay in ms; 0 keeps it until closed. */
  duration: number;
}

interface ToastState {
  toast: Toast | null;
  show: (text: string, opts?: Partial<Omit<Toast, 'id' | 'text'>>) => void;
  dismiss: () => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;
let seq = 0;

export const useToast = create<ToastState>((set) => ({
  toast: null,
  show: (text, opts = {}) => {
    clearTimeout(timer);
    const toast: Toast = { id: ++seq, text, tone: opts.tone ?? 'success', action: opts.action, duration: opts.duration ?? 3000 };
    set({ toast });
    if (toast.duration) timer = setTimeout(() => set((s) => (s.toast?.id === toast.id ? { toast: null } : s)), toast.duration);
  },
  dismiss: () => {
    clearTimeout(timer);
    set({ toast: null });
  },
}));

export const toast = (text: string, opts?: Partial<Omit<Toast, 'id' | 'text'>>) => useToast.getState().show(text, opts);
