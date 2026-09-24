import { describe, expect, it } from 'vitest';
import { passwordScore } from './password';
import { checkLogin, signupErrorSummary, validateEventStep, validateSignup, vehicleMissing, type SignupForm } from './validation';
import { eventCta, registrationBlocker, vacanciesByCategory, vacancy } from './events';
import { layoutPins, CLUSTER_DISTANCE } from './mapLayout';
import { applyResults, pointsFor } from './ranking';
import { formatEventDate, km, initials } from './format';
import { EVENTS } from '@/data/events';
import { seedVehicles } from '@/data/pilot';
import { DEMO_EVENT_FORM } from '@/features/organizer/EventWizard';

const SU: SignupForm = { email: 'lucas@gmail.com', pwd: 'Pista2026!', perfil: 'piloto', nome: 'Lucas', cidade: 'Cascavel, PR', org: '', doc: '', tel: '', terms: true };

describe('password strength', () => {
  it.each([
    ['', 0],
    ['abc', 1],
    ['abcdefgh', 1],
    ['Abcdefgh', 2],
    ['Abcdefg1', 3],
    ['Abcdefgh1!', 4],
  ])('%s → %i', (p, score) => expect(passwordScore(p)).toBe(score));
});

describe('signup validation', () => {
  it('accepts a valid pilot', () => expect(validateSignup(SU)).toEqual({}));
  it('flags an existing e-mail with a sentinel', () => {
    const e = validateSignup({ ...SU, email: 'piloto@faststreet.com.br' });
    expect(e).toEqual({ email: 'exists' });
    expect(signupErrorSummary(e)).toBe('Este e-mail já tem uma conta.');
  });
  it('requires organizer data for organizer profiles', () => {
    const e = validateSignup({ ...SU, perfil: 'ambos', doc: '1234' });
    expect(Object.keys(e).sort()).toEqual(['doc', 'org', 'tel']);
    expect(signupErrorSummary(e)).toBe('Revise 3 campos destacados.');
  });
  it('requires terms', () => expect(validateSignup({ ...SU, terms: false }).terms).toBeTruthy());
});

describe('login rules', () => {
  it('handles the three outcomes', () => {
    expect(checkLogin('a@b.com', 'Pista2026!')).toBe('ok');
    expect(checkLogin('a@b.com', '12345678')).toBe('error');
    expect(checkLogin('lucas.naoverificado@gmail.com', 'Pista2026!')).toBe('unverified');
  });
});

describe('vehicle form', () => {
  it('lists what is missing', () => {
    expect(vehicleMissing({ marca: '', modelo: '', ano: '19', cat: '' }, 1)).toEqual(['2 fotos', 'marca', 'modelo', 'ano', 'categoria']);
    expect(vehicleMissing({ marca: 'Honda', modelo: 'Civic', ano: '2019', cat: 'Turbo' }, 3)).toEqual([]);
  });
});

describe('event wizard validation', () => {
  it('passes every step for the demo form', () => {
    for (const step of [1, 2, 3]) expect(validateEventStep(DEMO_EVENT_FORM, step, '2026-09-24')).toEqual({});
  });
  it('rejects past dates, zero spots and no categories', () => {
    expect(validateEventStep({ ...DEMO_EVENT_FORM, date: '2026-08-30' }, 3, '2026-09-24').date).toMatch(/passado/);
    const e2 = validateEventStep({ ...DEMO_EVENT_FORM, cats: [], vagas: '0' }, 2, '2026-09-24');
    expect(Object.keys(e2).sort()).toEqual(['cats', 'vagas']);
  });
});

describe('vacancies and CTA', () => {
  it('computes tone and label', () => {
    expect(vacancy(18, 40)).toMatchObject({ tone: 'ok', label: 'Vagas restantes', pct: 55 });
    expect(vacancy(3, 32).tone).toBe('low');
    expect(vacancy(0, 24).label).toBe('Vagas esgotadas');
  });
  it('spreads vacancies over categories when not specified', () => {
    const e3 = EVENTS.find((e) => e.id === 'e3')!;
    const v = vacanciesByCategory(e3);
    expect(v.reduce((n, [, l]) => n + l, 0)).toBe(e3.left);
    expect(v.reduce((n, [, , t]) => n + t, 0)).toBe(e3.total);
  });
  it('derives the CTA state', () => {
    const [e1] = EVENTS;
    expect(eventCta(e1, undefined, 18)).toBe('open');
    expect(eventCta(e1, { status: 'pending', vehicleId: 'x' }, 17)).toBe('pending');
    expect(eventCta(e1, { status: 'ok', vehicleId: 'x' }, 17)).toBe('confirmed');
    expect(eventCta(e1, undefined, 0)).toBe('full');
    expect(eventCta(EVENTS.find((e) => e.id === 'e8')!, undefined, 0)).toBe('closed');
  });
  it('blocks registration without vehicles or with an incompatible main vehicle', () => {
    const cars = seedVehicles();
    expect(registrationBlocker(EVENTS[0], [])).toBe('noveh');
    expect(registrationBlocker(EVENTS.find((e) => e.id === 'e3')!, cars)).toBe('incompat');
    expect(registrationBlocker(EVENTS[0], cars)).toBeNull();
  });
});

describe('map clustering', () => {
  const g = { cx: 195, cy: 353, ringPx: 150 };
  const items = EVENTS.filter((e) => e.status !== 'encerrado').map((e) => ({ id: e.id, dist: e.dist, ang: e.ang }));
  it('keeps nearby events separate at 15 km', () => {
    const groups = layoutPins(items, 15, g);
    expect(groups.every((gr) => gr.members.length === 1)).toBe(true);
    expect(groups).toHaveLength(4);
  });
  it('clusters Cascavel at 200 km', () => {
    const groups = layoutPins(items, 200, g);
    const cluster = groups.find((gr) => gr.members.length > 1)!;
    expect(cluster.members.map((m) => m.id)).toEqual(expect.arrayContaining(['e1', 'e2', 'e3', 'e4']));
    for (const a of groups) for (const b of groups) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(0);
    expect(CLUSTER_DISTANCE).toBe(34);
  });
});

describe('ranking update', () => {
  it('uses position points with overrides', () => {
    expect([0, 1, 2, 5, 12].map((i) => pointsFor(i))).toEqual([25, 18, 15, 8, 0]);
    expect(pointsFor(0, 30)).toBe(30);
  });
  it('applies gains and computes variation', () => {
    const rows = applyResults(
      [
        { name: 'A', car: 'a', points: 50 },
        { name: 'B', car: 'b', points: 40 },
      ],
      [
        { name: 'B', car: 'b', points: 25 },
        { name: 'C', car: 'c', points: 18 },
      ],
    );
    expect(rows.map((r) => [r.name, r.total, r.delta])).toEqual([
      ['B', 65, 1],
      ['A', 50, -1],
      ['C', 18, 0],
    ]);
  });
});

describe('formatting', () => {
  it('formats pt-BR values', () => {
    expect(km(4.2)).toBe('4,2 km');
    expect(initials('Ana Beatriz Moraes')).toBe('AB');
    expect(formatEventDate('2026-11-14', '08:00')).toBe('Sáb, 14 nov · 08:00');
    expect(formatEventDate('')).toBe('Data a definir');
  });
});
