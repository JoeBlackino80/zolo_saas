'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { Check, AlertCircle, X } from 'lucide-react';

type Toast = { id: number; msg: string; kind: 'success' | 'error' | 'info' };

const ToastCtx = createContext<{ toast: (msg: string, kind?: Toast['kind']) => void }>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((msg: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg text-sm font-medium border max-w-sm ${
              t.kind === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : t.kind === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            {t.kind === 'success' ? <Check size={16} /> : t.kind === 'error' ? <AlertCircle size={16} /> : null}
            <span className="flex-1">{t.msg}</span>
            <button onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}>
              <X size={14} className="opacity-60 hover:opacity-100" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx).toast;
}
