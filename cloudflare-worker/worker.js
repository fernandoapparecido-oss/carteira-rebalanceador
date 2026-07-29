// ─────────────────────────────────────────────────────────────────────────
// Cloudflare Worker — proxy CORS de cotações.
//
// Rotas:
//   /tesouro                → CSV de preços/taxas do Tesouro Direto (Tesouro
//                             Transparente, dados abertos oficiais)
//   qualquer outro caminho  → Yahoo Finance (ações, FIIs, ETFs, cripto, câmbio)
//
// O navegador não pode chamar esses endpoints direto (bloqueio CORS); este
// worker repassa a chamada (streaming) e devolve com CORS liberado. O CSV é
// grande (~14 MB); o Cloudflare comprime na saída e o app processa/cacheia.
//
// Custo: apenas dados públicos. Plano gratuito da Cloudflare cobre folgado.
// Opcional: troque '*' abaixo pelo seu domínio do GitHub Pages para restringir.
// ─────────────────────────────────────────────────────────────────────────
const YF_UPSTREAM = 'https://query1.finance.yahoo.com';
const TD_CSV = 'https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv';
const ALLOW_ORIGIN = '*';

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() });
    }

    const url = new URL(request.url);

    // Marcador de versão — permite confirmar qual código está no ar.
    if (url.pathname === '/version') {
      const h = corsHeaders();
      h.set('Content-Type', 'application/json');
      return new Response(JSON.stringify({ version: 'tesouro-csv-1', tesouro: 'csv', ok: true }), { headers: h });
    }

    let target, cacheTtl, contentType;
    if (url.pathname === '/tesouro' || url.pathname.startsWith('/tesouro/')) {
      target      = TD_CSV;        // endpoint fixo; ignora o resto do caminho
      cacheTtl    = 3600;          // PU muda ~1x/dia
      contentType = 'text/csv; charset=utf-8';
    } else {
      target      = YF_UPSTREAM + url.pathname + url.search;
      cacheTtl    = 30;
      contentType = 'application/json';
    }

    let upstream;
    try {
      upstream = await fetch(target, {
        headers: { 'User-Agent': 'Mozilla/5.0 (carteira-rebalanceador)', 'Accept': '*/*' },
        cf: { cacheTtl, cacheEverything: true },
      });
    } catch (err) {
      const h = corsHeaders();
      h.set('Content-Type', 'application/json');
      return new Response(JSON.stringify({ error: 'upstream_fetch_failed', detail: String(err) }), { status: 502, headers: h });
    }

    const headers = corsHeaders();
    headers.set('Content-Type', upstream.headers.get('Content-Type') || contentType);
    // streaming: repassa o corpo sem bufferizar (essencial para o CSV grande)
    return new Response(upstream.body, { status: upstream.status, headers });
  },
};

function corsHeaders() {
  const h = new Headers();
  h.set('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  h.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  h.set('Access-Control-Allow-Headers', '*');
  return h;
}
