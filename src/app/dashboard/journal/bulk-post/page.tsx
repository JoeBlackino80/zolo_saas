'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Zap, Loader2 } from 'lucide-react';
import { PageHeader, Card, Button, Badge } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { fmtEur, fmtDate } from '@/lib/utils';

type Inv = { id: string; number: string; type: string; issue_date: string; total: number; customer_name: string | null; supplier_name: string | null };

export default function BulkPostPage() {
  const router = useRouter();
  const toast = useToast();
  const [unposted, setUnposted] = useState<Inv[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const sb = createClient();
    // Find invoices without a corresponding journal entry
    const { data: jeIds } = await sb.from('journal_entries').select('source_invoice_id').not('source_invoice_id', 'is', null);
    const postedIds = new Set(((jeIds || []) as { source_invoice_id: string }[]).map((j) => j.source_invoice_id));
    const { data: invs } = await sb
      .from('invoices')
      .select('id, number, type, issue_date, total, customer_name, supplier_name')
      .in('type', ['invoice', 'credit_note', 'received_invoice', 'storno', 'debit_note'])
      .is('deleted_at', null)
      .order('issue_date', { ascending: false })
      .limit(500);
    setUnposted(((invs as Inv[]) || []).filter((i) => !postedIds.has(i.id)));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }
  function selectAll() { setSelected(new Set(unposted.map((i) => i.id))); }

  async function run() {
    if (selected.size === 0) { toast('Označ doklady', 'error'); return; }
    if (!confirm(`Spustiť auto-zaúčtovanie pre ${selected.size} dokladov?`)) return;
    setWorking(true);
    const sb = createClient();
    let ok = 0, errs = 0;
    for (const id of selected) {
      const { error } = await sb.rpc('post_invoice_journal', { p_invoice_id: id, p_event: 'issue' });
      if (error) errs++;
      else ok++;
      // Also stock if applicable (silent fail)
      try { await sb.rpc('post_invoice_stock', { p_invoice_id: id }); } catch { /* ignore */ }
    }
    setWorking(false);
    toast(`Zaúčtovaných ${ok}${errs ? ` · ${errs} chýb` : ''}`, errs > 0 ? 'error' : 'success');
    setSelected(new Set());
    load();
    router.refresh();
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <PageHeader back={{ href: "/dashboard/journal" }} title="Hromadné rozúčtovanie" subtitle="Doklady bez denníkového zápisu — hromadne spusti auto-posting" />

      {loading ? (
        <Card><div className="p-10 text-center text-zinc-500"><Loader2 size={20} className="animate-spin mx-auto mb-2" /> Načítavam…</div></Card>
      ) : unposted.length === 0 ? (
        <Card>
          <div className="p-10 text-center">
            <div className="text-emerald-700 font-semibold">Všetky doklady sú zaúčtované ✓</div>
            <div className="text-xs text-zinc-500 mt-2">Nové FA / PFA / dobropisy sa už účtujú automaticky pri vytvorení.</div>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
            <div className="text-sm font-semibold">{unposted.length} nerozúčtovaných · {selected.size} označených</div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={selectAll}>Označiť všetky</Button>
              <Button variant="primary" onClick={run} disabled={working || selected.size === 0}>
                {working ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Spustiť ({selected.size})
              </Button>
            </div>
          </div>
          <div className="overflow-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 sticky top-0">
                <tr className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                  <th className="text-center px-3 py-3 w-8"></th>
                  <th className="text-left px-3 py-3">Číslo</th>
                  <th className="text-left px-3 py-3">Typ</th>
                  <th className="text-left px-3 py-3">Partner</th>
                  <th className="text-center px-3 py-3">Dátum</th>
                  <th className="text-right px-3 py-3">Suma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {unposted.map((i) => (
                  <tr key={i.id} className={selected.has(i.id) ? 'bg-zinc-50/50' : ''}>
                    <td className="text-center px-3 py-2"><input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} /></td>
                    <td className="px-3 py-2 font-mono"><Link href={`/dashboard/invoices/${i.id}`} className="hover:underline">{i.number}</Link></td>
                    <td className="px-3 py-2"><Badge variant={i.type === 'received_invoice' ? 'blue' : 'gray'}>{i.type}</Badge></td>
                    <td className="px-3 py-2">{i.customer_name || i.supplier_name || '—'}</td>
                    <td className="px-3 py-2 text-center font-mono text-xs">{fmtDate(i.issue_date)}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtEur(Number(i.total || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
