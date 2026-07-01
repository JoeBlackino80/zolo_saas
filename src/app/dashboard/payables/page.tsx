import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge } from '@/components/ui';
import { Clock } from 'lucide-react';
import Link from 'next/link';
import { fmtEur, fmtDate } from '@/lib/utils';

export default async function PayablesPage() {
  const sb = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: rows } = await sb
    .from('invoices')
    .select('id, number, supplier_name, issue_date, due_date, total, paid_amount, status, currency')
    .eq('type', 'received_invoice')
    .is('deleted_at', null)
    .order('due_date', { ascending: true })
    .limit(500);

  type R = { id: string; number: string; supplier_name: string | null; issue_date: string; due_date: string; total: number; paid_amount: number | null; status: string; currency: string };
  const unpaid = ((rows || []) as R[]).filter((r) => Number(r.total) - Number(r.paid_amount || 0) > 0.01);
  const totalDue = unpaid.reduce((s, r) => s + (Number(r.total) - Number(r.paid_amount || 0)), 0);
  const overdue = unpaid.filter((r) => r.due_date < today);
  const overdueDue = overdue.reduce((s, r) => s + (Number(r.total) - Number(r.paid_amount || 0)), 0);

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      <PageHeader
        title="Záväzky"
        subtitle={`${unpaid.length} nezaplatených PFA · ${fmtEur(totalDue)} celkom · ${overdue.length} po splatnosti (${fmtEur(overdueDue)})`}
      />

      {unpaid.length === 0 ? (
        <Card><EmptyState icon={<Clock size={24} />} title="Žiadne nezaplatené záväzky" description="Všetky prijaté faktúry sú uhradené." /></Card>
      ) : (
        <Card>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                  <th className="text-left px-3 py-3">Číslo PFA</th>
                  <th className="text-left px-3 py-3">Dodávateľ</th>
                  <th className="text-center px-3 py-3">Vystavená</th>
                  <th className="text-center px-3 py-3">Splatná</th>
                  <th className="text-right px-3 py-3">Suma</th>
                  <th className="text-right px-3 py-3">Zaplatené</th>
                  <th className="text-right px-3 py-3">Zostáva</th>
                  <th className="text-center px-3 py-3">Stav</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {unpaid.map((r) => {
                  const remaining = Number(r.total) - Number(r.paid_amount || 0);
                  const isOverdue = r.due_date < today;
                  return (
                    <tr key={r.id} className="hover:bg-zinc-50 transition">
                      <td className="px-3 py-3"><Link href={`/dashboard/invoices/${r.id}`} className="font-mono text-xs font-medium text-zinc-900 hover:underline">{r.number}</Link></td>
                      <td className="px-3 py-3 text-zinc-700">{r.supplier_name || '—'}</td>
                      <td className="px-3 py-3 text-center font-mono text-xs text-zinc-600">{fmtDate(r.issue_date)}</td>
                      <td className={`px-3 py-3 text-center font-mono text-xs ${isOverdue ? 'text-red-600 font-bold' : 'text-zinc-600'}`}>{fmtDate(r.due_date)}</td>
                      <td className="px-3 py-3 text-right font-mono text-zinc-900">{fmtEur(Number(r.total))}</td>
                      <td className="px-3 py-3 text-right font-mono text-zinc-500">{fmtEur(Number(r.paid_amount || 0))}</td>
                      <td className="px-3 py-3 text-right font-mono font-bold">{fmtEur(remaining)}</td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant={isOverdue ? 'red' : Number(r.paid_amount || 0) > 0 ? 'amber' : 'blue'}>
                          {isOverdue ? 'Po splatnosti' : Number(r.paid_amount || 0) > 0 ? 'Čiastočne' : 'Nezaplatené'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
