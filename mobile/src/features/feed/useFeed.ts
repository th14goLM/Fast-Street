import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../lib/http';
import { prefs, PREF_KEYS } from '../../lib/prefs';
import { feedApi, type FeedResponse, type Periodo } from './api';
import { resolverOrigem } from './location';

export const RAIO_PADRAO = 50;

export interface Filtros {
  categorias: number[];
  periodo: Periodo;
  raioKm: number;
}

export const FILTROS_PADRAO: Filtros = { categorias: [], periodo: 'qualquer', raioKm: RAIO_PADRAO };

/** Quantos filtros estão ativos (badge do botão e "N ativos" da sheet). */
export const contarFiltros = (f: Filtros) => f.categorias.length + (f.periodo !== 'qualquer' ? 1 : 0) + (f.raioKm !== RAIO_PADRAO ? 1 : 0);

type Resultado =
  | { key: string; status: 'ok'; data: FeedResponse; offline: boolean }
  | { key: string; status: 'erro'; message: string }
  | { key: string; status: 'semPermissao' };

/**
 * Carrega o Feed para os filtros atuais. Se a rede falhar e houver uma resposta salva,
 * mostra os dados salvos com o banner "offline"; sem cache, mostra o erro com "Tentar novamente".
 */
export function useFeed(filtros: Filtros) {
  const { withToken } = useAuth();
  const [tentativa, setTentativa] = useState(0);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const key = `${JSON.stringify(filtros)}#${tentativa}`;

  useEffect(() => {
    let ativo = true;
    (async () => {
      const origem = await resolverOrigem();
      if (origem.tipo === 'semPermissao') {
        if (ativo) setResultado({ key, status: 'semPermissao' });
        return;
      }
      try {
        const data = await withToken((token) =>
          feedApi.get(token, {
            ...filtros,
            ...(origem.tipo === 'gps' ? { lat: origem.lat, lng: origem.lng } : { cidadeId: origem.cidadeId }),
          }),
        );
        await prefs.set(PREF_KEYS.feedCache, data);
        if (ativo) setResultado({ key, status: 'ok', data, offline: false });
      } catch (err) {
        const semRede = err instanceof ApiError && err.status === 0;
        const cache = semRede ? await prefs.get<FeedResponse>(PREF_KEYS.feedCache) : null;
        if (!ativo) return;
        if (cache) setResultado({ key, status: 'ok', data: cache, offline: true });
        else setResultado({ key, status: 'erro', message: err instanceof Error ? err.message : 'Erro inesperado.' });
      } finally {
        if (ativo) setAtualizando(false);
      }
    })();
    return () => {
      ativo = false;
    };
    // `key` resume filtros + tentativa; withToken é estável.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /** Recarrega (puxar para atualizar, "Tentar novamente", depois de mudar o local). */
  const recarregar = useCallback((comIndicador = false) => {
    if (comIndicador) setAtualizando(true);
    setTentativa((t) => t + 1);
  }, []);

  const atual = resultado?.key === key ? resultado : null;
  return {
    carregando: !atual && !atualizando,
    // Enquanto recarrega, mantém o resultado anterior na tela (sem piscar o skeleton).
    resultado: atual ?? (atualizando ? resultado : null),
    atualizando,
    recarregar,
  };
}
