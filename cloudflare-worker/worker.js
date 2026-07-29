// ─────────────────────────────────────────────────────────────────────────
// Cloudflare Worker — proxy CORS para cotações.
//
// Rotas:
//   /tesouro                → Tesouro Direto (JSON com o PU de todos os títulos)
//   qualquer outro caminho  → Yahoo Finance (ações, FIIs, ETFs, cripto, câmbio)
//
// O navegador não pode chamar esses endpoints direto (bloqueio CORS); este
// worker repassa a chamada e devolve a resposta com CORS liberado.
//
// Custo: apenas dados públicos de cotação. Plano gratuito da Cloudflare
// (100k req/dia, compartilhado na conta) cobre folgadamente o uso pessoal.
//
// Opcional: troque '*' abaixo pelo seu domínio do GitHub Pages para restringir.
// ─────────────────────────────────────────────────────────────────────────
const YF_UPSTREAM = 'https://query1.finance.yahoo.com';
const TD_URL      = 'https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/treasurybondsinfo.json';
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
    let target, cacheTtl;
    if (url.pathname === '/tesouro' || url.pathname.startsWith('/tesouro/')) {
      target   = TD_URL;   // endpoint fixo do Tesouro; ignora o resto do caminho
      cacheTtl = 300;      // PU muda poucas vezes ao dia
    } else {
      target   = YF_UPSTREAM + url.pathname + url.search;
      cacheTtl = 30;
    }

    let upstream;
    try {
      upstream = await fetch(target, {
        headers: { 'User-Agent': 'Mozilla/5.0 (carteira-rebalanceador)', 'Accept': 'application/json' },
        cf: { cacheTtl, cacheEverything: true },
      });
    } catch (err) {
      return json({ error: 'upstream_fetch_failed', detail: String(err) }, 502);
    }

    const body    = await upstream.arrayBuffer();
    const headers = corsHeaders();
    headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json');
    return new Response(body, { status: upstream.status, headers });
  },
};

function corsHeaders() {
  const h = new Headers();
  h.set('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  h.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  h.set('Access-Control-Allow-Headers', '*');
  return h;
}

function json(obj, status = 200) {
  const h = corsHeaders();
  h.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(obj), { status, headers: h });
}
