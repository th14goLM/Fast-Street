import { z } from 'zod';

const ANO_MAX = new Date().getUTCFullYear() + 1;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres.`)
    .transform((v) => v || null)
    .nullable()
    .optional();

/** Aceita número ou texto com vírgula decimal ("26,5"); vazio vira null. */
const optionalNumber = (min: number, max: number, message: string, integer = false) =>
  z
    .union([z.number(), z.string()])
    .transform((v, ctx) => {
      if (typeof v === 'string') {
        let t = v.trim();
        if (!t) return null;
        // "1.335,5" / "26,5": vírgula é o decimal. "1.335": ponto como milhar. "26.5": ponto decimal.
        if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
        else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
        v = Number(t);
      }
      if (!Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) {
        ctx.addIssue({ code: 'custom', message });
        return z.NEVER;
      }
      return v;
    })
    .nullable()
    .optional();

/** UC-01 · Cadastrar veículo (RN-VEI-01, 02, 07). */
export const VeiculoSchema = z.object({
  marcaId: z.coerce.number({ error: 'Selecione a marca.' }).int().positive('Selecione a marca.'),
  modelo: z.string({ error: 'Informe o modelo.' }).trim().min(1, 'Informe o modelo.').max(60, 'Use no máximo 60 caracteres.'),
  ano: z
    .union([z.number(), z.string()], { error: 'Informe o ano com 4 dígitos.' })
    .transform((v) => String(v).trim())
    .refine((v) => /^\d{4}$/.test(v), 'Informe o ano com 4 dígitos.')
    .transform(Number)
    .refine((v) => v >= 1900 && v <= ANO_MAX, `Ano entre 1900 e ${ANO_MAX}.`),
  cor: optionalText(40),
  categoriaId: z.coerce.number({ error: 'Selecione a categoria.' }).int().positive('Selecione a categoria.'),
  motor: optionalText(60),
  potenciaCv: optionalNumber(1, 3000, 'Potência entre 1 e 3000 cv.', true),
  torqueKgfm: optionalNumber(0.1, 999.9, 'Torque entre 0,1 e 999,9 kgfm.'),
  pesoKg: optionalNumber(100, 10000, 'Peso entre 100 e 10.000 kg.', true),
  transmissao: optionalText(40),
  modificacoes: optionalText(2000),
  fotoIds: z
    .array(z.uuid(), { error: 'Envie ao menos 3 fotos.' })
    .min(3, 'Envie ao menos 3 fotos.')
    .max(6, 'No máximo 6 fotos por veículo.')
    .refine((ids) => new Set(ids).size === ids.length, 'Fotos repetidas.'),
});
export type VeiculoInput = z.infer<typeof VeiculoSchema>;
