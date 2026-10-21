import { describe, expect, it } from 'vitest';
import { documentoTipo, isValidCnpj, isValidCpf } from '../src/shared/validators/documento.js';

describe('validação de CPF/CNPJ', () => {
  it('aceita CPF válido com ou sem máscara', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
  });
  it('rejeita CPF com dígito errado, repetido ou curto', () => {
    expect(isValidCpf('52998224724')).toBe(false);
    expect(isValidCpf('11111111111')).toBe(false);
    expect(isValidCpf('1234')).toBe(false);
  });
  it('aceita CNPJ válido e rejeita inválido', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
    expect(isValidCnpj('11222333000182')).toBe(false);
    expect(isValidCnpj('00000000000000')).toBe(false);
  });
  it('identifica o tipo pelo tamanho e dígitos', () => {
    expect(documentoTipo('52998224725')).toBe('cpf');
    expect(documentoTipo('11222333000181')).toBe('cnpj');
    expect(documentoTipo('123')).toBeNull();
  });
});
