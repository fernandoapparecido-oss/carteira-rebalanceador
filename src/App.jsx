import { useState, useMemo, useRef } from 'react';
import { MACRO, RF_SUB } from './data/estrategia';
import useCotacoes from './hooks/useCotacoes';
import useAtivos from './hooks/useAtivos';

const fmt    = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (v) => ((v || 0) * 100).toFixed(1) + '%';

/* ── helpers visuais ── */
function DesvioChip({ desvio }) {
  const abs = Math.abs(desvio);
  const cor = abs < 0.02 ? 'var(--good)' : abs < 0.05 ? 'var(--warn)' : 'var(--bad)';
  return (
    <span className="num" style={{ color: cor, fontWeight: 700, fontSize: 13 }}>
      {desvio >= 0 ? '+' : ''}{fmtPct(desvio)}
    </span>
  );
}
function Barra({ atual, meta, cor }) {
  const pct = meta > 0 ? Math.min((atual / meta) * 100, 100) : 0;
  return <div className="bar"><span style={{ width: `${pct}%`, background: cor }} /></div>;
}

/* ══════════════════════════════════════ */
export default function App() {
  const [aporte, setAporte]       = useState('');
  const [showDetalhe, setDetalhe] = useState(false);
  const { ativos, updateQty, addAtivo, removeAtivo, resetAtivos, importAtivos } = useAtivos();
  const { getPreco, tesouroPrices, setTesouroPrice, loading, erro, ultimaAtualizacao, atualizar } = useCotacoes(ativos);

  const valoresPorAtivo = useMemo(() =>
    ativos.map(a => ({ ...a, preco: getPreco(a), valor: getPreco(a) * a.qty })),
  [ativos, getPreco]);

  const totalAtual    = useMemo(() => valoresPorAtivo.reduce((s, a) => s + a.valor, 0), [valoresPorAtivo]);
  const aporteNum     = Number(aporte) || 0;
  const totalCarteira = totalAtual + aporteNum;

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
    <div style={{ maxWidth: 640, margin: '0 auto', minHeight: '100vh' }} className="safe-b">

      {/* ── Header ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 5, background: 'rgba(15,17,21,.9)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 800, letterSpacing: .3 }}>Carteira</span>
        <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          Patrimônio <strong className="num" style={{ color: 'var(--text)' }}>{fmt(totalAtual)}</strong>
        </span>
      </header>

      <main style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Aporte ── */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ color: 'var(--text-dim)', fontSize: 14, fontWeight: 600 }}>Quanto vou aportar?</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--text-mute)', fontSize: 18 }}>R$</span>
            <input className="input num" type="number" inputMode="decimal" placeholder="0"
              value={aporte} onChange={e => setAporte(e.target.value)}
              style={{ fontSize: 22, fontWeight: 700 }} />
          </div>
          {aporteNum > 0 && (
            <div className="num" style={{ color: 'var(--good)', fontSize: 14 }}>
              Total com aporte: <strong>{fmt(totalCarteira)}</strong>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-sm" onClick={atualizar} disabled={loading}
              style={{ opacity: loading ? .6 : 1 }}>
              {loading ? '⏳ buscando…' : '↻ Atualizar cotações'}
            </button>
            {ultimaAtualizacao && (
              <span className="num" style={{ color: 'var(--text-mute)', fontSize: 12 }}>
                {ultimaAtualizacao.toLocaleTimeString('pt-BR')}
              </span>
            )}
          </div>
          {erro && <div style={{ color: 'var(--warn)', fontSize: 13 }}>⚠ {erro}</div>}
        </section>

        {/* ── Onde aportar (rebalanceamento macro) ── */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 style={{ margin: '4px 2px', fontSize: 15, color: 'var(--text-dim)' }}>
            {aporteNum > 0 ? 'Onde aportar' : 'Alocação por classe'}
          </h2>
          {Object.entries(MACRO).map(([classe, { meta, cor }]) => {
            const valorAtual = porClasse[classe] || 0;
            const pctAtual   = totalCarteira > 0 ? valorAtual / totalCarteira : 0;
            const desvio     = pctAtual - meta;
            const gap        = Math.max(0, meta * totalCarteira - valorAtual);
            return (
              <div key={classe} className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: cor }} />
                    {classe}
                  </span>
                  <DesvioChip desvio={desvio} />
                </div>
                <Barra atual={pctAtual} meta={meta} cor={cor} />
                <div className="num" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, color: 'var(--text-mute)', fontSize: 13 }}>
                  <span>Atual <strong style={{ color: 'var(--text-dim)' }}>{fmtPct(pctAtual)}</strong> · {fmt(valorAtual)}</span>
                  <span>Meta {fmtPct(meta)}</span>
                </div>
                {gap > 0 && (
                  <div className="num" style={{ marginTop: 10, background: 'rgba(70,209,158,.1)', border: '1px solid rgba(70,209,158,.25)', borderRadius: 9, padding: '8px 10px', fontSize: 14, color: 'var(--good)', fontWeight: 600 }}>
                    {aporteNum > 0
                      ? `↑ Aportar ${fmt(Math.min(gap, aporteNum))}`
                      : `Faltam ${fmt(gap)} para a meta`}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* ── Detalhe por subclasse (recolhível) ── */}
        <section className="card" style={{ padding: 0 }}>
          <button className="btn btn-ghost" onClick={() => setDetalhe(v => !v)}
            style={{ width: '100%', justifyContent: 'space-between', border: 'none', minHeight: 52, padding: '0 16px', fontWeight: 700 }}>
            <span>Detalhe: Renda Fixa e Internacional</span>
            <span style={{ color: 'var(--text-mute)' }}>{showDetalhe ? '▲' : '▼'}</span>
          </button>
          {showDetalhe && (
            <div style={{ padding: '0 14px 14px' }}>
              <Subclasses porSubclasse={porSubclasse} porClasse={porClasse}
                valoresPorAtivo={valoresPorAtivo} tesouroPrices={tesouroPrices} setTesouroPrice={setTesouroPrice} />
            </div>
          )}
        </section>

        {/* ── Meus ativos ── */}
        <AtivosSection
          ativos={ativos} valoresPorAtivo={valoresPorAtivo}
          totalGeral={totalAtual} updateQty={updateQty} addAtivo={addAtivo}
          removeAtivo={removeAtivo} resetAtivos={resetAtivos} importAtivos={importAtivos} />
      </main>
    </div>
  );
}

/* ══ Detalhe: subclasses RF + Internacional ══ */
function Subclasses({ porSubclasse, porClasse, valoresPorAtivo, tesouroPrices, setTesouroPrice }) {
  const blocos = [
    { titulo: 'Renda Fixa',    classe: 'RF',            subs: RF_SUB },
    { titulo: 'Internacional', classe: 'Internacional', subs: { Stock: { meta: 0.50 }, REITs: { meta: 0.15 }, Bonds: { meta: 0.35 } } },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {blocos.map(({ titulo, classe, subs }) => {
        const valorClasse = porClasse[classe] || 0;
        const cor = MACRO[classe]?.cor;
        return (
          <div key={classe}>
            <h3 className="num" style={{ color: cor, margin: '0 0 10px', fontSize: 14 }}>{titulo} — {fmt(valorClasse)}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(subs).map(([sub, { meta }]) => {
                const valorSub    = porSubclasse[`${classe}::${sub}`] || 0;
                const pctDentro   = valorClasse > 0 ? valorSub / valorClasse : 0;
                const ativosNaSub = valoresPorAtivo.filter(a => a.classe === classe && a.subclasse === sub);
                return (
                  <div key={sub} style={{ background: 'var(--surface-2)', borderRadius: 11, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{sub}</span>
                      <DesvioChip desvio={pctDentro - meta} />
                    </div>
                    <Barra atual={pctDentro} meta={meta} cor={cor} />
                    <div className="num" style={{ fontSize: 12, color: 'var(--text-mute)', margin: '6px 0 8px' }}>
                      {fmtPct(pctDentro)} / meta {fmtPct(meta)} — {fmt(valorSub)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {ativosNaSub.length > 0 ? ativosNaSub.map(a => (
                        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                          <span style={{ color: 'var(--text-dim)' }}>{a.nome}</span>
                          {a.tipo === 'tesouro' ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ color: 'var(--text-mute)', fontSize: 12 }}>R$</span>
                              <input className="input num" type="number" inputMode="decimal" value={tesouroPrices[a.id] ?? ''}
                                onChange={e => setTesouroPrice(a.id, e.target.value)}
                                style={{ width: 96, minHeight: 36, padding: '0 8px', fontSize: 14 }} />
                            </span>
                          ) : (
                            <span className="num" style={{ color: 'var(--text-mute)' }}>{fmt(a.valor)}</span>
                          )}
                        </div>
                      )) : <span style={{ color: 'var(--text-mute)', fontSize: 13 }}>sem ativos</span>}
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

/* ══ Meus ativos ══ */
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
const NOVO_BLANK = { id:'', nome:'', ticker:'', classe:'Ações', subclasse:'Ações', qty:'', tipo:'b3' };

function AtivosSection({ ativos, valoresPorAtivo, totalGeral, updateQty, addAtivo, removeAtivo, resetAtivos, importAtivos }) {
  const [editQty, setEditQty]   = useState({});
  const [showForm, setShowForm] = useState(false);
  const [novo, setNovo]         = useState(NOVO_BLANK);
  const fileRef                 = useRef(null);

  const handleQtyBlur = (id) => {
    if (editQty[id] !== undefined) {
      updateQty(id, editQty[id]);
      setEditQty(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  const handleAdd = () => {
    if (!novo.id || !novo.nome || Number(novo.qty) <= 0) return;
    addAtivo({ ...novo, qty: Number(novo.qty) });
    setNovo(NOVO_BLANK);
    setShowForm(false);
  };

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

  const lista = [...valoresPorAtivo].sort((a, b) => b.valor - a.valor);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 2px' }}>
        <h2 style={{ margin: 0, fontSize: 15, color: 'var(--text-dim)' }}>Meus ativos <span style={{ color: 'var(--text-mute)' }}>· {ativos.length}</span></h2>
      </div>

      {/* ações */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-sm btn-primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? '✕ Cancelar' : '+ Novo'}
        </button>
        <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>⭱ Importar</button>
        <button className="btn btn-sm" onClick={handleExport}>⭳ Exportar</button>
        <button className="btn btn-sm btn-ghost" onClick={() => { if (confirm('Resetar? Alterações locais serão perdidas.')) resetAtivos(); }}>↺ Resetar</button>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleImportFile} style={{ display: 'none' }} />
      </div>

      {/* formulário novo ativo */}
      {showForm && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label:'ID único', key:'id', placeholder:'ex: PETR4' },
            { label:'Nome',     key:'nome', placeholder:'ex: Petrobras PN' },
            { label:'Ticker',   key:'ticker', placeholder:'ex: PETR4 (vazio = tesouro)' },
          ].map(({ label, key, placeholder }) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ color: 'var(--text-mute)', fontSize: 12 }}>{label}</label>
              <input className="input" value={novo[key]} placeholder={placeholder}
                onChange={e => setNovo(p => ({ ...p, [key]: e.target.value }))} />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ color: 'var(--text-mute)', fontSize: 12 }}>Classe</label>
              <select className="input" value={novo.classe}
                onChange={e => setNovo(p => ({ ...p, classe: e.target.value, subclasse: SUBCLASSES_MAP[e.target.value][0], tipo: TIPOS_MAP[e.target.value][0] }))}>
                {CLASSES_LISTA.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ color: 'var(--text-mute)', fontSize: 12 }}>Subclasse</label>
              <select className="input" value={novo.subclasse}
                onChange={e => setNovo(p => ({ ...p, subclasse: e.target.value }))}>
                {(SUBCLASSES_MAP[novo.classe] || []).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ color: 'var(--text-mute)', fontSize: 12 }}>Tipo</label>
              <select className="input" value={novo.tipo}
                onChange={e => setNovo(p => ({ ...p, tipo: e.target.value }))}>
                {(TIPOS_MAP[novo.classe] || ['b3']).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ color: 'var(--text-mute)', fontSize: 12 }}>Quantidade</label>
              <input className="input num" type="number" inputMode="decimal" value={novo.qty}
                onChange={e => setNovo(p => ({ ...p, qty: e.target.value }))} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleAdd}>Adicionar</button>
        </div>
      )}

      {/* estado vazio */}
      {lista.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 14 }}>
          Nenhum ativo carregado. Toque em <strong style={{ color: 'var(--accent)' }}>⭱ Importar</strong> e escolha seu JSON, ou use <strong style={{ color: 'var(--accent)' }}>+ Novo</strong>.
        </div>
      )}

      {/* lista de ativos (cards) */}
      {lista.map(a => {
        const cor       = MACRO[a.classe]?.cor ?? 'var(--text-dim)';
        const pctCart   = totalGeral > 0 ? a.valor / totalGeral : 0;
        const qtyVal    = editQty[a.id] !== undefined ? editQty[a.id] : a.qty;
        return (
          <div key={a.id} className="card" style={{ padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: cor, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nome}</span>
                </div>
                <div style={{ color: 'var(--text-mute)', fontSize: 12, marginTop: 3 }}>
                  {a.classe} · {a.subclasse}{a.ticker ? ` · ${a.ticker}` : ''}
                </div>
              </div>
              <button onClick={() => { if (confirm(`Remover ${a.nome}?`)) removeAtivo(a.id); }}
                title="Remover" aria-label="Remover ativo"
                style={{ background: 'none', border: 'none', color: 'var(--text-mute)', fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--text-mute)', fontSize: 12 }}>Qtd</span>
                <input className="input num" type="number" inputMode="decimal" value={qtyVal}
                  onChange={e => setEditQty(prev => ({ ...prev, [a.id]: e.target.value }))}
                  onBlur={() => handleQtyBlur(a.id)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.target.blur(); } }}
                  style={{ width: 110, minHeight: 40 }} />
              </label>
              <div className="num" style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: a.valor > 0 ? 'var(--text)' : 'var(--text-mute)' }}>
                  {a.valor > 0 ? fmt(a.valor) : '—'}
                </div>
                <div style={{ color: 'var(--text-mute)', fontSize: 12 }}>
                  {a.preco > 0 ? `${fmt(a.preco)} · ${fmtPct(pctCart)}` : 'sem cotação'}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
