import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge, Button } from '@/components/ui';
import { ShoppingCart, Plus } from 'lucide-react';
import { fmtEur, fmtDate } from '@/lib/utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Objednávky' };

const STATUS_LABEL: Record<string, string> = {
  draft: 'Návrh',
  confirmed: 'Potvrdená',
  partially_delivered: 'Čiastočne vybavená',
  completed: 'Vybavená',
  cancelled: 'Stornovaná',
};

type O = { id: string; number: string; order_date: string; total: number | null; currency: string | null; status: string | null; notes: string | null; converted_invoice_id: string | null; contacts: { name: string } | { name: string }[] | null };

export default async function OrdersPage() {
  const sb = await createClient();
  const { data } = await sb
    .from('orders')
    .select('id, number, order_date, total, currency, status, notes, converted_invoice_id, contacts(name)')
    .is('deleted_at', null)
    .order('order_date', { ascending: false })
    .limit(200);
  const rows = (data || []) as O[];

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      <PageHeader
        title="Objednávky"
        subtitle={`${rows.length} objednávok`}
        actions={<Link href="/dashboard/orders/new"><Button variant="primary"><Plus size={14} /> Nová objednávka</Button></Link>}
      />

      {!rows.length ? (
        <Card>
          <EmptyState
            icon={<ShoppingCart size={24} />}
            title="Žiadne objednávky"
            description="Eviduj prijaté objednávky od zákazníkov a konvertuj ich na FA jedným klikom."
            action={<Link href="/dashboard/orders/new"><Button variant="primary"><Plus size={14} /> Vytvoriť objednávku</Button></Link>}
          />
        </Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                <th className="text-left px-5 py-3">Číslo</th>
                <th className="text-left px-3 py-3">Zákazník</th>
                <th className="text-center px-3 py-3">Dátum</th>
                <th className="text-right px-3 py-3">Suma</th>
                <th className="text-center px-3 py-3">Stav</th>
                <th className="text-left px-3 py-3">FA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((o) => {
                const c = Array.isArray(o.contacts) ? o.contacts[0] : o.contacts;
                return (
                  <tr key={o.id} className="hover:bg-zinc-50">
                    <td className="px-5 py-3 font-mono"><Link href={`/dashboard/orders/${o.id}`} className="hover:underline">{o.number}</Link></td>
                    <td className="px-3 py-3 text-zinc-700">{c?.name || '—'}</td>
                    <td className="px-3 py-3 text-center font-mono text-xs">{fmtDate(o.order_date)}</td>
                    <td className="px-3 py-3 text-right font-mono">{fmtEur(Number(o.total || 0))}</td>
                    <td className="px-3 py-3 text-center"><Badge variant={o.status === 'completed' ? 'green' : o.status === 'cancelled' ? 'red' : 'amber'}>{STATUS_LABEL[o.status || ''] || o.status || '—'}</Badge></td>
                    <td className="px-3 py-3">{o.converted_invoice_id ? <Link href={`/dashboard/invoices/${o.converted_invoice_id}`} className="text-zinc-900 hover:underline text-xs">otvoriť →</Link> : <span className="text-xs text-zinc-400">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
