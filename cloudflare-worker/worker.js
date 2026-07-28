// ─────────────────────────────────────────────────────────────────────────
// Cloudflare Worker — proxy CORS para o Yahoo Finance.
//
// O navegador não pode chamar query1.finance.yahoo.com direto (bloqueio CORS).
// Este worker repassa qualquer caminho recebido para o Yahoo e devolve a
// resposta com os cabeçalhos CORS liberados. O front-end (GitHub Pages) chama:
//     https://SEU-WORKER.workers.dev/v8/finance/chart/PETR4.SA?interval=1d&range=1d
//
// Custo: repassa apenas dados públicos de cotação. Plano gratuito da Cloudflare
// (100k req/dia, compartilhado na conta) cobre folgadamente o uso pessoal.
//
// Opcional: troque '*' abaixo pelo seu domínio do GitHub Pages para restringir
// quem pode usar o worker, ex.: 'https://SEU-USUARIO.github.io'.
// ─────────────────────────────────────────────────────────────────────────
const UPSTREAM     = 'https://query1.finance.yahoo.com';
const ALLOW_ORIGIN = '*';

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() });
    }

    const url    = new URL(request.url);
    const target = UPSTREAM + url.pathname + url.search;

    let upstream;
    try {
      upstream = await fetch(target, {
        headers: { 'User-Agent': 'Mozilla/5.0 (carteira-rebalanceador)' },
        cf: { cacheTtl: 30, cacheEverything: true },
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
