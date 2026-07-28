import { useState, useMemo, useRef } from 'react';
import { MACRO, RF_SUB } from './data/estrategia';
import useCotacoes from './hooks/useCotacoes';
import useAtivos from './hooks/useAtivos';

const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (v) => (v * 100).toFixed(2) + '%';

/* ── helpers visuais ── */
function DesvioChip({ desvio }) {
  const abs = Math.abs(desvio);
  const cor = abs < 0.02 ? '#4ade80' : abs < 0.05 ? '#facc15' : '#f87171';
  return <span style={{ color: cor, fontWeight: 700, fontSize: 13 }}>{desvio >= 0 ? '+' : ''}{fmtPct(desvio)}</span>;
}
function Barra({ atual, meta, cor }) {
  const pct = meta > 0 ? Math.min((atual / meta) * 100, 100) : 0;
  return (
    <div style={{ background: '#2a2a2a', borderRadius: 4, height: 7, width: '100%', margin: '5px 0' }}>
      <div style={{ width: `${pct}%`, background: cor, height: '100%', borderRadius: 4, transition: 'width .4s' }} />
    </div>
  );
}

/* ══════════════════════════════════════ */
export default function App() {
  const [aba, setAba]       = useState('macro');
  const [aporte, setAporte] = useState(0);
  const { ativos, updateQty, addAtivo, removeAtivo, resetAtivos, importAtivos } = useAtivos();
  const { getPreco, tesouroPrices, setTesouroPrice, loading, erro, ultimaAtualizacao, atualizar } = useCotacoes(ativos);

  const valoresPorAtivo = useMemo(() =>
    ativos.map(a => ({ ...a, preco: getPreco(a), valor: getPreco(a) * a.qty })),
  [ativos, getPreco]);

  const totalAtual     = useMemo(() => valoresPorAtivo.reduce((s, a) => s + a.valor, 0), [valoresPorAtivo]);
  const totalCarteira  = totalAtual + Number(aporte);

  const porClasse = useMemo(() => {
    const m = {};
    for (const a of valoresPorAtivo) m[a.classe] = (m[a.classe] || 0) + a.valor;
    return m;
  }, [valoresPorAtivo]);

  const porSubclasse = useMemo(() => {
    const m = {};
    for (const a of valoresPorAtivo) {
      const k = `${a.classe}::${a.subclasse}`;
      m[k] = (m[k] || 0) + a.valor;
    }
    return m;
  }, [valoresPorAtivo]);

  return (
    <div style={{ background: '#111', minHeight: '100vh', color: '#e5e5e5', fontFamily: "'JetBrains Mono','Fira Code',monospace", fontSize: 14 }}>

      {/* ── Header ── */}
      <div style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '14px 24px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>CARTEIRA</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ color: '#555', fontSize: 12 }}>Aporte R$</label>
          <input type="number" value={aporte} onChange={e => setAporte(e.target.value)}
            style={{ background: '#222', border: '1px solid #444', borderRadius: 4, color: '#fff', padding: '4px 10px', width: 120, fontFamily: 'inherit' }} />
        </div>
        <button onClick={atualizar} disabled={loading}
          style={{ background: loading ? '#222' : '#2a2a2a', border: '1px solid #555', borderRadius: 6, color: loading ? '#555' : '#ddd', padding: '6px 14px', cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit' }}>
          {loading ? '⏳ buscando…' : '↻ Atualizar Cotações'}
        </button>
        {ultimaAtualizacao && <span style={{ color: '#444', fontSize: 11 }}>⏱ {ultimaAtualizacao.toLocaleTimeString('pt-BR')}</span>}
        <span style={{ marginLeft: 'auto', color: '#777', fontSize: 13 }}>
          Patrimônio: <strong style={{ color: '#fff' }}>{fmt(totalAtual)}</strong>
          {Number(aporte) > 0 && <span style={{ color: '#4ade80' }}> + {fmt(Number(aporte))} = {fmt(totalCarteira)}</span>}
        </span>
      </div>

      {erro && <div style={{ background: '#1e1000', color: '#facc15', padding: '7px 24px', fontSize: 12, borderBottom: '1px solid #333' }}>⚠ {erro}</div>}

      {/* ── Abas ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid #222', padding: '0 24px' }}>
        {[['macro','Visão Macro'],['rf','RF + Internacional'],['ativos','Por Ativo']].map(([k, label]) => (
          <button key={k} onClick={() => setAba(k)}
            style={{ background: 'none', border: 'none', borderBottom: aba === k ? '2px solid #60a5fa' : '2px solid transparent',
              color: aba === k ? '#fff' : '#555', padding: '11px 20px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: 24 }}>
        {aba === 'macro'  && <AbaVisaoMacro porClasse={porClasse} totalCarteira={totalCarteira} aporte={Number(aporte)} />}
        {aba === 'rf'     && <AbaSubclasses porSubclasse={porSubclasse} porClasse={porClasse} valoresPorAtivo={valoresPorAtivo} tesouroPrices={tesouroPrices} setTesouroPrice={setTesouroPrice} />}
        {aba === 'ativos' && <AbaPorAtivo ativos={ativos} valoresPorAtivo={valoresPorAtivo} porClasse={porClasse} totalGeral={totalAtual} updateQty={updateQty} addAtivo={addAtivo} removeAtivo={removeAtivo} resetAtivos={resetAtivos} importAtivos={importAtivos} />}
      </div>
    </div>
  );
}

/* ══ Aba 1: Visão Macro ══ */
function AbaVisaoMacro({ porClasse, totalCarteira, aporte }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px,1fr))', gap: 16 }}>
      {Object.entries(MACRO).map(([classe, { meta, cor }]) => {
        const valorAtual   = porClasse[classe] || 0;
        const pctAtual     = totalCarteira > 0 ? valorAtual / totalCarteira : 0;
        const desvio       = pctAtual - meta;
        const aporteClasse = Math.max(0, meta * totalCarteira - valorAtual);
        return (
          <div key={classe} style={{ background: '#1a1a1a', border: `1px solid ${cor}28`, borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ color: cor, fontWeight: 700, fontSize: 15 }}>{classe}</span>
              <DesvioChip desvio={desvio} />
            </div>
            <Barra atual={pctAtual} meta={meta} cor={cor} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, color: '#666', fontSize: 12 }}>
              <span>Atual <strong style={{ color: '#ddd' }}>{fmtPct(pctAtual)}</strong> {fmt(valorAtual)}</span>
              <span>Meta {fmtPct(meta)}</span>
            </div>
            {aporte > 0 && aporteClasse > 0 && (
              <div style={{ marginTop: 8, background: '#0a1f0a', borderRadius: 4, padding: '4px 8px', fontSize: 12, color: '#4ade80' }}>
                ↑ Aportar {fmt(Math.min(aporteClasse, aporte))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══ Aba 2: Subclasses RF + Internacional ══ */
function AbaSubclasses({ porSubclasse, porClasse, valoresPorAtivo, tesouroPrices, setTesouroPrice }) {
  const blocos = [
    { titulo: 'Renda Fixa',    classe: 'RF',            subs: RF_SUB },
    { titulo: 'Internacional', classe: 'Internacional', subs: { Stock: { meta: 0.50 }, REITs: { meta: 0.15 }, Bonds: { meta: 0.35 } } },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {blocos.map(({ titulo, classe, subs }) => {
        const valorClasse = porClasse[classe] || 0;
        const cor = MACRO[classe]?.cor;
        return (
          <div key={classe}>
            <h3 style={{ color: cor, margin: '0 0 14px', fontSize: 14 }}>{titulo} — {fmt(valorClasse)}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 12 }}>
              {Object.entries(subs).map(([sub, { meta }]) => {
                const valorSub    = porSubclasse[`${classe}::${sub}`] || 0;
                const pctDentro   = valorClasse > 0 ? valorSub / valorClasse : 0;
                const ativosNaSub = valoresPorAtivo.filter(a => a.classe === classe && a.subclasse === sub);
                return (
                  <div key={sub} style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 8, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontWeight: 600, color: '#ccc', fontSize: 13 }}>{sub}</span>
                      <DesvioChip desvio={pctDentro - meta} />
                    </div>
                    <Barra atual={pctDentro} meta={meta} cor={cor} />
                    <div style={{ fontSize: 11, color: '#555', margin: '3px 0 10px' }}>
                      {fmtPct(pctDentro)} / meta {fmtPct(meta)} — {fmt(valorSub)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {ativosNaSub.length > 0 ? ativosNaSub.map(a => (
                        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                          <span style={{ color: '#bbb' }}>{a.nome}</span>
                          {a.tipo === 'tesouro' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ color: '#444' }}>R$</span>
                              <input type="number" value={tesouroPrices[a.id] ?? ''} onChange={e => setTesouroPrice(a.id, e.target.value)}
                                style={{ width: 85, background: '#222', border: '1px solid #333', borderRadius: 3, color: '#fff', padding: '2px 5px', fontFamily: 'inherit', fontSize: 12 }} />
                              <span style={{ color: '#666' }}>{fmt(a.valor)}</span>
                            </div>
                          ) : (
                            <span style={{ color: '#666' }}>{fmt(a.valor)}</span>
                          )}
                        </div>
                      )) : <span style={{ color: '#333', fontSize: 12 }}>sem ativos</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══ Aba 3: Por Ativo — com edição de qty e adição ══ */
const CLASSES_LISTA  = ['RF', 'Ações', 'FIIs', 'Internacional', 'Cripto'];
const SUBCLASSES_MAP = {
  RF:            ['Pós Pública','Híbrida Pública','Híbrida Privada','Pós Privada','Pré Pública','Pré Privada'],
  Ações:         ['Ações'],
  FIIs:          ['FIIs'],
  Internacional: ['Stock','REITs','Bonds'],
  Cripto:        ['BTC','ETH','Outras'],
};
const TIPOS_MAP = {
  RF:            ['tesouro','b3'],
  Ações:         ['b3'],
  FIIs:          ['b3'],
  Internacional: ['usd'],
  Cripto:        ['cripto'],
};
const NOVO_BLANK = { id:'', nome:'', ticker:'', classe:'Ações', subclasse:'Ações', qty:0, tipo:'b3' };

function AbaPorAtivo({ ativos, valoresPorAtivo, porClasse, totalGeral, updateQty, addAtivo, removeAtivo, resetAtivos, importAtivos }) {
  const [editQty, setEditQty] = useState({});   // { id: valorInput }
  const [showForm, setShowForm] = useState(false);
  const [novo, setNovo]         = useState(NOVO_BLANK);
  const fileRef                 = useRef(null);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(ativos, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `carteira-ativos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data  = JSON.parse(await file.text());
      const lista = Array.isArray(data) ? data : data.ativos;
      if (!Array.isArray(lista)) throw new Error('JSON não contém uma lista de ativos');
      const limpos = lista.map((a) => ({
        id:        String(a.id),
        nome:      String(a.nome ?? a.id),
        classe:    a.classe,
        subclasse: a.subclasse,
        qty:       Number(a.qty) || 0,
        tipo:      a.tipo || 'b3',
        ticker:    a.ticker ?? null,
      }));
      if (limpos.some((a) => !a.id || !a.classe || !a.subclasse)) throw new Error('há ativos sem id/classe/subclasse');
      importAtivos(limpos);
      alert(`Importados ${limpos.length} ativos.`);
    } catch (err) {
      alert('Falha ao importar: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };

  const handleQtyBlur = (id) => {
    if (editQty[id] !== undefined) {
      updateQty(id, editQty[id]);
      setEditQty(prev => { const n = {...prev}; delete n[id]; return n; });
    }
  };

  const handleAdd = () => {
    if (!novo.id || !novo.nome || novo.qty <= 0) return;
    addAtivo({ ...novo, qty: Number(novo.qty) });
    setNovo(NOVO_BLANK);
    setShowForm(false);
  };

  return (
    <div>
      {/* barra de ações */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <button onClick={() => setShowForm(s => !s)}
          style={{ background: '#1a2a1a', border: '1px solid #4ade8055', borderRadius: 6, color: '#4ade80', padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
          {showForm ? '✕ Cancelar' : '+ Novo Ativo'}
        </button>
        <button onClick={handleExport}
          style={{ background: '#1a2230', border: '1px solid #60a5fa55', borderRadius: 6, color: '#60a5fa', padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
          ⭳ Exportar
        </button>
        <button onClick={() => fileRef.current?.click()}
          style={{ background: '#1a2230', border: '1px solid #60a5fa55', borderRadius: 6, color: '#60a5fa', padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
          ⭱ Importar
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleImportFile} style={{ display: 'none' }} />
        <button onClick={() => { if (confirm('Resetar para os ativos padrão? Alterações locais serão perdidas.')) resetAtivos(); }}
          style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, color: '#666', padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
          ↺ Resetar
        </button>
        <span style={{ color: '#444', fontSize: 12, marginLeft: 'auto' }}>Edite quantidade diretamente na tabela (Enter ou Tab para salvar)</span>
      </div>

      {valoresPorAtivo.length === 0 && (
        <div style={{ background: '#12161f', border: '1px solid #223', borderRadius: 8, padding: 20, marginBottom: 16, color: '#89a', fontSize: 13, textAlign: 'center' }}>
          Nenhum ativo carregado. Clique em <strong style={{ color: '#60a5fa' }}>⭱ Importar</strong> e selecione seu arquivo JSON, ou use <strong style={{ color: '#4ade80' }}>+ Novo Ativo</strong>.
        </div>
      )}

      {/* formulário novo ativo */}
      {showForm && (
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: 16, marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
          {[
            { label:'ID único', key:'id', placeholder:'ex: PETR4' },
            { label:'Nome',     key:'nome', placeholder:'ex: Petrobras PN' },
            { label:'Ticker',   key:'ticker', placeholder:'ex: PETR4 (vazio=tesouro)' },
          ].map(({ label, key, placeholder }) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ color: '#555', fontSize: 11 }}>{label}</label>
              <input value={novo[key]} onChange={e => setNovo(p => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                style={{ background: '#222', border: '1px solid #333', borderRadius: 4, color: '#fff', padding: '5px 8px', fontFamily: 'inherit', fontSize: 12 }} />
            </div>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ color: '#555', fontSize: 11 }}>Classe</label>
            <select value={novo.classe} onChange={e => setNovo(p => ({ ...p, classe: e.target.value, subclasse: SUBCLASSES_MAP[e.target.value][0], tipo: TIPOS_MAP[e.target.value][0] }))}
              style={{ background: '#222', border: '1px solid #333', borderRadius: 4, color: '#fff', padding: '5px 8px', fontFamily: 'inherit', fontSize: 12 }}>
              {CLASSES_LISTA.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ color: '#555', fontSize: 11 }}>Subclasse</label>
            <select value={novo.subclasse} onChange={e => setNovo(p => ({ ...p, subclasse: e.target.value }))}
              style={{ background: '#222', border: '1px solid #333', borderRadius: 4, color: '#fff', padding: '5px 8px', fontFamily: 'inherit', fontSize: 12 }}>
              {(SUBCLASSES_MAP[novo.classe] || []).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ color: '#555', fontSize: 11 }}>Tipo</label>
            <select value={novo.tipo} onChange={e => setNovo(p => ({ ...p, tipo: e.target.value }))}
              style={{ background: '#222', border: '1px solid #333', borderRadius: 4, color: '#fff', padding: '5px 8px', fontFamily: 'inherit', fontSize: 12 }}>
              {(TIPOS_MAP[novo.classe] || ['b3']).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ color: '#555', fontSize: 11 }}>Quantidade</label>
            <input type="number" value={novo.qty} onChange={e => setNovo(p => ({ ...p, qty: e.target.value }))}
              style={{ background: '#222', border: '1px solid #333', borderRadius: 4, color: '#fff', padding: '5px 8px', fontFamily: 'inherit', fontSize: 12 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={handleAdd}
              style={{ background: '#0d2b0d', border: '1px solid #4ade8066', borderRadius: 6, color: '#4ade80', padding: '6px 18px', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
              Adicionar
            </button>
          </div>
        </div>
      )}

      {/* tabela */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: '#444', borderBottom: '1px solid #222', fontSize: 11 }}>
              {['Ativo','Classe','Subclasse','Quantidade','Preço','Total','% Classe','% Cart.',''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '5px 10px', fontWeight: 400 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...valoresPorAtivo].sort((a, b) => b.valor - a.valor).map(a => {
              const cor       = MACRO[a.classe]?.cor ?? '#aaa';
              const pctClasse = (porClasse[a.classe] || 0) > 0 ? a.valor / porClasse[a.classe] : 0;
              const pctCart   = totalGeral > 0 ? a.valor / totalGeral : 0;
              const qtyVal    = editQty[a.id] !== undefined ? editQty[a.id] : a.qty;
              return (
                <tr key={a.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={{ padding: '5px 10px', color: cor, fontWeight: 600 }}>{a.nome}</td>
                  <td style={{ padding: '5px 10px', color: '#555' }}>{a.classe}</td>
                  <td style={{ padding: '5px 10px', color: '#444' }}>{a.subclasse}</td>
                  <td style={{ padding: '5px 10px' }}>
                    <input
                      type="number"
                      value={qtyVal}
                      onChange={e => setEditQty(prev => ({ ...prev, [a.id]: e.target.value }))}
                      onBlur={() => handleQtyBlur(a.id)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') handleQtyBlur(a.id); }}
                      style={{ width: 90, background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 3, color: '#fff', padding: '2px 6px', fontFamily: 'inherit', fontSize: 12 }}
                    />
                  </td>
                  <td style={{ padding: '5px 10px', color: '#666' }}>{a.preco > 0 ? fmt(a.preco) : <span style={{ color: '#333' }}>sem cotação</span>}</td>
                  <td style={{ padding: '5px 10px', color: a.valor > 0 ? '#fff' : '#333' }}>{a.valor > 0 ? fmt(a.valor) : '—'}</td>
                  <td style={{ padding: '5px 10px', color: '#555' }}>{fmtPct(pctClasse)}</td>
                  <td style={{ padding: '5px 10px', color: '#444' }}>{fmtPct(pctCart)}</td>
                  <td style={{ padding: '5px 4px' }}>
                    <button onClick={() => { if (confirm(`Remover ${a.nome}?`)) removeAtivo(a.id); }}
                      title="Remover ativo"
                      style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: 14, padding: '0 4px', lineHeight: 1 }}>✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
