import { useState, useMemo, useRef } from 'react';
import { MACRO } from './data/estrategia';
import useCotacoes from './hooks/useCotacoes';
import useAtivos from './hooks/useAtivos';
import useEstrategia from './hooks/useEstrategia';

const fmt    = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (v) => ((v || 0) * 100).toFixed(1) + '%';
const COR    = (c) => MACRO[c]?.cor ?? 'var(--text-dim)';
const CLASSES = ['RF', 'Ações', 'FIIs', 'Internacional', 'Cripto'];

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
  const [aporte, setAporte] = useState('');
  const { ativos, updateQty, updateAtivo, addAtivo, removeAtivo, resetAtivos, importAtivos } = useAtivos();
  const { getPreco, tesouroPrices, setTesouroPrice, loading, erro, ultimaAtualizacao, atualizar } = useCotacoes(ativos);
  const { macro: macroMetas, sub: subMetas, updateMacro, updateSub, resetMetas, macroSoma } = useEstrategia();

  const valoresPorAtivo = useMemo(() =>
    ativos.map(a => ({ ...a, preco: getPreco(a), valor: getPreco(a) * a.qty })),
  [ativos, getPreco]);

  const totalAtual    = useMemo(() => valoresPorAtivo.reduce((s, a) => s + a.valor, 0), [valoresPorAtivo]);
  const aporteNum     = Number(aporte) || 0;
  const totalCarteira = totalAtual + aporteNum;

  // Rentabilidade — considera só ativos com preço médio informado e com cotação
  const rent = useMemo(() => {
    let investido = 0, atual = 0;
    for (const a of valoresPorAtivo) {
      if (a.precoMedio > 0 && a.preco > 0) { investido += a.precoMedio * a.qty; atual += a.valor; }
    }
    const resultado = atual - investido;
    return { investido, atual, resultado, pct: investido > 0 ? resultado / investido : 0 };
  }, [valoresPorAtivo]);

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

  // subclasses de uma classe, ordenadas da mais abaixo da meta para a menos
  const subclassesDe = (classe) => {
    const defs = subMetas[classe] || {};
    const valorClasse = porClasse[classe] || 0;
    return Object.entries(defs).map(([sub, meta]) => {
      const valorSub  = porSubclasse[`${classe}::${sub}`] || 0;
      const pctDentro = valorClasse > 0 ? valorSub / valorClasse : 0;
      const ativosNaSub = valoresPorAtivo
        .filter(a => a.classe === classe && a.subclasse === sub)
        .sort((a, b) => a.valor - b.valor);
      return { sub, meta, valorSub, pctDentro, desvio: pctDentro - meta, ativos: ativosNaSub };
    }).sort((a, b) => a.desvio - b.desvio);
  };

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
            <button className="btn btn-sm" onClick={atualizar} disabled={loading} style={{ opacity: loading ? .6 : 1 }}>
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

        {/* ── Resultado (rentabilidade) ── */}
        {rent.investido > 0 && (
          <section className="card num" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div>
              <div style={{ color: 'var(--text-mute)', fontSize: 12 }}>Investido</div>
              <div style={{ fontWeight: 700 }}>{fmt(rent.investido)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text-mute)', fontSize: 12 }}>Atual</div>
              <div style={{ fontWeight: 700 }}>{fmt(rent.atual)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--text-mute)', fontSize: 12 }}>Resultado</div>
              <div style={{ fontWeight: 800, color: rent.resultado >= 0 ? 'var(--good)' : 'var(--bad)' }}>
                {rent.resultado >= 0 ? '+' : ''}{fmt(rent.resultado)}
                <span style={{ fontSize: 12 }}> ({rent.resultado >= 0 ? '+' : ''}{fmtPct(rent.pct)})</span>
              </div>
            </div>
          </section>
        )}

        {/* ── Onde aportar (com drill-down por subclasse/ativo) ── */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 style={{ margin: '4px 2px', fontSize: 15, color: 'var(--text-dim)' }}>
            {aporteNum > 0 ? 'Onde aportar' : 'Alocação por classe'}
          </h2>
          {CLASSES.map((classe) => (
            <ClasseCard key={classe}
              classe={classe} meta={macroMetas[classe] || 0} cor={COR(classe)}
              valorAtual={porClasse[classe] || 0} totalCarteira={totalCarteira}
              aporteNum={aporteNum} subclasses={subclassesDe(classe)}
              tesouroPrices={tesouroPrices} setTesouroPrice={setTesouroPrice} />
          ))}
        </section>

        {/* ── Metas de alocação (editável) ── */}
        <MetasEditor macroMetas={macroMetas} subMetas={subMetas}
          updateMacro={updateMacro} updateSub={updateSub} resetMetas={resetMetas} macroSoma={macroSoma} />

        {/* ── Meus ativos ── */}
        <AtivosSection
          ativos={ativos} valoresPorAtivo={valoresPorAtivo}
          totalGeral={totalAtual} updateQty={updateQty} updateAtivo={updateAtivo} addAtivo={addAtivo}
          removeAtivo={removeAtivo} resetAtivos={resetAtivos} importAtivos={importAtivos}
          tesouroPrices={tesouroPrices} setTesouroPrice={setTesouroPrice} />
      </main>
    </div>
  );
}

/* ══ Card de classe com drill-down ══ */
function ClasseCard({ classe, meta, cor, valorAtual, totalCarteira, aporteNum, subclasses, tesouroPrices, setTesouroPrice }) {
  const [aberto, setAberto] = useState(false);
  const pctAtual   = totalCarteira > 0 ? valorAtual / totalCarteira : 0;
  const desvio     = pctAtual - meta;
  const alvoClasse = meta * totalCarteira;            // quanto deveria ter nesta classe (R$)
  const gap        = Math.max(0, alvoClasse - valorAtual);

  return (
    <div className="card" style={{ padding: 14 }}>
      <button className="btn btn-ghost" onClick={() => setAberto(v => !v)}
        style={{ width: '100%', padding: 0, minHeight: 0, border: 'none', display: 'block', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: cor }} />
            {classe}
            <span style={{ color: 'var(--text-mute)', fontSize: 12, fontWeight: 500 }}>{aberto ? '▲' : '▼'}</span>
          </span>
          <DesvioChip desvio={desvio} />
        </div>
      </button>
      <Barra atual={pctAtual} meta={meta} cor={cor} />
      <div className="num" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, color: 'var(--text-mute)', fontSize: 13 }}>
        <span>Tem <strong style={{ color: 'var(--text-dim)' }}>{fmt(valorAtual)}</strong> · {fmtPct(pctAtual)}</span>
        <span>Meta <strong style={{ color: 'var(--text-dim)' }}>{fmt(alvoClasse)}</strong> · {fmtPct(meta)}</span>
      </div>
      {gap > 0 && (
        <div className="num" style={{ marginTop: 10, background: 'rgba(70,209,158,.1)', border: '1px solid rgba(70,209,158,.25)', borderRadius: 9, padding: '8px 10px', fontSize: 14, color: 'var(--good)', fontWeight: 600 }}>
          {aporteNum > 0 ? `↑ Aportar ${fmt(Math.min(gap, aporteNum))}` : `Faltam ${fmt(gap)} para a meta`}
          {' '}<span style={{ color: 'var(--text-mute)', fontWeight: 500 }}>· toque para ver onde</span>
        </div>
      )}

      {/* drill-down: subclasses ordenadas por quem está mais abaixo da meta */}
      {aberto && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {subclasses.map(({ sub, meta: metaSub, pctDentro, desvio: dSub, valorSub, ativos }) => {
            const abaixo = dSub < -0.001;
            const temSub = classe !== 'Ações' && classe !== 'FIIs'; // Ações/FIIs: subclasse única, não faz sentido detalhar %
            const alvoSub  = metaSub * alvoClasse;                  // quanto deveria ter nesta subclasse (R$)
            const faltaSub = Math.max(0, alvoSub - valorSub);
            return (
              <div key={sub} style={{ background: 'var(--surface-2)', borderRadius: 11, padding: 12, borderLeft: `3px solid ${abaixo ? cor : 'transparent'}` }}>
                {temSub && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {sub} {abaixo && <span style={{ color: cor, fontSize: 11 }}>· comprar aqui</span>}
                      </span>
                      <DesvioChip desvio={dSub} />
                    </div>
                    <Barra atual={pctDentro} meta={metaSub} cor={cor} />
                    <div className="num" style={{ fontSize: 12, color: 'var(--text-mute)', margin: '6px 0 4px' }}>
                      Tem {fmt(valorSub)} · Meta {fmt(alvoSub)}
                      <span style={{ opacity: .7 }}> ({fmtPct(pctDentro)}/{fmtPct(metaSub)})</span>
                    </div>
                    {faltaSub > 0 && (
                      <div className="num" style={{ fontSize: 13, color: 'var(--good)', fontWeight: 600, marginBottom: 8 }}>
                        Faltam {fmt(faltaSub)}{aporteNum > 0 ? ` · aportar ${fmt(Math.min(faltaSub, aporteNum))}` : ''}
                      </div>
                    )}
                  </>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ativos.length > 0 ? ativos.map(a => (
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
                  )) : (
                    <span style={{ color: abaixo ? cor : 'var(--text-mute)', fontSize: 13 }}>
                      sem ativos cadastrados{abaixo ? ' — cadastre um para esta meta' : ''}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {(!subclasses || subclasses.length === 0) && (
            <span style={{ color: 'var(--text-mute)', fontSize: 13 }}>sem subclasses configuradas</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ══ Editor de metas de alocação ══ */
function MetasEditor({ macroMetas, subMetas, updateMacro, updateSub, resetMetas, macroSoma }) {
  const [aberto, setAberto] = useState(false);
  const somaOk = Math.abs(macroSoma - 1) < 0.005;

  return (
    <section className="card" style={{ padding: 0 }}>
      <button className="btn btn-ghost" onClick={() => setAberto(v => !v)}
        style={{ width: '100%', justifyContent: 'space-between', border: 'none', minHeight: 52, padding: '0 16px', fontWeight: 700 }}>
        <span>Metas de alocação</span>
        <span style={{ color: 'var(--text-mute)' }}>{aberto ? '▲' : '▼'}</span>
      </button>

      {aberto && (
        <div style={{ padding: '0 14px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* metas macro */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ color: 'var(--text-dim)', fontSize: 13, fontWeight: 600 }}>Por classe (% da carteira)</span>
              <span className="num" style={{ fontSize: 12, color: somaOk ? 'var(--good)' : 'var(--warn)' }}>
                soma {(macroSoma * 100).toFixed(0)}%{somaOk ? '' : ' ⚠'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CLASSES.map(c => (
                <MetaRow key={c} cor={COR(c)} label={c} value={macroMetas[c] || 0}
                  onChange={pct => updateMacro(c, pct)} />
              ))}
            </div>
          </div>

          {/* metas subclasses (só onde faz sentido) */}
          {['RF', 'Internacional', 'Cripto'].map(classe => {
            const subs = subMetas[classe] || {};
            const soma = Object.values(subs).reduce((s, v) => s + v, 0);
            const ok = Math.abs(soma - 1) < 0.005;
            return (
              <div key={classe}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: COR(classe), fontSize: 13, fontWeight: 600 }}>{classe} — subclasses (% dentro da classe)</span>
                  <span className="num" style={{ fontSize: 12, color: ok ? 'var(--good)' : 'var(--warn)' }}>
                    soma {(soma * 100).toFixed(0)}%{ok ? '' : ' ⚠'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(subs).map(([sub, v]) => (
                    <MetaRow key={sub} label={sub} value={v} onChange={pct => updateSub(classe, sub, pct)} />
                  ))}
                </div>
              </div>
            );
          })}

          <button className="btn btn-sm btn-ghost" onClick={() => { if (confirm('Restaurar as metas padrão?')) resetMetas(); }}
            style={{ alignSelf: 'flex-start' }}>↺ Restaurar padrão</button>
        </div>
      )}
    </section>
  );
}

function MetaRow({ label, value, onChange, cor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {cor && <span style={{ width: 9, height: 9, borderRadius: 3, background: cor, flexShrink: 0 }} />}
      <span style={{ flex: 1, fontSize: 14 }}>{label}</span>
      <input className="input num" type="number" inputMode="decimal"
        value={Math.round((value || 0) * 1000) / 10}
        onChange={e => onChange(e.target.value)}
        style={{ width: 80, minHeight: 38, textAlign: 'right' }} />
      <span style={{ color: 'var(--text-mute)', fontSize: 14, width: 14 }}>%</span>
    </div>
  );
}

/* ══ Meus ativos (com filtro e agrupamento) ══ */
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
const NOVO_BLANK = { id:'', nome:'', ticker:'', classe:'Ações', subclasse:'Ações', qty:'', tipo:'b3', precoMedio:'' };
// Todos os tipos ficam disponíveis na edição: classe/subclasse (alocação) e
// tipo (como buscar a cotação) são independentes — ex.: um ETF da B3 pode ser
// alocado em "Internacional" mantendo tipo 'b3' para não quebrar o preço.
const TODOS_TIPOS = ['b3', 'tesouro', 'usd', 'cripto'];

function AtivosSection({ ativos, valoresPorAtivo, totalGeral, updateQty, updateAtivo, addAtivo, removeAtivo, resetAtivos, importAtivos, tesouroPrices, setTesouroPrice }) {
  const [editQty, setEditQty]   = useState({});
  const [showForm, setShowForm] = useState(false);
  const [novo, setNovo]         = useState(NOVO_BLANK);
  const [filtro, setFiltro]     = useState('Todos');
  const [agrupar, setAgrupar]   = useState(false);
  const [editId, setEditId]     = useState(null);
  const [editData, setEditData] = useState(null);
  const fileRef                 = useRef(null);

  const startEdit = (a) => {
    setEditId(a.id);
    setEditData({ nome: a.nome, ticker: a.ticker ?? '', classe: a.classe, subclasse: a.subclasse, tipo: a.tipo, precoMedio: a.precoMedio ?? '' });
  };
  const cancelEdit = () => { setEditId(null); setEditData(null); };
  const changeEditClasse = (v) => setEditData(d => ({
    ...d, classe: v,
    subclasse: (SUBCLASSES_MAP[v] || []).includes(d.subclasse) ? d.subclasse : (SUBCLASSES_MAP[v] || [''])[0],
  }));
  const saveEdit = () => {
    updateAtivo(editId, {
      nome:      editData.nome || editId,
      ticker:    editData.ticker ? editData.ticker.trim() : null,
      classe:    editData.classe,
      subclasse: editData.subclasse,
      tipo:      editData.tipo,
      precoMedio: Number(editData.precoMedio) || 0,
    });
    cancelEdit();
  };

  const handleQtyBlur = (id) => {
    if (editQty[id] !== undefined) {
      updateQty(id, editQty[id]);
      setEditQty(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  const handleAdd = () => {
    if (!novo.id || !novo.nome || Number(novo.qty) <= 0) return;
    addAtivo({ ...novo, qty: Number(novo.qty), precoMedio: Number(novo.precoMedio) || 0 });
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
      const raw   = Array.isArray(data) ? data : data.ativos;
      if (!Array.isArray(raw)) throw new Error('JSON não contém uma lista de ativos');
      const limpos = raw.map((a) => ({
        id:        String(a.id),
        nome:      String(a.nome ?? a.id),
        classe:    a.classe,
        subclasse: a.subclasse,
        qty:       Number(a.qty) || 0,
        tipo:      a.tipo || 'b3',
        ticker:    a.ticker ?? null,
        precoMedio: Number(a.precoMedio) || 0,
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

  const classesPresentes = ['Todos', ...CLASSES.filter(c => ativos.some(a => a.classe === c))];
  const filtrada = valoresPorAtivo.filter(a => filtro === 'Todos' || a.classe === filtro);
  const ordenada = [...filtrada].sort((a, b) => b.valor - a.valor);

  // agrupa por classe (na ordem de CLASSES) quando ligado
  const grupos = agrupar
    ? CLASSES.map(c => ({ classe: c, itens: ordenada.filter(a => a.classe === c) })).filter(g => g.itens.length)
    : [{ classe: null, itens: ordenada }];

  const renderCard = (a) => {
    const cor     = COR(a.classe);
    const pctCart = totalGeral > 0 ? a.valor / totalGeral : 0;
    const qtyVal  = editQty[a.id] !== undefined ? editQty[a.id] : a.qty;
    const temPM   = a.precoMedio > 0 && a.preco > 0;
    const custo   = a.precoMedio * a.qty;
    const res     = temPM ? a.valor - custo : 0;
    const resPct  = custo > 0 ? res / custo : 0;
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <button onClick={() => (editId === a.id ? cancelEdit() : startEdit(a))}
              title="Editar classificação" aria-label="Editar ativo"
              style={{ background: 'none', border: 'none', color: editId === a.id ? 'var(--accent)' : 'var(--text-mute)', fontSize: 16, lineHeight: 1, padding: 4 }}>✎</button>
            <button onClick={() => { if (confirm(`Remover ${a.nome}?`)) removeAtivo(a.id); }}
              title="Remover" aria-label="Remover ativo"
              style={{ background: 'none', border: 'none', color: 'var(--text-mute)', fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--text-mute)', fontSize: 12 }}>Qtd</span>
            <input className="input num" type="number" inputMode="decimal" value={qtyVal}
              onChange={e => setEditQty(prev => ({ ...prev, [a.id]: e.target.value }))}
              onBlur={() => handleQtyBlur(a.id)}
              onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
              style={{ width: 110, minHeight: 40 }} />
          </label>
          <div className="num" style={{ textAlign: 'right' }}>
            {a.tipo === 'tesouro' && (
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-mute)', fontSize: 12 }}>PU R$</span>
                <input className="input num" type="number" inputMode="decimal" placeholder="0,00"
                  value={tesouroPrices[a.id] ?? ''}
                  onChange={e => setTesouroPrice(a.id, e.target.value)}
                  style={{ width: 100, minHeight: 38, textAlign: 'right' }} />
              </label>
            )}
            <div style={{ fontWeight: 700, color: a.valor > 0 ? 'var(--text)' : 'var(--text-mute)' }}>
              {a.valor > 0 ? fmt(a.valor) : '—'}
            </div>
            <div style={{ color: 'var(--text-mute)', fontSize: 12 }}>
              {a.tipo === 'tesouro'
                ? (a.valor > 0 ? fmtPct(pctCart) : 'informe o PU')
                : (a.preco > 0 ? `${fmt(a.preco)} · ${fmtPct(pctCart)}` : 'sem cotação')}
            </div>
          </div>
        </div>

        {temPM && (
          <div className="num" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: 13 }}>
            <span style={{ color: 'var(--text-mute)' }}>PM {fmt(a.precoMedio)}</span>
            <span style={{ color: res >= 0 ? 'var(--good)' : 'var(--bad)', fontWeight: 700 }}>
              {res >= 0 ? '+' : ''}{fmt(res)} ({res >= 0 ? '+' : ''}{fmtPct(resPct)})
            </span>
          </div>
        )}

        {/* edição de classificação (mover entre estratégias) */}
        {editId === a.id && editData && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ color: 'var(--text-mute)', fontSize: 12 }}>Nome</label>
                <input className="input" value={editData.nome}
                  onChange={e => setEditData(d => ({ ...d, nome: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ color: 'var(--text-mute)', fontSize: 12 }}>Ticker</label>
                <input className="input" value={editData.ticker} placeholder="(vazio = tesouro)"
                  onChange={e => setEditData(d => ({ ...d, ticker: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ color: 'var(--text-mute)', fontSize: 12 }}>Classe (alocação)</label>
                <select className="input" value={editData.classe} onChange={e => changeEditClasse(e.target.value)}>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ color: 'var(--text-mute)', fontSize: 12 }}>Subclasse</label>
                <select className="input" value={editData.subclasse}
                  onChange={e => setEditData(d => ({ ...d, subclasse: e.target.value }))}>
                  {(SUBCLASSES_MAP[editData.classe] || []).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ color: 'var(--text-mute)', fontSize: 12 }}>Tipo (cotação)</label>
                <select className="input" value={editData.tipo}
                  onChange={e => setEditData(d => ({ ...d, tipo: e.target.value }))}>
                  {TODOS_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ color: 'var(--text-mute)', fontSize: 12 }}>Preço médio</label>
                <input className="input num" type="number" inputMode="decimal" placeholder="0,00" value={editData.precoMedio}
                  onChange={e => setEditData(d => ({ ...d, precoMedio: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-primary" onClick={saveEdit} style={{ flex: 1 }}>Salvar</button>
              <button className="btn btn-sm btn-ghost" onClick={cancelEdit}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ margin: '4px 2px', fontSize: 15, color: 'var(--text-dim)' }}>
        Meus ativos <span style={{ color: 'var(--text-mute)' }}>· {ativos.length}</span>
      </h2>

      {/* ações */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-sm btn-primary" onClick={() => setShowForm(s => !s)}>{showForm ? '✕ Cancelar' : '+ Novo'}</button>
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
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ color: 'var(--text-mute)', fontSize: 12 }}>Preço médio (opcional)</label>
              <input className="input num" type="number" inputMode="decimal" placeholder="0,00" value={novo.precoMedio}
                onChange={e => setNovo(p => ({ ...p, precoMedio: e.target.value }))} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleAdd}>Adicionar</button>
        </div>
      )}

      {/* filtros */}
      {ativos.length > 0 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
            {classesPresentes.map(c => (
              <button key={c} onClick={() => setFiltro(c)}
                className="btn btn-sm btn-ghost"
                style={{ minHeight: 34, padding: '0 12px', fontSize: 13,
                  borderColor: filtro === c ? (c === 'Todos' ? 'var(--accent)' : COR(c)) : 'var(--border)',
                  color: filtro === c ? 'var(--text)' : 'var(--text-dim)',
                  background: filtro === c ? 'var(--surface-2)' : 'transparent' }}>
                {c}
              </button>
            ))}
          </div>
          <button onClick={() => setAgrupar(v => !v)} className="btn btn-sm btn-ghost"
            style={{ minHeight: 34, padding: '0 12px', fontSize: 13, borderColor: agrupar ? 'var(--accent)' : 'var(--border)', color: agrupar ? 'var(--text)' : 'var(--text-dim)' }}>
            {agrupar ? '▣ Agrupado' : '▢ Agrupar'}
          </button>
        </div>
      )}

      {/* estado vazio */}
      {ordenada.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 14 }}>
          {ativos.length === 0
            ? <>Nenhum ativo carregado. Toque em <strong style={{ color: 'var(--accent)' }}>⭱ Importar</strong> e escolha seu JSON, ou use <strong style={{ color: 'var(--accent)' }}>+ Novo</strong>.</>
            : <>Nenhum ativo em <strong>{filtro}</strong>.</>}
        </div>
      )}

      {/* lista (agrupada ou não) */}
      {grupos.map(g => (
        <div key={g.classe ?? 'todos'} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {g.classe && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '4px 2px 0', color: COR(g.classe), fontWeight: 700, fontSize: 13 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: COR(g.classe) }} />
              {g.classe} <span style={{ color: 'var(--text-mute)', fontWeight: 500 }}>· {g.itens.length}</span>
            </div>
          )}
          {g.itens.map(renderCard)}
        </div>
      ))}
    </section>
  );
}
