import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '@/ui/Icon';
import { Button, Chip, IconButton, Segmented, Switch } from '@/ui/controls';
import { Input } from '@/ui/form';
import { Overline, PosBadge, Progress, Tabs, Title } from '@/ui/display';
import { ImageSlot } from '@/ui/ImageSlot';
import { BottomSheet } from '@/ui/overlays';
import { BackButton } from '@/layout/Screen';
import { ACHIEVEMENTS, HISTORY, NOTIFICATION_PREFS, RESULT_FIELD, type Achievement } from '@/data/pilot';
import { POINTS_BY_POSITION } from '@/domain/catalog';
import { toast } from '@/lib/toast';
import { useApp, type Mode } from '@/store/app';
import s from './profile.module.css';

type Tab = 'ach' | 'hist';
const HIST_CATS = [
  { id: 'all', label: 'Todas' },
  { id: 'Turbo', label: 'Turbo' },
  { id: 'Clássicos', label: 'Clássicos' },
  { id: 'Turismo', label: 'Turismo' },
];
const PERIOD_MONTHS: Record<string, string[] | null> = { all: null, m: ['out'], s: ['jul', 'ago', 'set', 'out'] };

/** UC-18 · Perfil with achievements (UC-31) and history (UC-32). */
export function Profile() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const user = useApp((st) => st.user);
  const mode = useApp((st) => st.mode);
  const tab: Tab = params.get('aba') === 'historico' ? 'hist' : 'ach';
  const achId = params.get('conquista');
  const ach = ACHIEVEMENTS.find((a) => a.id === achId);
  const [hCat, setHCat] = useState('all');
  const [hPer, setHPer] = useState<'all' | 'm' | 's'>('all');
  const isOrg = user.perfil !== 'piloto';

  const setTab = (t: Tab) => setParams(t === 'hist' ? { aba: 'historico' } : {}, { replace: true });
  const openAch = (id: string | null) => setParams(id ? { conquista: id } : tab === 'hist' ? { aba: 'historico' } : {}, { replace: true });

  const months = PERIOD_MONTHS[hPer];
  const hist = HISTORY.filter((h) => (hCat === 'all' || h.cat === hCat) && (!months || months.includes(h.month)));
  const unlocked = ACHIEVEMENTS.filter((a) => a.unlocked).length;

  return (
    <div className={s.screen}>
      <div className={s.scroll}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton icon="gear-six" label="Configurações" onClick={() => navigate('/perfil/configuracoes')} />
        </div>
        <div className={s.identity}>
          <div className={s.avatar}>
            <ImageSlot id="avatar" shape="circle" placeholder="Foto" pick />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <Title as="h1" size={32} lh={1}>
              {user.name}
            </Title>
            <span style={{ fontSize: 13 }} className="fs-muted">
              {user.city}
              {user.instagram && ` · ${user.instagram}`}
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {user.perfil !== 'org' && (
                <span className="fs-badge fs-badge--sm fs-badge--place">
                  <Icon name="steering-wheel" />
                  Piloto
                </span>
              )}
              {isOrg && (
                <span className="fs-badge fs-badge--sm fs-badge--secondary">
                  <Icon name="seal-check" weight="fill" />
                  Organizador verificado
                </span>
              )}
            </div>
          </div>
        </div>
        <div className={s.stats}>
          <div>
            <span className="fs-num">14</span>
            <span>Eventos</span>
          </div>
          <div>
            <span className="fs-num" style={{ color: 'var(--fs-secondary)' }}>
              4
            </span>
            <span>Pódios</span>
          </div>
          <div>
            <span className="fs-num">121</span>
            <span>Pontos</span>
          </div>
        </div>

        {isOrg && mode === 'org' && (
          <Link to="/organizador" className={s.orgCard}>
            <Icon name="clipboard-text" size={22} color="var(--fs-primary-text)" />
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 500 }}>Central do Organizador</span>
              <span className="fs-caption">Eventos, inscrições e resultados</span>
            </span>
            <Icon name="caret-right" color="var(--fs-text-secondary)" />
          </Link>
        )}

        <Tabs
          fill
          label="Seções do perfil"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'ach', label: 'Conquistas' },
            { value: 'hist', label: 'Histórico' },
          ]}
        />

        {tab === 'ach' && (
          <>
            <span style={{ fontSize: 13 }} className="fs-muted">
              {unlocked} de {ACHIEVEMENTS.length} desbloqueadas
            </span>
            <div className={s.achGrid}>
              {ACHIEVEMENTS.map((a) => (
                <button key={a.id} type="button" className={s.ach} data-on={a.unlocked || undefined} onClick={() => openAch(a.id)}>
                  <span className={s.achIcon}>
                    <Icon name={a.icon} size={26} />
                  </span>
                  <span className={s.achName}>{a.name}</span>
                  {!a.unlocked && (
                    <span className={s.achProg}>
                      <span className={s.achBar}>
                        <span style={{ width: `${((a.current ?? 0) / (a.max ?? 1)) * 100}%` }} />
                      </span>
                      <span>
                        {a.current} de {a.max}
                      </span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {tab === 'hist' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="fs-hscroll" role="radiogroup" aria-label="Categoria" style={{ margin: '0 -20px', padding: '0 20px' }}>
                {HIST_CATS.map((c) => (
                  <Chip key={c.id} small role="radio" on={hCat === c.id} onClick={() => setHCat(c.id)}>
                    {c.label}
                  </Chip>
                ))}
              </div>
              <Segmented
                block
                size="sm"
                label="Período"
                value={hPer}
                onChange={setHPer}
                options={[
                  { value: 'all', label: 'Tudo' },
                  { value: 'm', label: 'Este mês' },
                  { value: 's', label: 'Semestre' },
                ]}
              />
            </div>
            {!hist.length && (
              <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Icon name="calendar-x" size={28} color="var(--fs-text-secondary)" />
                <span style={{ fontSize: 14, fontWeight: 500 }}>Nenhum evento neste filtro</span>
                <span style={{ fontSize: 13 }} className="fs-muted">
                  Mude a categoria ou o período.
                </span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {hist.map((h) => (
                <Link key={h.id} to={`/perfil/resultados/${h.id}`} className="fs-row" style={{ minHeight: 68 }}>
                  <PosBadge pos={h.pos} size={17} style={{ width: 44, padding: '3px 0' }} />
                  <span className="fs-row__main">
                    <span className="fs-row__title">{h.name}</span>
                    <span className="fs-row__sub">
                      {h.date} · {h.cat} · {h.car}
                    </span>
                  </span>
                  <span className="fs-num" style={{ fontSize: 16 }}>
                    +{h.pts}
                  </span>
                  <Icon name="caret-right" />
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <AchievementSheet ach={ach} onClose={() => openAch(null)} />
    </div>
  );
}

function AchievementSheet({ ach, onClose }: { ach?: Achievement; onClose: () => void }) {
  return (
    <BottomSheet open={!!ach} onClose={onClose} label={ach?.name ?? 'Conquista'}>
      {ach && (
        <>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span className={s.achIconLg} data-on={ach.unlocked || undefined}>
              <Icon name={ach.icon} size={36} />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Overline tone={ach.unlocked ? 'secondary' : 'muted'}>{ach.unlocked ? 'Desbloqueada' : 'Bloqueada'}</Overline>
              <Title as="h3" size={28} lh={1}>
                {ach.name}
              </Title>
            </div>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.55 }} className="fs-body">
            {ach.desc}
          </p>
          {ach.unlocked ? (
            <div style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--fs-bg)', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }} className="fs-body">
              <Icon name="calendar-check" color="var(--fs-secondary)" />
              {ach.when}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span className="fs-muted">Progresso</span>
                <span style={{ fontWeight: 500 }}>
                  {ach.current} de {ach.max}
                </span>
              </div>
              <Progress pct={((ach.current ?? 0) / (ach.max ?? 1)) * 100} height={6} />
            </div>
          )}
        </>
      )}
    </BottomSheet>
  );
}

/** UC-32 · Resultado do piloto em um evento. */
export function ResultDetail() {
  const { id } = useParams();
  const h = HISTORY.find((x) => x.id === id);
  if (!h) return <Navigate to="/perfil?aba=historico" replace />;
  const top = h.pos <= 3;
  const field = RESULT_FIELD.filter(([n]) => n !== 'Lucas Andrade');
  field.splice(h.pos - 1, 0, ['Lucas Andrade', POINTS_BY_POSITION[h.pos - 1]]);
  const table = field.slice(0, Math.min(6, h.field));

  return (
    <div className={s.screen}>
      <div className={s.scroll} style={{ gap: 18, paddingTop: 4 }}>
        <div style={{ marginLeft: -8 }}>
          <BackButton to="/perfil?aba=historico" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Overline>UC-32 · Resultado</Overline>
          <Title as="h1" size={36}>
            {h.name}
          </Title>
          <span style={{ fontSize: 13 }} className="fs-muted">
            {h.date} · {h.local}
          </span>
        </div>
        <div className={s.resultCard} data-top={top || undefined}>
          <span className="fs-num" style={{ fontSize: 64, lineHeight: 0.9, color: top ? 'var(--fs-secondary)' : 'var(--fs-text)' }}>
            P{h.pos}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 500 }}>
              {h.cat} · {h.pos}º de {h.field} pilotos
            </span>
            <span className="fs-body" style={{ fontSize: 13 }}>
              {h.car}
            </span>
            <span className="fs-num" style={{ fontSize: 20, color: 'var(--fs-success-text)' }}>
              +{h.pts} PTS NO RANKING
            </span>
          </div>
        </div>
        {h.award && (
          <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(176,206,226,.10)', display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, color: 'var(--fs-secondary)' }}>
            <Icon name="medal" weight="fill" size={20} />
            Prêmio do organizador: {h.award}
          </div>
        )}
        <section style={{ display: 'flex', flexDirection: 'column' }}>
          <Title as="h3" size={22} lh={1} style={{ marginBottom: 8 }}>
            Classificação · {h.cat}
          </Title>
          {table.map(([name], i) => {
            const me = name === 'Lucas Andrade';
            return (
              <div key={name} className={s.tableRow} data-me={me || undefined}>
                <span className="fs-num" style={{ fontSize: 18, color: i < 3 ? 'var(--fs-secondary)' : 'var(--fs-text-secondary)' }}>
                  P{i + 1}
                </span>
                <span style={{ fontSize: 14 }}>{me ? `${name} (você)` : name}</span>
                <span className="fs-num" style={{ fontSize: 15 }}>
                  {POINTS_BY_POSITION[i]} PTS
                </span>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}

type SettingsSheet = 'export' | 'delete' | 'logout' | null;

/** Configurações: role switch, notification types, LGPD (export / delete), logout. */
export function Settings() {
  const navigate = useNavigate();
  const user = useApp((st) => st.user);
  const mode = useApp((st) => st.mode);
  const prefs = useApp((st) => st.notifPrefs);
  const [sheet, setSheet] = useState<SettingsSheet>(null);
  const [delText, setDelText] = useState('');
  const isOrg = user.perfil !== 'piloto';

  const setMode = (m: Mode) => {
    useApp.getState().setMode(m);
    toast(m === 'org' ? 'Modo Organizador: a Central aparece na navegação' : 'Modo Piloto ativado');
  };

  return (
    <div className={s.screen}>
      <div className={s.scroll} style={{ paddingTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: -8 }}>
          <BackButton to="/perfil" />
          <Title as="h1" size={30} lh={1}>
            Configurações
          </Title>
        </div>

        {isOrg && (
          <section className={s.group} style={{ gap: 8 }}>
            <span className={s.groupTitle}>Modo de uso</span>
            <Segmented
              block
              size="lg"
              label="Modo de uso"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'piloto', label: 'Piloto', icon: 'steering-wheel' },
                { value: 'org', label: 'Organizador', icon: 'clipboard-text' },
              ]}
            />
            <span className="fs-caption">
              {mode === 'org' ? 'A Central do Organizador aparece na navegação. Sua garagem e ranking continuam disponíveis.' : 'Sua conta também é Organizador verificado. Troque para gerenciar seus eventos.'}
            </span>
          </section>
        )}

        <section className={s.group}>
          <span className={s.groupTitle}>Notificações</span>
          {NOTIFICATION_PREFS.map((n) => (
            <div key={n.id} className={s.settingRow}>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 14 }}>{n.label}</span>
                {n.sub && <span className="fs-caption">{n.sub}</span>}
              </span>
              <Switch label={n.label} checked={!!prefs[n.id]} onChange={() => useApp.getState().toggleNotifPref(n.id)} />
            </div>
          ))}
        </section>

        <section className={s.group}>
          <span className={s.groupTitle}>Privacidade · LGPD</span>
          <button type="button" className={s.settingRow} onClick={() => setSheet('export')}>
            <Icon name="download-simple" size={20} color="var(--fs-secondary)" />
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span style={{ fontSize: 14 }}>Exportar meus dados</span>
              <span className="fs-caption">Arquivo com perfil, garagem, inscrições e resultados</span>
            </span>
            <Icon name="caret-right" color="var(--fs-text-secondary)" />
          </button>
          <a href="#privacidade" className={s.settingRow}>
            <Icon name="shield-check" size={20} color="var(--fs-secondary)" />
            <span style={{ flex: 1, fontSize: 14 }}>Política de Privacidade</span>
            <Icon name="arrow-square-out" color="var(--fs-text-secondary)" />
          </a>
          <a href="#termos" className={s.settingRow}>
            <Icon name="file-text" size={20} color="var(--fs-secondary)" />
            <span style={{ flex: 1, fontSize: 14 }}>Termos de Uso</span>
            <Icon name="arrow-square-out" color="var(--fs-text-secondary)" />
          </a>
          <button
            type="button"
            className={s.settingRow}
            style={{ color: 'var(--fs-danger-text)', boxShadow: 'none' }}
            onClick={() => {
              setDelText('');
              setSheet('delete');
            }}
          >
            <Icon name="trash" size={20} />
            <span style={{ flex: 1, fontSize: 14, textAlign: 'left' }}>Excluir conta</span>
          </button>
        </section>

        <Button variant="secondary" size="md" icon="sign-out" iconSize={18} onClick={() => setSheet('logout')}>
          Sair
        </Button>
        <span style={{ fontSize: 12, textAlign: 'center', color: 'var(--fs-text-muted)' }}>Fast Street · versão 1.0.0 (MVP Paraná)</span>
      </div>

      <BottomSheet open={sheet === 'export'} onClose={() => setSheet(null)} label="Exportar meus dados">
        <Title as="h3" size={26} lh={1}>
          Exportar meus dados
        </Title>
        <p style={{ fontSize: 14, lineHeight: 1.55 }} className="fs-body">
          Vamos preparar um arquivo JSON com todos os seus dados e enviar o link para {user.email} em até 48 h, conforme a LGPD.
        </p>
        <Button
          size="lg"
          onClick={() => {
            setSheet(null);
            toast('Solicitação registrada. Você receberá o link por e-mail.');
          }}
        >
          Solicitar exportação
        </Button>
      </BottomSheet>

      <BottomSheet open={sheet === 'delete'} onClose={() => setSheet(null)} label="Excluir conta">
        <Title as="h3" size={26} lh={1}>
          Excluir conta?
        </Title>
        <p style={{ fontSize: 14, lineHeight: 1.55 }} className="fs-body">
          Seu perfil, garagem e inscrições serão apagados em até 30 dias. Resultados já publicados ficam anonimizados no ranking. Esta ação não pode ser desfeita.
        </p>
        <label className="fs-field">
          <span className="fs-field__label">Digite EXCLUIR para confirmar</span>
          <Input autoCapitalize="characters" value={delText} onChange={(e) => setDelText(e.target.value.toUpperCase())} style={{ background: 'var(--fs-bg)' }} />
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="lg" style={{ flex: 1 }} onClick={() => setSheet(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            size="lg"
            style={{ flex: 1 }}
            disabled={delText !== 'EXCLUIR'}
            onClick={() => {
              setSheet(null);
              toast('Exclusão agendada. Enviamos a confirmação por e-mail.');
            }}
          >
            Excluir conta
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === 'logout'} onClose={() => setSheet(null)} label="Sair da conta">
        <Title as="h3" size={26} lh={1}>
          Sair da conta?
        </Title>
        <p style={{ fontSize: 14 }} className="fs-body">
          Seus dados continuam salvos. Entre de novo quando quiser.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="lg" style={{ flex: 1 }} onClick={() => setSheet(null)}>
            Cancelar
          </Button>
          <Button
            size="lg"
            style={{ flex: 1 }}
            onClick={() => {
              setSheet(null);
              useApp.getState().signOut();
              navigate('/entrar', { replace: true });
            }}
          >
            Sair
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
