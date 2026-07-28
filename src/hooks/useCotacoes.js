import { useState, useCallback } from 'react';

// Base das cotações:
//  - Produção (GitHub Pages): Cloudflare Worker (defina VITE_COTACOES_API no build)
//  - Dev local: proxy do Vite (/yf) — ver vite.config.js
// O Worker/proxy repassa a chamada para query1.finance.yahoo.com com CORS liberado.
// remove barra(s) no final para não gerar "//" ao concatenar o caminho
const API_BASE = (import.meta.env.VITE_COTACOES_API || '/yf').replace(/\/+$/, '');
const YF = (symbol) =>
  `${API_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;

async function fetchPreco(symbol) {
  try {
    const r = await fetch(YF(symbol));
    const d = await r.json();
    const preco = d?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return preco ?? null;
  } catch {
    return null;
  }
}

// Preços manuais para Tesouro Direto (sem API pública)
export const TESOURO_DEFAULTS = {
  tsel2028:  16500,
  tsel2031:  16200,
  tipca2045: 4800,
  tipca2050: 3900,
  tipca2026: 12100,
};

export default function useCotacoes(ativos) {
  const [precos, setPrecos]               = useState({});
  const [tesouroPrices, setTesouroPrices] = useState(TESOURO_DEFAULTS);
  const [loading, setLoading]             = useState(false);
  const [erro, setErro]                   = useState(null);
  const [ultimaAtualizacao, setUltima]    = useState(null);

  const atualizar = useCallback(async () => {
    if (!ativos?.length) return;
    setLoading(true);
    setErro(null);
    try {
      // 1. Câmbio USD→BRL primeiro (necessário para converter USD e cripto)
      const usdBrl = (await fetchPreco('USDBRL=X')) ?? 5.75;

      // 2. Busca paralela de todos os ativos com ticker
      const tarefas = ativos
        .filter(a => a.tipo !== 'tesouro')
        .map(async (a) => {
          let symbol;
          if      (a.tipo === 'b3')     symbol = `${a.ticker}.SA`;
          else if (a.tipo === 'usd')    symbol = a.ticker;
          else if (a.tipo === 'cripto') symbol = `${a.ticker}-USD`;
          else return null;

          const preco = await fetchPreco(symbol);
          if (preco == null) return { ticker: a.ticker, preco: null };

          const precoBRL = (a.tipo === 'usd' || a.tipo === 'cripto')
            ? preco * usdBrl
            : preco;

          return { ticker: a.ticker, preco: precoBRL };
        });

      const resultados = await Promise.all(tarefas);

      const novos = {};
      const semCotacao = [];

      for (const r of resultados) {
        if (!r) continue;
        if (r.preco != null) novos[r.ticker] = r.preco;
        else semCotacao.push(r.ticker);
      }

      setPrecos(novos);
      setUltima(new Date());

      if (semCotacao.length > 0) {
        setErro(`Sem cotação para: ${semCotacao.join(', ')}`);
      }
    } catch (e) {
      setErro('Erro ao buscar cotações: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [ativos]);

  const setTesouroPrice = useCallback((id, valor) => {
    setTesouroPrices(prev => ({ ...prev, [id]: Number(valor) }));
  }, []);

  const getPreco = useCallback((ativo) => {
    if (ativo.tipo === 'tesouro') return tesouroPrices[ativo.id] ?? 0;
    return precos[ativo.ticker] ?? 0;
  }, [precos, tesouroPrices]);

  return { precos, tesouroPrices, setTesouroPrice, getPreco, loading, erro, ultimaAtualizacao, atualizar };
}
