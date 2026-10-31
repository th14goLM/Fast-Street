import { request } from '../../lib/http';

export interface ItemCatalogo {
  id: number;
  nome: string;
}

export interface Veiculo {
  id: string;
  nome: string;
  marca: ItemCatalogo;
  modelo: string;
  ano: number;
  cor: string | null;
  categoria: ItemCatalogo;
  principal: boolean;
  especificacoes: {
    motor: string | null;
    potenciaCv: number | null;
    torqueKgfm: number | null;
    pesoKg: number | null;
    transmissao: string | null;
    modificacoes: string[];
  };
  fotos: { id: string; ordem: number; url: string }[];
}

export interface VeiculoPayload {
  marcaId: number;
  modelo: string;
  ano: string;
  cor?: string;
  categoriaId: number;
  motor?: string;
  potenciaCv?: string;
  torqueKgfm?: string;
  pesoKg?: string;
  transmissao?: string;
  modificacoes?: string;
  fotoIds: string[];
}

export const veiculosApi = {
  catalogo: () => request<{ marcas: ItemCatalogo[]; categorias: ItemCatalogo[] }>('/catalogo/veiculos'),
  criar: (token: string, payload: VeiculoPayload) => request<{ veiculo: Veiculo }>('/veiculos', { method: 'POST', body: payload, token }),
};
