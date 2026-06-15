import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge, Button } from '@/components/ui';
import { Plus } from 'lucide-react';
import { fmtEur, fmtDate } from '@/lib/utils';
import Link from 'next/link';

export default async function QuotesPage() {
  const sb = await createClient();
  const { data: quotes } = await sb
    .from('quotes')
    .select('id, quote_number, customer_name, total_amount, status, issue_date, valid_until')
    .order('issue_date', { ascending: false })
    .limit(100);

  type Q = { id: string; quote_number: string; customer_name: string | null; total_amount: number; status: string; issue_date: string; valid_until: string | null };
  const rows = (quotes || []) as Q[];

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader title="Cenové ponuky" subtitle={`${rows.length} ponúk`} actions={<Link href="/dashboard/invoices/new"><Button variant="primary"><Plus size={14} /> Nová ponuka</Button></Link>} />
      {rows.length === 0 ? (
        <Card><EmptyState icon={<Plus size={24} />} title="Žiadne cenové ponuky" description="Vytvor cenovú ponuku — neskôr ju konvertuješ na faktúru." /></Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              <th className="text-left px-5 py-3">Číslo</th>
              <th className="text-left px-3 py-3">Zákazník</th>
              <th className="text-right px-3 py-3">Suma</th>
              <th className="text-center px-3 py-3">Vystavená</th>
              <th className="text-center px-3 py-3">Platí do</th>
              <th className="text-center px-3 py-3">Stav</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono text-xs">{q.quote_number}</td>
                  <td className="px-3 py-3">{q.customer_name}</td>
                  <td className="px-3 py-3 text-right font-mono">{fmtEur(Number(q.total_amount))}</td>
                  <td className="px-3 py-3 text-center font-mono text-xs">{fmtDate(q.issue_date)}</td>
                  <td className="px-3 py-3 text-center font-mono text-xs">{q.valid_until ? fmtDate(q.valid_until) : '—'}</td>
                  <td className="px-3 py-3 text-center"><Badge variant={q.status === 'accepted' ? 'green' : q.status === 'declined' ? 'red' : 'amber'}>{q.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
