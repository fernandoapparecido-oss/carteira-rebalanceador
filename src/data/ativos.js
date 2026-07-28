// ─────────────────────────────────────────────────────────────────────────
// Semente pública da carteira — INTENCIONALMENTE VAZIA.
//
// Suas posições reais NÃO ficam aqui (o app é publicado no GitHub Pages, que
// é sempre público). Elas vivem apenas no localStorage do seu navegador e no
// arquivo JSON que você guarda por conta própria.
//
// Fluxo: abra o app → aba "Por Ativo" → botão "Importar" → selecione seu JSON.
// Para tirar um backup: botão "Exportar".
//
// Formato de cada ativo (referência para quem for editar/forkar o projeto):
//   {
//     id:        'PETR4',            // identificador único
//     nome:      'Petrobras PN',     // rótulo exibido
//     classe:    'Ações',            // RF | Ações | FIIs | Internacional | Cripto
//     subclasse: 'Ações',            // ver SUBCLASSES_MAP em App.jsx
//     qty:       100,                // quantidade
//     tipo:      'b3',               // tesouro | b3 | usd | cripto
//     ticker:    'PETR4',            // símbolo p/ cotação (null p/ Tesouro Direto)
//   }
// ─────────────────────────────────────────────────────────────────────────
export const ATIVOS = [];

export const CLASSES = ['RF', 'Ações', 'FIIs', 'Internacional', 'Cripto'];

export const SUBCLASSES_RF = ['Pós Pública', 'Híbrida Pública', 'Híbrida Privada', 'Pós Privada'];
export const SUBCLASSES_INTL = ['Stock', 'REITs', 'Bonds'];
