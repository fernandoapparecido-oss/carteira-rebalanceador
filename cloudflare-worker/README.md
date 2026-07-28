# Worker de cotações (Cloudflare)

Proxy CORS para o Yahoo Finance. O front-end (GitHub Pages) chama este worker
para buscar preços de ações, FIIs, ETFs, cripto e câmbio USD/BRL.

## Publicar o worker

Você já tem conta na Cloudflare, então escolha **uma** das formas:

### Opção A — pela linha de comando (wrangler)

```bash
cd cloudflare-worker
npx wrangler login        # abre o navegador para autenticar (uma vez só)
npx wrangler deploy
```

Ao final, o wrangler imprime a URL pública, algo como:
`https://carteira-cotacoes.SEU-SUBDOMINIO.workers.dev`

### Opção B — pelo painel da Cloudflare

1. Dashboard → **Workers & Pages** → **Create** → **Create Worker**.
2. Nomeie (ex.: `carteira-cotacoes`) e clique em **Deploy**.
3. Abra **Edit code**, cole o conteúdo de [`worker.js`](./worker.js), **Save and deploy**.
4. Copie a URL `*.workers.dev` que aparece no topo.

## Ligar o worker ao app

Guarde a URL do worker no repositório do GitHub como **variável de Actions**:

- Repositório → **Settings** → **Secrets and variables** → **Actions** → aba **Variables** → **New repository variable**
- Nome: `VITE_COTACOES_API`
- Valor: a URL do seu worker, **sem barra no final** — ex.: `https://carteira-cotacoes.SEU-SUBDOMINIO.workers.dev`

O build do GitHub Pages injeta essa URL automaticamente. Pronto.

## Custo

O worker só repassa dados públicos de cotação. O plano **gratuito** da Cloudflare
(100.000 requisições/dia, compartilhadas por toda a conta) cobre o uso pessoal
com enorme folga — cada atualização de carteira gera algumas dezenas de chamadas.

## Restringir o acesso (opcional)

Em `worker.js`, troque `ALLOW_ORIGIN = '*'` pelo seu domínio do GitHub Pages,
ex.: `'https://SEU-USUARIO.github.io'`, e faça deploy de novo.
