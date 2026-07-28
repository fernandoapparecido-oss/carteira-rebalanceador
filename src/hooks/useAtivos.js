import { useState, useCallback } from 'react';
import { ATIVOS as BASE } from '../data/ativos';

const LS_KEY = 'carteira-ativos-v1';

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function save(ativos) {
  localStorage.setItem(LS_KEY, JSON.stringify(ativos));
}

export default function useAtivos() {
  const [ativos, setAtivos] = useState(() => load() ?? BASE);

  const updateQty = useCallback((id, novaQty) => {
    setAtivos(prev => {
      const next = prev.map(a => a.id === id ? { ...a, qty: Number(novaQty) } : a);
      save(next);
      return next;
    });
  }, []);

  const addAtivo = useCallback((ativo) => {
    setAtivos(prev => {
      const next = [...prev, ativo];
      save(next);
      return next;
    });
  }, []);

  const removeAtivo = useCallback((id) => {
    setAtivos(prev => {
      const next = prev.filter(a => a.id !== id);
      save(next);
      return next;
    });
  }, []);

  const resetAtivos = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    setAtivos(BASE);
  }, []);

  // Substitui toda a carteira (usado pela importação de JSON)
  const importAtivos = useCallback((lista) => {
    save(lista);
    setAtivos(lista);
  }, []);

  return { ativos, updateQty, addAtivo, removeAtivo, resetAtivos, importAtivos };
}
