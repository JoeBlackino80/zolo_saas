'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Search, FileText, Building2, Users } from 'lucide-react';

type Result = { type: 'company' | 'invoice' | 'contact'; id: string; title: string; subtitle: string; href: string };

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [focused, setFocused] = useState(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open || !query.trim() || query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const sb = createClient();
      const q = query.trim();
      const like = `%${q}%`;
      const [companies, invoices, contacts] = await Promise.all([
        sb.from('companies').select('id, name, ico').or(`name.ilike.${like},ico.ilike.${like}`).is('deleted_at', null).limit(5),
        sb.from('invoices').select('id, number, customer_name, total').or(`number.ilike.${like},customer_name.ilike.${like}`).is('deleted_at', null).limit(5),
        sb.from('contacts').select('id, name, ico').or(`name.ilike.${like},ico.ilike.${like}`).is('deleted_at', null).limit(5),
      ]);
      const rs: Result[] = [];
      (companies.data || []).forEach((c) => rs.push({ type: 'company', id: c.id, title: c.name, subtitle: `IČO ${c.ico || '—'}`, href: `/dashboard/settings/companies/${c.id}` }));
      (invoices.data || []).forEach((i) => rs.push({ type: 'invoice', id: i.id, title: i.number, subtitle: i.customer_name || '—', href: `/dashboard/invoices/${i.id}` }));
      (contacts.data || []).forEach((c) => rs.push({ type: 'contact', id: c.id, title: c.name, subtitle: `IČO ${c.ico || '—'}`, href: `/dashboard/customers` }));
      setResults(rs);
      setFocused(0);
    }, 200);
    return () => clearTimeout(t);
  }, [query, open]);

  function pick(r: Result) {
    setOpen(false);
    setQuery('');
    router.push(r.href);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-32" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <Search size={18} className="text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') setFocused((f) => Math.min(f + 1, results.length - 1));
              if (e.key === 'ArrowUp') setFocused((f) => Math.max(0, f - 1));
              if (e.key === 'Enter' && results[focused]) pick(results[focused]);
            }}
            placeholder="Hľadať firmy, faktúry, zákazníkov…"
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 placeholder-slate-400"
          />
          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded font-mono">ESC</span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {query.length < 2 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">Začni písať pre hľadanie…</div>
          ) : results.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">Nič nenájdené</div>
          ) : (
            results.map((r, i) => {
              const Icon = r.type === 'company' ? Building2 : r.type === 'invoice' ? FileText : Users;
              return (
                <button
                  key={r.type + r.id}
                  onClick={() => pick(r)}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-left text-sm hover:bg-slate-50 transition ${i === focused ? 'bg-slate-50' : ''}`}
                >
                  <Icon size={16} className="text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">{r.title}</div>
                    <div className="text-xs text-slate-500 truncate">{r.subtitle}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
