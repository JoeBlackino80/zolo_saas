'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import { FileText, Plus, Search, CheckSquare, Square } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { fmtEur, fmtDate } from '@/lib/utils';

const TYPE_LABEL: Record<string, string> = { invoice: 'FA', received_invoice: 'PFA', proforma: 'ZF', credit_note: 'DOB', storno: 'STO', delivery_note: 'DL', quote: 'CP', cash_receipt: 'PPD' };
const STATUS_BADGE: Record<string, 'gray' | 'green' | 'red' | 'amber' | 'blue'> = { draft: 'gray', issued: 'blue', sent: 'blue', paid: 'green', partially_paid: 'amber', overdue: 'red', cancelled: 'gray' };

type Row = { id: string; type: string; number: string; customer_name: string | null; issue_date: string; delivery_date: string | null; due_date: string; total: number; paid_amount: number | null; status: string; currency: string };

export default function InvoicesListClient({ invoices }: { invoices: Row[] }) {
  const toast = useToast();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<{ q: string; type: string; status: string }>({ q: '', type: 'all', status: 'all' });
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => invoices.filter((i) => {
    if (filter.type !== 'all' && i.type !== filter.type) return false;
    if (filter.status !== 'all' && i.status !== filter.status) return false;
    if (filter.q.trim()) {
      const q = filter.q.toLowerCase();
      if (!(i.number.toLowerCase().includes(q) || (i.customer_name || '').toLowerCase().includes(q))) return false;
    }
    return true;
  }), [invoices, filter]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }
  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((i) => i.id)));
  }

  async function markPaidBulk() {
    if (!confirm(`Označiť ${selected.size} faktúr ako zaplatené?`)) return;
    setBusy(true);
    const sb = createClient();
    const ids = Array.from(selected);
    // Need each row's total to set paid_amount
    const toUpdate = invoices.filter((i) => selected.has(i.id));
    let ok = 0;
    for (const inv of toUpdate) {
      const { error } = await sb.from('invoices').update({ paid_amount: Number(inv.total), status: 'paid' }).eq('id', inv.id);
      if (!error) {
        await sb.from('invoice_payments').insert([{ invoice_id: inv.id, payment_date: new Date().toISOString().slice(0, 10), amount: Number(inv.total), payment_method: 'manual', notes: 'Bulk mark paid' }]);
        ok++;
      }
    }
    setBusy(false);
    setSelected(new Set());
    toast(`${ok}/${ids.length} faktúr označených ako zaplatené`, ok === ids.length ? 'success' : 'error');
    router.refresh();
  }

  async function deleteBulk() {
    if (!confirm(`Vymazať ${selected.size} faktúr? (soft-delete, vrátiteľné z auditu)`)) return;
    setBusy(true);
    const sb = createClient();
    const ids = Array.from(selected);
    const { error } = await sb.from('invoices').update({ deleted_at: new Date().toISOString() }).in('id', ids);
    setBusy(false);
    setSelected(new Set());
    if (error) toast(error.message, 'error');
    else { toast(`${ids.length} faktúr vymazaných`, 'success'); router.refresh(); }
  }

  const allTypes = Array.from(new Set(invoices.map((i) => i.type)));
  const allStatuses = Array.from(new Set(invoices.map((i) => i.status)));

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} placeholder="Hľadaj číslo alebo zákazníka…" className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <select value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="all">Všetky typy</option>
          {allTypes.map((t) => <option key={t} value={t}>{TYPE_LABEL[t] || t}</option>)}
        </select>
        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="all">Všetky stavy</option>
          {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg">
            <span className="text-xs text-blue-700 font-semibold">{selected.size} vybratých</span>
            <Button variant="secondary" onClick={markPaidBulk} disabled={busy}>Označiť zaplatené</Button>
            <Button variant="ghost" onClick={deleteBulk} disabled={busy}>Vymazať</Button>
          </div>
        )}
      </div>

      <Card>
        {!filtered.length ? (
          <EmptyState icon={<FileText size={24} />} title="Žiadne výsledky" description={filter.q || filter.type !== 'all' || filter.status !== 'all' ? 'Skús zmeniť filter' : 'Vystav prvú faktúru.'} action={!filter.q && filter.type === 'all' && filter.status === 'all' ? <Link href="/dashboard/invoices/new"><Button variant="primary"><Plus size={14} /> Vystaviť doklad</Button></Link> : undefined} />
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-4 py-3 w-8 text-center">
                    <button onClick={toggleAll} className="inline-flex">
                      {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare size={14} className="text-blue-600" /> : <Square size={14} className="text-slate-400" />}
                    </button>
                  </th>
                  <th className="text-left px-3 py-3">Typ</th>
                  <th className="text-left px-3 py-3">Číslo</th>
                  <th className="text-left px-3 py-3">Odberateľ</th>
                  <th className="text-right px-3 py-3">Suma</th>
                  <th className="text-center px-3 py-3">Vystavená</th>
                  <th className="text-center px-3 py-3">DZP</th>
                  <th className="text-center px-3 py-3">Splatná</th>
                  <th className="text-center px-3 py-3">Stav</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((i) => (
                  <tr key={i.id} className={`hover:bg-slate-50 transition ${selected.has(i.id) ? 'bg-blue-50/40' : ''}`}>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggle(i.id)} className="inline-flex">
                        {selected.has(i.id) ? <CheckSquare size={14} className="text-blue-600" /> : <Square size={14} className="text-slate-400" />}
                      </button>
                    </td>
                    <td className="px-3 py-3"><Link href={`/dashboard/invoices/${i.id}`}><Badge variant="blue">{TYPE_LABEL[i.type] || i.type}</Badge></Link></td>
                    <td className="px-3 py-3"><Link href={`/dashboard/invoices/${i.id}`} className="font-mono text-xs font-medium text-blue-600 hover:underline">{i.number}</Link></td>
                    <td className="px-3 py-3 text-slate-700">{i.customer_name || '—'}</td>
                    <td className="px-3 py-3 text-right font-mono text-slate-900 font-medium">{fmtEur(Number(i.total || 0))}</td>
                    <td className="px-3 py-3 text-center font-mono text-xs text-slate-600">{fmtDate(i.issue_date)}</td>
                    <td className="px-3 py-3 text-center font-mono text-xs text-slate-600">{fmtDate(i.delivery_date || i.issue_date)}</td>
                    <td className="px-3 py-3 text-center font-mono text-xs text-slate-600">{fmtDate(i.due_date)}</td>
                    <td className="px-3 py-3 text-center"><Badge variant={STATUS_BADGE[i.status] || 'gray'}>{i.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
