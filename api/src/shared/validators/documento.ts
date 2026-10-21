/** Validação de CPF/CNPJ com dígitos verificadores (RN-CAD-05). */

export const onlyDigits = (v: string): string => v.replace(/\D/g, '');

const allSameDigit = (d: string): boolean => /^(\d)\1+$/.test(d);

export function isValidCpf(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 11 || allSameDigit(d)) return false;
  const calc = (len: number): number => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

export function isValidCnpj(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 14 || allSameDigit(d)) return false;
  const calc = (len: number): number => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + Number(d[i]) * w, 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

export function documentoTipo(value: string): 'cpf' | 'cnpj' | null {
  const d = onlyDigits(value);
  if (d.length === 11 && isValidCpf(d)) return 'cpf';
  if (d.length === 14 && isValidCnpj(d)) return 'cnpj';
  return null;
}
