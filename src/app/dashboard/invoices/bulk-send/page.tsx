'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { PageHeader, Card, Button, Badge } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { fmtEur, fmtDate } from '@/lib/utils';

type Inv = { id: string; number: string; total: number; due_date: string; customer_name: string | null; customer_email: string | null; sent_at: string | null };

export default function BulkSendPage() {
  const toast = useToast();
  const [invs, setInvs] = useState<Inv[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState({ ok: 0, fail: 0 });

  async function load() {
    const sb = createClient();
    const { data } = await sb
      .from('invoices')
      .select('id, number, total, due_date, customer_name, customer_email, sent_at')
      .eq('type', 'invoice')
      .neq('status', 'paid')
      .is('deleted_at', null)
      .order('issue_date', { ascending: false })
      .limit(200);
    setInvs((data as Inv[]) || []);
  }
  useEffect(() => { load(); }, []);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }
  function selectAllWithEmail() {
    setSelected(new Set(invs.filter((i) => i.customer_email).map((i) => i.id)));
  }

  async function sendAll() {
    const toSend = invs.filter((i) => selected.has(i.id) && i.customer_email);
    if (toSend.length === 0) { toast('Označ FA s emailom', 'error'); return; }
    if (!confirm(`Odoslať ${toSend.length} FA mailom? Každá s PDF prílohou.`)) return;
    setWorking(true);
    setProgress({ ok: 0, fail: 0 });
    for (const inv of toSend) {
      try {
        const r = await fetch('/api/send-invoice', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceId: inv.id,
            to: inv.customer_email,
            subject: `Faktúra ${inv.number}`,
            body: `Dobrý deň,\n\nv prílohe Vám posielame faktúru ${inv.number} v sume ${fmtEur(inv.total)} so splatnosťou ${fmtDate(inv.due_date)}.\n\nĎakujeme,`,
          }),
        });
        if (r.ok) setProgress((p) => ({ ...p, ok: p.ok + 1 }));
        else setProgress((p) => ({ ...p, fail: p.fail + 1 }));
      } catch {
        setProgress((p) => ({ ...p, fail: p.fail + 1 }));
      }
    }
    setWorking(false);
    toast(`Odoslaných ${progress.ok + 1} z ${toSend.length}`, 'success');
    setSelected(new Set());
    load();
  }

  const withEmail = invs.filter((i) => i.customer_email).length;
  const withoutEmail = invs.length - withEmail;

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <PageHeader back={{ href: "/dashboard/invoices" }} title="Hromadné odoslanie faktúr" subtitle={`${invs.length} otvorených · ${withEmail} s emailom · ${withoutEmail} bez emailu`} />

      <Card>
        <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
          <div className="text-sm font-semibold">{selected.size} označených</div>
          <div className="flex gap-2 items-center">
            {working && <span className="text-xs text-zinc-500">{progress.ok} ✓ · {progress.fail} ✗</span>}
            <Button variant="ghost" onClick={selectAllWithEmail}>Vybrať všetky s emailom</Button>
            <Button variant="primary" onClick={sendAll} disabled={working || selected.size === 0}>
              {working ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Odoslať
            </Button>
          </div>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 sticky top-0">
              <tr className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                <th className="text-center px-3 py-3 w-8"></th>
                <th className="text-left px-3 py-3">Číslo</th>
                <th className="text-left px-3 py-3">Zákazník</th>
                <th className="text-left px-3 py-3">Email</th>
                <th className="text-center px-3 py-3">Splatnosť</th>
                <th className="text-right px-3 py-3">Suma</th>
                <th className="text-center px-3 py-3">Naposledy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {invs.map((i) => (
                <tr key={i.id} className={selected.has(i.id) ? 'bg-zinc-50/50' : !i.customer_email ? 'opacity-50' : ''}>
                  <td className="text-center px-3 py-2"><input type="checkbox" disabled={!i.customer_email} checked={selected.has(i.id)} onChange={() => toggle(i.id)} /></td>
                  <td className="px-3 py-2 font-mono">{i.number}</td>
                  <td className="px-3 py-2">{i.customer_name || '—'}</td>
                  <td className="px-3 py-2 text-xs">{i.customer_email || <span className="text-red-600">chýba</span>}</td>
                  <td className="px-3 py-2 text-center text-xs">{fmtDate(i.due_date)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtEur(Number(i.total))}</td>
                  <td className="px-3 py-2 text-center text-xs">{i.sent_at ? <Badge variant="green">odoslané</Badge> : <span className="text-zinc-400">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
