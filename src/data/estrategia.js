// Alocação macro (% do total da carteira)
export const MACRO = {
  RF:            { meta: 0.50, cor: '#4ade80' },
  Ações:         { meta: 0.15, cor: '#60a5fa' },
  FIIs:          { meta: 0.15, cor: '#f472b6' },
  Internacional: { meta: 0.17, cor: '#facc15' },
  Cripto:        { meta: 0.03, cor: '#fb923c' },
};

// Subclasses RF: % dentro da classe RF
export const RF_SUB = {
  'Pós Pública':    { meta: 0.25 },
  'Híbrida Pública':{ meta: 0.30 },
  'Híbrida Privada':{ meta: 0.15 },
  'Pós Privada':    { meta: 0.10 },
  // Nota: Pré Pública (15%) e Pré Privada (5%) estão na estratégia mas sem ativos cadastrados ainda
  'Pré Pública':    { meta: 0.15 },
  'Pré Privada':    { meta: 0.05 },
};

// Subclasses Internacional: % dentro da classe Internacional
export const INTL_SUB = {
  Stock: { meta: 0.50 },
  REITs: { meta: 0.15 },
  Bonds: { meta: 0.35 },
};

// Subclasses Cripto: % dentro da classe Cripto
export const CRIPTO_SUB = {
  BTC: { meta: 0.70 },
  ETH: { meta: 0.30 },
};
