'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, Field, Input, Button, Badge } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { fmtEur, fmtDate } from '@/lib/utils';
import { Plus, Loader2, Check } from 'lucide-react';

type Inst = { id: string; position: number; due_date: string; amount: number; paid_amount: number; status: string };

export default function InstallmentsSection({ invoiceId, companyId, total }: { invoiceId: string; companyId: string; total: number }) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<Inst[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [parts, setParts] = useState(3);
  const [firstDue, setFirstDue] = useState(new Date().toISOString().slice(0, 10));
  const [intervalDays, setIntervalDays] = useState(30);
  const [busy, setBusy] = useState(false);

  async function load() {
    const sb = createClient();
    const { data } = await sb.from('invoice_installments').select('id, position, due_date, amount, paid_amount, status').eq('invoice_id', invoiceId).order('position');
    setRows((data as Inst[]) || []);
  }
  useEffect(() => { load(); }, [invoiceId]);

  async function generate() {
    if (parts < 2) { toast('Aspoň 2 splátky', 'error'); return; }
    setBusy(true);
    const sb = createClient();
    const per = +(total / parts).toFixed(2);
    const last = +(total - per * (parts - 1)).toFixed(2);
    const installments = Array.from({ length: parts }, (_, i) => {
      const d = new Date(firstDue);
      d.setDate(d.getDate() + i * intervalDays);
      return {
        company_id: companyId,
        invoice_id: invoiceId,
        position: i + 1,
        due_date: d.toISOString().slice(0, 10),
        amount: i === parts - 1 ? last : per,
        paid_amount: 0,
        status: 'scheduled',
      };
    });
    const { error } = await sb.from('invoice_installments').insert(installments);
    setBusy(false);
    if (error) { toast(error.message, 'error'); return; }
    toast(`${parts} splátok vytvorených`, 'success');
    setShowCreate(false);
    load();
  }

  async function markInstallmentPaid(inst: Inst) {
    if (!confirm(`Označiť splátku #${inst.position} (${fmtEur(inst.amount)}) ako zaplatenú?`)) return;
    setBusy(true);
    const sb = createClient();
    const { data: payId, error: payErr } = await sb.rpc('mark_invoice_paid', {
      p_invoice_id: invoiceId,
      p_amount: inst.amount - inst.paid_amount,
      p_method: 'bank',
      p_notes: `Splátka #${inst.position} k ${inst.due_date}`,
    });
    if (payErr) { setBusy(false); toast(payErr.message, 'error'); return; }
    await sb.from('invoice_installments').update({
      paid_amount: inst.amount,
      status: 'paid',
      invoice_payment_id: payId,
      updated_at: new Date().toISOString(),
    }).eq('id', inst.id);
    setBusy(false);
    toast('Splátka zaúčtovaná', 'success');
    load();
    router.refresh();
  }

  const totalPaid = rows.reduce((s, r) => s + Number(r.paid_amount || 0), 0);
  const totalDue = rows.reduce((s, r) => s + Number(r.amount || 0), 0);

  if (rows.length === 0 && !showCreate) {
    return (
      <Card className="mb-4">
        <div className="p-5 flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">Splátkový kalendár</div>
            <div className="text-xs text-zinc-500 mt-0.5">Rozdeliť úhradu FA na viac splátok</div>
          </div>
          <Button variant="secondary" onClick={() => setShowCreate(true)}><Plus size={14} /> Vytvoriť splátky</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader title="Splátkový kalendár" subtitle={rows.length ? `${fmtEur(totalPaid)} / ${fmtEur(totalDue)} uhradené` : 'Generovať plán'} />
      {showCreate && (
        <div className="p-5 border-b border-zinc-100 bg-zinc-50 grid sm:grid-cols-4 gap-3 items-end">
          <Field label="Počet splátok">
            <Input type="number" min="2" value={parts} onChange={(e) => setParts(parseInt(e.target.value, 10) || 2)} />
          </Field>
          <Field label="Prvá splatnosť">
            <Input type="date" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} />
          </Field>
          <Field label="Interval (dni)">
            <Input type="number" min="1" value={intervalDays} onChange={(e) => setIntervalDays(parseInt(e.target.value, 10) || 30)} />
          </Field>
          <Button variant="primary" onClick={generate} disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : null} Vygenerovať</Button>
        </div>
      )}
      {rows.length > 0 && (
        <div className="divide-y divide-zinc-100">
          {rows.map((r) => (
            <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-zinc-500 text-xs">#{r.position}</span>
                <span className="text-sm">{fmtDate(r.due_date)}</span>
                <Badge variant={r.status === 'paid' ? 'green' : new Date(r.due_date) < new Date() ? 'red' : 'amber'}>
                  {r.status === 'paid' ? 'Zaplatené' : new Date(r.due_date) < new Date() ? 'Po splatnosti' : 'Otvorené'}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono">{fmtEur(r.amount)}</span>
                {r.status !== 'paid' && (
                  <button onClick={() => markInstallmentPaid(r)} disabled={busy} className="text-xs text-zinc-600 hover:text-zinc-900 px-2 py-1 border border-zinc-200 rounded">
                    <Check size={12} className="inline" /> Zaplatiť
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
