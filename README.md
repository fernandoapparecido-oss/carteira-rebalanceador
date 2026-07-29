# Carteira — Rebalanceador

PWA mobile-first para **rebalancear a carteira segundo a sua própria estratégia
de alocação**, com cotações ao vivo de ações, FIIs, ETFs, cripto, câmbio e
Tesouro Direto.

**App:** https://fernandoapparecido-oss.github.io/carteira-rebalanceador/

> **Escopo (importante):** este é um **rebalanceador**, não um consolidador de
> carteira. Veja [Decisões de projeto](#decisões-de-projeto).

---

## Funcionalidades

- **Alocação por classe e subclasse** (RF, Ações, FIIs, Internacional, Cripto),
  com **metas editáveis** (salvas no navegador) e aviso quando a soma ≠ 100%.
- **"Onde aportar"**: informe o aporte e o app mostra, por classe, quanto falta
  para a meta — com **drill-down** até a subclasse/ativo ("comprar aqui").
- **Cotações automáticas**:
  - Ações, FIIs, ETFs, cripto e câmbio USD/BRL via **Yahoo Finance**.
  - **Tesouro Direto** (PU de resgate) via CSV oficial do **Tesouro Transparente**,
    casado por nome, com cache de 1×/dia. PU também editável manualmente.
- **Preço médio + rentabilidade** (opcional) por ativo e total — universal
  (funciona também para internacional e cripto).
- **Gestão de ativos**: adicionar, editar, **mover entre estratégias**
  (classe/subclasse independentes do tipo de cotação), filtrar e agrupar.
- **Import/Export JSON** — seus dados vivem só no navegador (ver Privacidade).
- **PWA instalável** (tela inicial, tela cheia, offline básico do shell).

## Rodando localmente

```bash
npm install
npm run dev      # http://localhost:5173
```

Em dev, as cotações usam o **proxy do Vite** (`/yf` → Yahoo), configurado em
`vite.config.js` — não precisa do worker para desenvolver.

```bash
npm run build    # gera dist/
npm run lint
```

## Arquitetura

- **Vite + React 19**, publicado no **GitHub Pages** via **GitHub Actions**
  (`.github/workflows/deploy.yml`) a cada push no `main`.
- **Cotações em produção** passam por um **Cloudflare Worker**
  (`cloudflare-worker/`), que contorna o CORS:
  - qualquer caminho → Yahoo Finance;
  - `/tesouro` → CSV do Tesouro Transparente (streaming).
  - A URL do worker é injetada no build pela variável de Actions
    `VITE_COTACOES_API`.
- **Dados no navegador (localStorage)** — nada de carteira no código:
  - `carteira-ativos-v1` — ativos (quantidade, classe/subclasse, preço médio…)
  - `carteira-metas-v1` — metas de alocação
  - `carteira-tesouro-v1` — PU manual do Tesouro (override)
  - `carteira-tesouro-csv-v1` — cache diário dos PUs do Tesouro Transparente
- **Sincronização entre aparelhos**: manual, via **Export/Import** do JSON.

## Configuração e deploy

1. **Worker de cotações** — publicar `cloudflare-worker/worker.js` na Cloudflare
   (ver `cloudflare-worker/README.md`). Testar em `.../version` e `.../tesouro`.
2. **Variável de Actions** — repo → *Settings → Secrets and variables → Actions
   → Variables*: `VITE_COTACOES_API` = URL do worker (sem barra final).
3. **GitHub Pages** — *Settings → Pages → Source: GitHub Actions*.
4. Push no `main` → a Action builda e publica automaticamente.

## Privacidade

O `src/data/ativos.js` é **vazio de propósito**: as posições reais **não ficam
no código**. Elas vivem apenas no `localStorage` do seu navegador e no arquivo
JSON que você exporta e guarda. Por isso o repositório pode ser **público**
(necessário para o GitHub Pages no plano gratuito) **sem expor a carteira** — o
site publicado aparece vazio até você importar seu JSON naquele aparelho.

> Nota: em navegadores como o Safari (iOS), o `localStorage` pode ser limpo após
> ~7 dias sem uso. Instalar como **PWA** deixa o armazenamento mais persistente,
> e o **JSON exportado** é sempre a rede de segurança.

## Decisões de projeto

### Escopo: rebalanceador, não consolidador (2026-07)

**Decisão:** manter o app focado no **rebalanceamento com a estratégia do
usuário** e **não** evoluí-lo para um consolidador de carteira completo
(rentabilidade histórica, proventos, evolução patrimonial, benchmark).

**Motivo:** consolidadores de mercado (Kinvo, Gorila, Real Valor, Status Invest…)
têm **integração automática com a B3** (via CPF), então preço médio, proventos,
evolução patrimonial e comparação com CDI/IBOV/IPCA saem **prontos, automáticos
e de graça**. Replicar isso aqui seria **manual** (alto esforço, ROI baixo/nulo)
e ainda assim **não cobriria internacional nem cripto** (que não passam pela B3).
A tentativa de import da B3 confirmou o limite: a *Movimentação* é ótima para
**proventos**, mas **não reconstrói preço médio confiável** (transferências,
portabilidade e aluguel de ações poluem o histórico).

**Nicho onde este app ganha:** rebalanceamento pela **estratégia personalizada**
do usuário (com as subclasses próprias de RF, etc.) e **visão unificada de
aporte** incluindo Tesouro/internacional/cripto — algo que os consolidadores de
mercado não fazem bem.

**Recomendação de uso:** usar um consolidador de mercado para *performance/
tracking*; usar **este app para decidir o próximo aporte**. Os dois convivem.

**Sobre o preço médio (já implementado):** mantido como campo **opcional e
não-intrusivo** (só aparece se preenchido). Tem uso legítimo no rebalanceamento
— saber se um ativo está no lucro/prejuízo ajuda na decisão de vender para
rebalancear (inclusive por IR). Não avançar para proventos/evolução patrimonial.

## Progresso

Marcos entregues, em ordem:

1. **Privacidade + acesso**: `ativos.js` esvaziado; Export/Import JSON.
2. **Publicação**: GitHub Pages via Actions; cotações via Cloudflare Worker
   (proxy CORS do Yahoo); histórico do Git limpo (posições reais removidas).
3. **UX mobile-first**: tela única (sem abas), cards, tipografia legível.
4. **Rebalanceamento detalhado**: "onde aportar" com drill-down por
   subclasse/ativo; **metas editáveis**; filtros e agrupamento na lista.
5. **Edição de ativos**: mover entre estratégias; classe/subclasse independentes
   do tipo de cotação.
6. **Tesouro automático**: migração para o CSV oficial (Tesouro Transparente),
   PU de resgate casado por nome, cache diário; PU manual como override.
7. **PWA instalável**: manifest, service worker, ícones.
8. **Preço médio + rentabilidade** (opcional) por ativo e total.
9. **Decisão de escopo**: encerrar a frente de consolidador (ver acima).

## Estrutura

```
src/
  App.jsx               UI (tela única mobile-first)
  data/
    ativos.js           semente pública VAZIA (formato documentado)
    estrategia.js       metas padrão (classes e subclasses)
  hooks/
    useAtivos.js        ativos + persistência (localStorage)
    useCotacoes.js      Yahoo + Tesouro (CSV) + PU manual
    useEstrategia.js    metas editáveis + persistência
cloudflare-worker/      proxy de cotações (Yahoo + /tesouro) + instruções
.github/workflows/      deploy para o GitHub Pages
```
