import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardHeader, Badge, EmptyState } from '@/components/ui';
import { Check } from 'lucide-react';
import { fmtEur, fmtDate } from '@/lib/utils';

export default async function ReceivablesPage() {
  const sb = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: unpaid } = await sb
    .from('invoices')
    .select('id, number, customer_name, issue_date, due_date, total, paid_amount, status, companies(name)')
    .is('deleted_at', null)
    .in('type', ['invoice'])
    .in('status', ['issued', 'sent', 'partially_paid', 'overdue'])
    .order('due_date', { ascending: true });

  type RawCompany = { name: string };
  type Row = {
    id: string; number: string; customer_name: string | null; issue_date: string; due_date: string;
    total: number; paid_amount: number; status: string; companies: RawCompany | RawCompany[] | null;
  };
  const rows = (unpaid || []) as Row[];

  const buckets = { current: [] as Row[], d30: [] as Row[], d60: [] as Row[], d90: [] as Row[], d90plus: [] as Row[] };
  for (const r of rows) {
    const due = new Date(r.due_date);
    const overdue = Math.floor((today.getTime() - due.getTime()) / 86400000);
    if (overdue < 0) buckets.current.push(r);
    else if (overdue <= 30) buckets.d30.push(r);
    else if (overdue <= 60) buckets.d60.push(r);
    else if (overdue <= 90) buckets.d90.push(r);
    else buckets.d90plus.push(r);
  }
  const sum = (arr: Row[]) => arr.reduce((s, x) => s + (Number(x.total) - Number(x.paid_amount || 0)), 0);
  const total = sum(rows);
  const overdueSum = sum([...buckets.d30, ...buckets.d60, ...buckets.d90, ...buckets.d90plus]);

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader title="Pohľadávky" subtitle={`${rows.length} nezaplatených faktúr · ${fmtEur(total)} celkom`} />

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Check size={28} className="text-emerald-500" />}
            title="Všetko zaplatené"
            description="Neexistujú nezaplatené faktúry. Vstávaš s úsmevom."
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Kpi label="Spolu" value={fmtEur(total)} note={`${rows.length} faktúr`} />
            <Kpi label="Po splatnosti" value={fmtEur(overdueSum)} note={`${rows.length - buckets.current.length} faktúr`} variant="red" />
            <Kpi label=">90 dní" value={fmtEur(sum(buckets.d90plus))} note={`${buckets.d90plus.length} faktúr · možný odpis`} variant="amber" />
            <Kpi label="V splatnosti" value={fmtEur(sum(buckets.current))} note={`${buckets.current.length} faktúr`} variant="green" />
          </div>

          <Card>
            <CardHeader title="Aging buckets — pohľadávky" />
            <div className="grid grid-cols-5 gap-px bg-slate-100">
              <Bucket label="V splatnosti" count={buckets.current.length} amount={sum(buckets.current)} variant="green" />
              <Bucket label="1-30 dní" count={buckets.d30.length} amount={sum(buckets.d30)} variant="amber" />
              <Bucket label="31-60 dní" count={buckets.d60.length} amount={sum(buckets.d60)} variant="amber" />
              <Bucket label="61-90 dní" count={buckets.d90.length} amount={sum(buckets.d90)} variant="red" />
              <Bucket label=">90 dní" count={buckets.d90plus.length} amount={sum(buckets.d90plus)} variant="red" />
            </div>
          </Card>

          <Card className="mt-4">
            <CardHeader title="Detail nezaplatených faktúr" />
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    <th className="text-left px-5 py-3">Firma</th>
                    <th className="text-left px-3 py-3">FA</th>
                    <th className="text-left px-3 py-3">Zákazník</th>
                    <th className="text-center px-3 py-3">Splatnosť</th>
                    <th className="text-center px-3 py-3">Po splatnosti</th>
                    <th className="text-right px-5 py-3">Suma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => {
                    const overdue = Math.floor((today.getTime() - new Date(r.due_date).getTime()) / 86400000);
                    const remaining = Number(r.total) - Number(r.paid_amount || 0);
                    const companyName = Array.isArray(r.companies) ? r.companies[0]?.name : r.companies?.name;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 text-slate-700 text-sm">{companyName || '—'}</td>
                        <td className="px-3 py-3 font-mono text-xs">{r.number}</td>
                        <td className="px-3 py-3 text-slate-700">{r.customer_name || '—'}</td>
                        <td className="px-3 py-3 text-center font-mono text-xs">{fmtDate(r.due_date)}</td>
                        <td className="px-3 py-3 text-center">
                          {overdue > 0 ? (
                            <Badge variant={overdue > 90 ? 'red' : overdue > 30 ? 'amber' : 'gray'}>
                              {overdue} dní
                            </Badge>
                          ) : (
                            <span className="text-emerald-600 text-xs">v splatnosti</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-medium">{fmtEur(remaining)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, note, variant }: { label: string; value: string; note: string; variant?: 'red' | 'green' | 'amber' }) {
  const color = variant === 'red' ? 'text-red-600' : variant === 'green' ? 'text-emerald-600' : variant === 'amber' ? 'text-amber-600' : 'text-slate-900';
  return (
    <Card>
      <div className="p-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
        <div className={`text-2xl font-bold mt-2 tracking-tight ${color}`}>{value}</div>
        <div className="text-xs text-slate-500 mt-1">{note}</div>
      </div>
    </Card>
  );
}

function Bucket({ label, count, amount, variant }: { label: string; count: number; amount: number; variant?: 'red' | 'green' | 'amber' }) {
  const color = variant === 'red' ? 'text-red-600' : variant === 'green' ? 'text-emerald-600' : variant === 'amber' ? 'text-amber-600' : 'text-slate-900';
  return (
    <div className="bg-white p-4 text-center">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
      <div className={`text-lg font-bold mt-2 ${color}`}>{fmtEur(amount)}</div>
      <div className="text-xs text-slate-500 mt-1">{count} faktúr</div>
    </div>
  );
}
