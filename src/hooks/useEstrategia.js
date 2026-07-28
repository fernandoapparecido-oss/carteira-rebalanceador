import { useState, useCallback } from 'react';
import { MACRO, SUB_METAS } from '../data/estrategia';

const LS_KEY = 'carteira-metas-v1';

function defaults() {
  const macro = {};
  for (const [c, { meta }] of Object.entries(MACRO)) macro[c] = meta;
  const sub = {};
  for (const [c, subs] of Object.entries(SUB_METAS)) {
    sub[c] = {};
    for (const [s, { meta }] of Object.entries(subs)) sub[c][s] = meta;
  }
  return { macro, sub };
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// Mescla os defaults com o salvo, para não perder classes/subclasses novas
function init() {
  const d = defaults();
  const l = load();
  if (!l) return d;
  const macro = { ...d.macro, ...(l.macro || {}) };
  const sub = {};
  for (const c of Object.keys(d.sub)) sub[c] = { ...d.sub[c], ...((l.sub && l.sub[c]) || {}) };
  return { macro, sub };
}

export default function useEstrategia() {
  const [metas, setMetas] = useState(init);

  // percentuais entram como 0–100 e são guardados como fração 0–1
  const updateMacro = useCallback((classe, pct) => {
    setMetas(prev => {
      const m = { ...prev, macro: { ...prev.macro, [classe]: (Number(pct) || 0) / 100 } };
      localStorage.setItem(LS_KEY, JSON.stringify(m));
      return m;
    });
  }, []);

  const updateSub = useCallback((classe, sub, pct) => {
    setMetas(prev => {
      const m = { ...prev, sub: { ...prev.sub, [classe]: { ...prev.sub[classe], [sub]: (Number(pct) || 0) / 100 } } };
      localStorage.setItem(LS_KEY, JSON.stringify(m));
      return m;
    });
  }, []);

  const resetMetas = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    setMetas(defaults());
  }, []);

  const macroSoma = Object.values(metas.macro).reduce((s, v) => s + v, 0);

  return { macro: metas.macro, sub: metas.sub, updateMacro, updateSub, resetMetas, macroSoma };
}
