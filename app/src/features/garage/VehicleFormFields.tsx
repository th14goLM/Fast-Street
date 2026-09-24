import { useRef } from 'react';
import { Icon } from '@/ui/Icon';
import { Chip } from '@/ui/controls';
import { Field, Input, Select, Textarea } from '@/ui/form';
import { ImageSlot } from '@/ui/ImageSlot';
import { MARCAS } from '@/domain/catalog';
import { CATEGORIES, type Category } from '@/domain/types';
import { MIN_PHOTOS } from '@/domain/validation';
import type { usePhotoUploads } from '@/lib/usePhotoUploads';
import styles from './VehicleForm.module.css';

export interface VehicleFormValues {
  marca: string;
  modelo: string;
  ano: string;
  cor: string;
  cat: Category | '';
  motor: string;
  pot: string;
  torque: string;
  peso: string;
  trans: string;
  mods: string;
}

export const EMPTY_VEHICLE_FORM: VehicleFormValues = { marca: '', modelo: '', ano: '', cor: '', cat: '', motor: '', pot: '', torque: '', peso: '', trans: '', mods: '' };

interface Props {
  value: VehicleFormValues;
  onChange: (patch: Partial<VehicleFormValues>) => void;
  uploads: ReturnType<typeof usePhotoUploads>;
  specsOpen: boolean;
  onToggleSpecs: () => void;
  /** "check" (onboarding) shows a success mark on uploaded photos; "remove" (garage) shows a delete button. */
  tileMode?: 'check' | 'remove';
  photosLabel?: string;
  placeholders?: { modelo: string; ano: string; cor: string; motor: string; pot: string; torque: string; peso: string; trans: string };
}

const DEFAULT_PH = { modelo: 'Ex.: Civic Si', ano: '2019', cor: 'Cinza', motor: '1.5 Turbo 16V', pot: '205', torque: '26,5', peso: '1.335', trans: 'Manual 6M' };

export function VehicleFormFields({ value: v, onChange, uploads, specsOpen, onToggleSpecs, tileMode = 'check', photosLabel = 'Fotos', placeholders = DEFAULT_PH }: Props) {
  const file = useRef<HTMLInputElement>(null);
  const set = (k: keyof VehicleFormValues) => (e: { target: { value: string } }) => onChange({ [k]: e.target.value });
  const yearInvalid = !!v.ano && !/^\d{4}$/.test(v.ano);

  return (
    <>
      <div className={styles.photos}>
        <div className={styles.photosHead}>
          <span className="fs-field__label">{photosLabel}</span>
          <span style={{ fontSize: 12, color: uploads.done >= MIN_PHOTOS ? 'var(--fs-success-text)' : 'var(--fs-text-secondary)' }}>
            {uploads.done}/{MIN_PHOTOS}
            {tileMode === 'check' ? ' mínimas' : ''}
          </span>
        </div>
        <div className={styles.grid}>
          {uploads.items.map((p) => (
            <div key={p.key} className={styles.tile} data-status={p.status}>
              {p.status === 'done' && (
                <>
                  {p.url ? <img src={p.url} alt="" className={styles.img} /> : <ImageSlot id={`veh-photo-${p.key}`} placeholder="Foto" />}
                  {tileMode === 'check' ? (
                    <span className={styles.ok}>
                      <Icon name="check-circle" weight="fill" size={18} color="var(--fs-success)" />
                    </span>
                  ) : (
                    <button type="button" aria-label="Remover foto" className={styles.del} onClick={() => uploads.remove(p.key)}>
                      <Icon name="x" size={13} />
                    </button>
                  )}
                </>
              )}
              {p.status === 'up' && (
                <>
                  {p.url && <img src={p.url} alt="" className={styles.img} style={{ opacity: 0.35 }} />}
                  <div className={styles.pct}>{Math.round(p.progress)}%</div>
                  <div className={styles.bar} style={{ width: `${p.progress}%` }} />
                </>
              )}
              {p.status === 'err' && (
                <button type="button" className={styles.retry} onClick={() => uploads.retry(p.key)}>
                  <Icon name="arrow-clockwise" size={22} />
                  Tentar novamente
                </button>
              )}
            </div>
          ))}
          {uploads.items.length < 6 && (
            <div className={styles.tile} data-status="add">
              <button type="button" className={styles.add} onClick={() => file.current?.click()}>
                <Icon name="camera-plus" size={24} />
                Adicionar
              </button>
              <input
                ref={file}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files?.length) uploads.addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </div>
          )}
        </div>
        {uploads.hasError && (
          <span role="alert" className="fs-field__error">
            Falha no envio de uma foto. O formulário continua preenchido; toque na foto para tentar de novo.
          </span>
        )}
      </div>

      <div className={styles.two}>
        <Field label="Marca">{(id) => <Select id={id} value={v.marca} onChange={set('marca')} options={MARCAS} />}</Field>
        <Field label="Modelo">{(id) => <Input id={id} value={v.modelo} onChange={set('modelo')} placeholder={placeholders.modelo} />}</Field>
        <Field label="Ano">
          {(id) => <Input id={id} inputMode="numeric" maxLength={4} value={v.ano} onChange={(e) => onChange({ ano: e.target.value.replace(/\D/g, '') })} placeholder={placeholders.ano} invalid={yearInvalid} />}
        </Field>
        <Field label="Cor">{(id) => <Input id={id} value={v.cor} onChange={set('cor')} placeholder={placeholders.cor} />}</Field>
      </div>

      <div className="fs-field">
        <span className="fs-field__label">Categoria</span>
        <div role="radiogroup" aria-label="Categoria" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CATEGORIES.map((c) => (
            <Chip key={c} role="radio" on={v.cat === c} onClick={() => onChange({ cat: c })}>
              {c}
            </Chip>
          ))}
        </div>
      </div>

      <div className={styles.specs}>
        <button type="button" className={styles.specsToggle} aria-expanded={specsOpen} onClick={onToggleSpecs}>
          <Icon name="wrench" size={20} color="var(--fs-secondary)" />
          <span style={{ flex: 1 }}>
            Especificações técnicas <span style={{ color: 'var(--fs-text-secondary)', fontWeight: 400 }}>· opcional</span>
          </span>
          <Icon name={specsOpen ? 'caret-up' : 'caret-down'} size={18} color="var(--fs-text-secondary)" />
        </button>
        {specsOpen && (
          <div className={styles.specsBody}>
            <Field label="Motor" style={{ gridColumn: '1 / -1' }}>
              {(id) => <Input id={id} small value={v.motor} onChange={set('motor')} placeholder={placeholders.motor} />}
            </Field>
            <Field label="Potência (cv)">{(id) => <Input id={id} small inputMode="numeric" value={v.pot} onChange={set('pot')} placeholder={placeholders.pot} />}</Field>
            <Field label="Torque (kgfm)">{(id) => <Input id={id} small inputMode="decimal" value={v.torque} onChange={set('torque')} placeholder={placeholders.torque} />}</Field>
            <Field label="Peso (kg)">{(id) => <Input id={id} small inputMode="numeric" value={v.peso} onChange={set('peso')} placeholder={placeholders.peso} />}</Field>
            <Field label="Transmissão">{(id) => <Input id={id} small value={v.trans} onChange={set('trans')} placeholder={placeholders.trans} />}</Field>
            <Field label="Modificações · uma por linha" style={{ gridColumn: '1 / -1' }}>
              {(id) => <Textarea id={id} small value={v.mods} onChange={set('mods')} placeholder="Intake, escape inox, pastilhas de competição" />}
            </Field>
          </div>
        )}
      </div>
    </>
  );
}
