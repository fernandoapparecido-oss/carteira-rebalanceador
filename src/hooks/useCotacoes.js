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

// ── Tesouro Direto (via rota /tesouro do worker) ──
const TESOURO_URL = `${API_BASE}/tesouro`;

function normaliza(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

// Baixa a lista de títulos e devolve um mapa: nome normalizado → PU de resgate
async function fetchTesouroMapa() {
  const r = await fetch(TESOURO_URL);
  const d = await r.json();
  const lista = d?.response?.TrsrBdTradgList || [];
  const mapa = {};
  for (const item of lista) {
    const b = item?.TrsrBd;
    if (!b?.nm) continue;
    const pu = b.untrRedVal ?? b.untrInvstmtVal; // PU de resgate (fallback: investimento)
    if (pu != null) mapa[normaliza(b.nm)] = pu;
  }
  return mapa;
}

// Casa um ativo do usuário (pelo nome) com um título do mapa
function achaPU(mapa, nome) {
  const n = normaliza(nome);
  if (mapa[n] != null) return mapa[n];
  // fuzzy: mesmo ano + mesmo indexador, respeitando "com juros semestrais"
  const ano = (n.match(/\b(20\d{2})\b/) || [])[1];
  const idx = n.includes('selic') ? 'selic' : n.includes('ipca') ? 'ipca' : n.includes('prefix') ? 'prefix' : null;
  const semestral = n.includes('semestr');
  if (!ano || !idx) return null;
  for (const [k, v] of Object.entries(mapa)) {
    if (k.includes(ano) && k.includes(idx) && k.includes('semestr') === semestral) return v;
  }
  return null;
}

// Preços do Tesouro Direto (PU) — editados manualmente e salvos no navegador.
const TES_KEY = 'carteira-tesouro-v1';
function loadTesouro() {
  try {
    const raw = localStorage.getItem(TES_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function useCotacoes(ativos) {
  const [precos, setPrecos]               = useState({});
  const [tesouroPrices, setTesouroPrices] = useState(() => loadTesouro() ?? {});
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

      // 3. Tesouro Direto (PU de resgate), casando pelo nome
      const tesouroAtivos = ativos.filter(a => a.tipo === 'tesouro');
      const semTesouro = [];
      if (tesouroAtivos.length) {
        try {
          const mapa = await fetchTesouroMapa();
          const novosT = {};
          for (const a of tesouroAtivos) {
            const pu = achaPU(mapa, a.nome);
            if (pu != null) novosT[a.id] = pu;
            else semTesouro.push(a.nome);
          }
          if (Object.keys(novosT).length) {
            setTesouroPrices(prev => {
              const next = { ...prev, ...novosT };
              localStorage.setItem(TES_KEY, JSON.stringify(next));
              return next;
            });
          }
        } catch {
          semTesouro.push('(falha ao buscar Tesouro)');
        }
      }

      setUltima(new Date());

      const avisos = [];
      if (semCotacao.length) avisos.push(`Sem cotação: ${semCotacao.join(', ')}`);
      if (semTesouro.length) avisos.push(`Tesouro não encontrado: ${semTesouro.join(', ')}`);
      if (avisos.length) setErro(avisos.join(' · '));
    } catch (e) {
      setErro('Erro ao buscar cotações: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [ativos]);

  const setTesouroPrice = useCallback((id, valor) => {
    setTesouroPrices(prev => {
      const next = { ...prev, [id]: Number(valor) };
      localStorage.setItem(TES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const getPreco = useCallback((ativo) => {
    if (ativo.tipo === 'tesouro') return tesouroPrices[ativo.id] ?? 0;
    return precos[ativo.ticker] ?? 0;
  }, [precos, tesouroPrices]);

  return { precos, tesouroPrices, setTesouroPrice, getPreco, loading, erro, ultimaAtualizacao, atualizar };
}
