import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge, Button } from '@/components/ui';
import { Plus, ReceiptText } from 'lucide-react';
import { fmtEur, fmtDate } from '@/lib/utils';
import Link from 'next/link';

export default async function QuotesPage() {
  const sb = await createClient();
  // Quotes sú uložené v `invoices` s type='quote'
  const { data: quotes } = await sb
    .from('invoices')
    .select('id, number, customer_name, total, status, issue_date, due_date')
    .eq('type', 'quote')
    .is('deleted_at', null)
    .order('issue_date', { ascending: false })
    .limit(100);

  type Q = { id: string; number: string; customer_name: string | null; total: number; status: string; issue_date: string; due_date: string | null };
  const rows = (quotes || []) as Q[];

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      <PageHeader
        title="Cenové ponuky"
        subtitle={`${rows.length} ponúk`}
        actions={<Link href="/dashboard/invoices/new?type=quote"><Button variant="primary"><Plus size={14} /> Nová ponuka</Button></Link>}
      />
      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ReceiptText size={24} />}
            title="Žiadne cenové ponuky"
            description="Vytvor cenovú ponuku — neskôr ju konvertuješ na faktúru."
            action={<Link href="/dashboard/invoices/new?type=quote"><Button variant="primary"><Plus size={14} /> Vytvoriť ponuku</Button></Link>}
          />
        </Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead><tr className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
              <th className="text-left px-5 py-3">Číslo</th>
              <th className="text-left px-3 py-3">Zákazník</th>
              <th className="text-right px-3 py-3">Suma</th>
              <th className="text-center px-3 py-3">Vystavená</th>
              <th className="text-center px-3 py-3">Platí do</th>
              <th className="text-center px-3 py-3">Stav</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((q) => (
                <tr key={q.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-3"><Link href={`/dashboard/invoices/${q.id}`} className="font-mono text-xs font-medium text-zinc-900 hover:underline">{q.number}</Link></td>
                  <td className="px-3 py-3">{q.customer_name || '—'}</td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">{fmtEur(Number(q.total))}</td>
                  <td className="px-3 py-3 text-center font-mono text-xs text-zinc-600">{fmtDate(q.issue_date)}</td>
                  <td className="px-3 py-3 text-center font-mono text-xs text-zinc-600">{q.due_date ? fmtDate(q.due_date) : '—'}</td>
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
