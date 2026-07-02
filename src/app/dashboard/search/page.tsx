'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, Card } from '@/components/ui';
import { Search as SearchIcon, FileText, Building2, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { fmtEur, fmtDate } from '@/lib/utils';

type Result =
  | { kind: 'invoice'; id: string; number: string; customer: string; total: number; date: string }
  | { kind: 'company'; id: string; name: string; ico: string | null }
  | { kind: 'contact'; id: string; name: string; ico: string | null; city: string | null };

function SearchInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get('q') || '';
  const [q, setQ] = useState(initialQ);
  const [filter, setFilter] = useState<'all' | 'invoice' | 'company' | 'contact'>('all');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    const sb = createClient();
    const like = `%${query.trim()}%`;
    const [inv, co, cn] = await Promise.all([
      filter === 'company' || filter === 'contact' ? Promise.resolve({ data: [] }) :
        sb.from('invoices').select('id, number, customer_name, total, issue_date').or(`number.ilike.${like},customer_name.ilike.${like},supplier_name.ilike.${like}`).is('deleted_at', null).limit(30),
      filter === 'invoice' || filter === 'contact' ? Promise.resolve({ data: [] }) :
        sb.from('companies').select('id, name, ico').or(`name.ilike.${like},ico.ilike.${like},dic.ilike.${like},ic_dph.ilike.${like}`).is('deleted_at', null).limit(30),
      filter === 'invoice' || filter === 'company' ? Promise.resolve({ data: [] }) :
        sb.from('contacts').select('id, name, ico, city').or(`name.ilike.${like},ico.ilike.${like},email.ilike.${like},city.ilike.${like}`).is('deleted_at', null).limit(30),
    ]);
    const rs: Result[] = [];
    (inv.data || []).forEach((i) => rs.push({ kind: 'invoice', id: i.id as string, number: i.number as string, customer: (i.customer_name as string) || '—', total: Number(i.total || 0), date: (i.issue_date as string) || '' }));
    (co.data || []).forEach((c) => rs.push({ kind: 'company', id: c.id as string, name: c.name as string, ico: (c.ico as string) || null }));
    (cn.data || []).forEach((c) => rs.push({ kind: 'contact', id: c.id as string, name: c.name as string, ico: (c.ico as string) || null, city: (c.city as string) || null }));
    setResults(rs);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    const t = setTimeout(() => search(q), 250);
    return () => clearTimeout(t);
  }, [q, filter, search]);

  useEffect(() => {
    if (initialQ) search(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateUrl(newQ: string) {
    const p = new URLSearchParams();
    if (newQ) p.set('q', newQ);
    router.replace(`/dashboard/search${p.toString() ? '?' + p.toString() : ''}`);
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <PageHeader title="Hľadanie" subtitle="Faktúry, firmy, zákazníci — fulltext" />

      <Card className="mb-4">
        <div className="p-5 space-y-3">
          <div className="relative">
            <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              autoFocus
              type="text"
              value={q}
              onChange={(e) => { setQ(e.target.value); updateUrl(e.target.value); }}
              placeholder="Hľadaj číslo FA, meno klienta, IČO, DIČ…"
              className="w-full bg-white border border-zinc-200 rounded-xl pl-11 pr-4 py-3 text-[15px] text-zinc-900 focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>
          <div className="flex gap-1.5">
            {(['all', 'invoice', 'company', 'contact'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium tracking-tight transition-colors ${
                  filter === f ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {f === 'all' ? 'Všetko' : f === 'invoice' ? 'Faktúry' : f === 'company' ? 'Firmy' : 'Zákazníci'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {loading && (
        <div className="text-center py-8 text-sm text-zinc-500">Hľadám…</div>
      )}

      {!loading && q.trim().length >= 2 && results.length === 0 && (
        <Card>
          <div className="p-10 text-center text-zinc-500 text-sm">
            Nič nenájdené pre <strong className="text-zinc-800">&quot;{q}&quot;</strong>.
          </div>
        </Card>
      )}

      {!loading && q.trim().length < 2 && (
        <Card>
          <div className="p-10 text-center text-zinc-500 text-sm">
            Začni písať aspoň 2 znaky.
          </div>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <div className="divide-y divide-zinc-100">
            {results.map((r) => {
              const href =
                r.kind === 'invoice' ? `/dashboard/invoices/${r.id}` :
                r.kind === 'company' ? `/dashboard/settings/companies/${r.id}` :
                `/dashboard/customers/${r.id}`;
              const Icon = r.kind === 'invoice' ? FileText : r.kind === 'company' ? Building2 : Users;
              return (
                <Link key={r.kind + r.id} href={href} className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 transition-colors group">
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-500 flex items-center justify-center flex-shrink-0">
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {r.kind === 'invoice' && (
                      <>
                        <div className="font-mono text-[13px] font-medium text-zinc-900 tracking-tight">{r.number}</div>
                        <div className="text-[12px] text-zinc-500 truncate mt-0.5">{r.customer}</div>
                      </>
                    )}
                    {r.kind === 'company' && (
                      <>
                        <div className="text-[14px] font-medium text-zinc-900 tracking-tight">{r.name}</div>
                        <div className="text-[12px] text-zinc-500 mt-0.5">IČO {r.ico || '—'}</div>
                      </>
                    )}
                    {r.kind === 'contact' && (
                      <>
                        <div className="text-[14px] font-medium text-zinc-900 tracking-tight">{r.name}</div>
                        <div className="text-[12px] text-zinc-500 mt-0.5">
                          {r.ico && <>IČO {r.ico}</>}
                          {r.ico && r.city && ' · '}
                          {r.city}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-3">
                    {r.kind === 'invoice' && (
                      <div>
                        <div className="text-[13px] font-mono font-semibold tabular-nums">{fmtEur(r.total)}</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">{fmtDate(r.date)}</div>
                      </div>
                    )}
                    <ArrowRight size={14} className="text-zinc-400 group-hover:text-zinc-900 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-500 text-sm">Načítavam…</div>}>
      <SearchInner />
    </Suspense>
  );
}
