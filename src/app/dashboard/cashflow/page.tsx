import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardHeader } from '@/components/ui';
import { fmtEur, fmtDate } from '@/lib/utils';

export default async function CashflowPage() {
  const sb = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 90);

  const { data: receivables } = await sb
    .from('invoices')
    .select('id, total, paid_amount, due_date, customer_name')
    .eq('type', 'invoice')
    .neq('status', 'paid')
    .lte('due_date', horizon.toISOString().slice(0, 10))
    .is('deleted_at', null);

  const { data: payables } = await sb
    .from('invoices')
    .select('id, total, paid_amount, due_date, supplier_name')
    .eq('type', 'received_invoice')
    .neq('status', 'paid')
    .lte('due_date', horizon.toISOString().slice(0, 10))
    .is('deleted_at', null);

  type Inv = { id: string; total: number; paid_amount: number | null; due_date: string };
  const recRows = (receivables || []) as Inv[];
  const payRows = (payables || []) as Inv[];

  // Bucket by week (W1, W2, ...)
  const buckets: Record<string, { income: number; outflow: number; net: number; label: string }> = {};
  for (let w = 0; w < 13; w++) {
    const start = new Date(today);
    start.setDate(today.getDate() + w * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const key = `W${w + 1}`;
    buckets[key] = { income: 0, outflow: 0, net: 0, label: `${fmtDate(start.toISOString())}` };
  }

  const weekIdx = (dateStr: string) => {
    const d = new Date(dateStr);
    const days = Math.floor((d.getTime() - today.getTime()) / 86400000);
    return Math.floor(days / 7);
  };

  recRows.forEach((r) => {
    const w = weekIdx(r.due_date);
    if (w < 0 || w >= 13) return;
    buckets[`W${w + 1}`].income += Number(r.total) - Number(r.paid_amount || 0);
  });
  payRows.forEach((r) => {
    const w = weekIdx(r.due_date);
    if (w < 0 || w >= 13) return;
    buckets[`W${w + 1}`].outflow += Number(r.total) - Number(r.paid_amount || 0);
  });
  Object.keys(buckets).forEach((k) => buckets[k].net = buckets[k].income - buckets[k].outflow);

  const totalIncome = Object.values(buckets).reduce((s, b) => s + b.income, 0);
  const totalOutflow = Object.values(buckets).reduce((s, b) => s + b.outflow, 0);
  const totalNet = totalIncome - totalOutflow;
  const maxVal = Math.max(...Object.values(buckets).map((b) => Math.max(b.income, b.outflow)), 1);

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader title="Cash flow forecast" subtitle="Predikcia hotovostných tokov 13 týždňov (90 dní)" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><div className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Očakávaný príjem</div>
          <div className="text-2xl font-bold mt-2 text-emerald-600">{fmtEur(totalIncome)}</div>
          <div className="text-xs text-slate-500 mt-1">{recRows.length} pohľadávok</div>
        </div></Card>
        <Card><div className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Očakávaný odtok</div>
          <div className="text-2xl font-bold mt-2 text-red-600">{fmtEur(totalOutflow)}</div>
          <div className="text-xs text-slate-500 mt-1">{payRows.length} záväzkov</div>
        </div></Card>
        <Card><div className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Net hotovosť</div>
          <div className={`text-2xl font-bold mt-2 ${totalNet >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtEur(totalNet)}</div>
          <div className="text-xs text-slate-500 mt-1">za 90 dní</div>
        </div></Card>
      </div>

      <Card>
        <CardHeader title="Týždenná projekcia (13 týždňov)" />
        <div className="p-5">
          <div className="grid grid-cols-13 gap-1.5">
            {Object.entries(buckets).map(([k, b]) => (
              <div key={k} className="flex flex-col items-center text-center" style={{ gridColumn: 'span 1' }}>
                <div className="text-[9px] text-slate-500 mb-1">{k}</div>
                <div className="flex-1 w-full min-h-[180px] flex flex-col items-stretch justify-end gap-1">
                  <div
                    className="bg-emerald-500 rounded-t"
                    style={{ height: `${(b.income / maxVal) * 120}px` }}
                    title={`Príjem: ${fmtEur(b.income)}`}
                  />
                  <div
                    className="bg-red-500 rounded-b"
                    style={{ height: `${(b.outflow / maxVal) * 120}px` }}
                    title={`Odtok: ${fmtEur(b.outflow)}`}
                  />
                </div>
                <div className={`text-[9px] mt-1 font-mono font-bold ${b.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{b.net >= 0 ? '+' : ''}{Math.round(b.net)}</div>
                <div className="text-[8px] text-slate-400 mt-0.5">{b.label}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-6 text-xs">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded" /> Príjem (pohľadávky)</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded" /> Odtok (záväzky)</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
