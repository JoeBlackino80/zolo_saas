import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge, Button } from '@/components/ui';
import { CheckSquare } from 'lucide-react';
import { fmtEur, fmtDate } from '@/lib/utils';
import Link from 'next/link';

export default async function ApprovalsPage() {
  const sb = await createClient();
  const { data: pending } = await sb
    .from('invoices')
    .select('id, number, customer_name, total, issue_date, approval_status, current_approval_step')
    .eq('approval_status', 'pending')
    .is('deleted_at', null)
    .order('issue_date', { ascending: false });

  type R = { id: string; number: string; customer_name: string | null; total: number; issue_date: string; approval_status: string; current_approval_step: number };
  const rows = (pending || []) as R[];

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <PageHeader title="Schvaľovanie faktúr" subtitle={`${rows.length} čaká na schválenie`} />
      {rows.length === 0 ? (
        <Card><EmptyState icon={<CheckSquare size={24} className="text-emerald-500" />} title="Všetko schválené" description="Žiadne faktúry nečakajú na schválenie." /></Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              <th className="text-left px-5 py-3">Číslo</th>
              <th className="text-left px-3 py-3">Zákazník</th>
              <th className="text-right px-3 py-3">Suma</th>
              <th className="text-center px-3 py-3">Vystavená</th>
              <th className="text-center px-3 py-3">Krok</th>
              <th className="text-center px-3 py-3"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3"><Link href={`/dashboard/invoices/${r.id}`} className="font-mono text-xs text-blue-600 hover:underline">{r.number}</Link></td>
                  <td className="px-3 py-3">{r.customer_name}</td>
                  <td className="px-3 py-3 text-right font-mono">{fmtEur(Number(r.total))}</td>
                  <td className="px-3 py-3 text-center font-mono text-xs">{fmtDate(r.issue_date)}</td>
                  <td className="px-3 py-3 text-center"><Badge variant="amber">Krok {r.current_approval_step}</Badge></td>
                  <td className="px-3 py-3 text-center"><Link href={`/dashboard/invoices/${r.id}`}><Button variant="primary">Schváliť</Button></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
