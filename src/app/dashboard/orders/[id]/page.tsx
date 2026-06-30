import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PageHeader, Card, CardHeader, Badge, Button } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';
import { fmtEur, fmtDate } from '@/lib/utils';
import ConvertButton from './convert-button';

export const dynamic = 'force-dynamic';

type ItemLine = { description?: string; quantity?: number; unit?: string; unit_price?: number; vat_rate?: number };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { data: order } = await sb
    .from('orders')
    .select('*, contacts(name)')
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  if (!order) notFound();
  const c = Array.isArray(order.contacts) ? order.contacts[0] : order.contacts;
  const items = (order.items as ItemLine[]) || [];

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <Link href="/dashboard/orders" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-3">
        <ArrowLeft size={14} /> Späť
      </Link>
      <PageHeader
        title={`Objednávka ${order.number}`}
        subtitle={`${c?.name || 'bez zákazníka'} · ${fmtDate(order.order_date)} · ${fmtEur(Number(order.total || 0))}`}
        actions={
          order.converted_invoice_id ? (
            <Link href={`/dashboard/invoices/${order.converted_invoice_id}`}>
              <Button variant="secondary">Otvoriť FA →</Button>
            </Link>
          ) : (
            <ConvertButton orderId={order.id} />
          )
        }
      />

      <Card className="mb-4">
        <CardHeader title="Hlavička" />
        <div className="p-5 grid sm:grid-cols-2 gap-3 text-sm">
          <Detail label="Stav" value={<Badge variant={order.status === 'completed' ? 'green' : order.status === 'cancelled' ? 'red' : 'amber'}>{order.status}</Badge>} />
          <Detail label="Mena" value={order.currency} />
          <Detail label="Subtotal" value={fmtEur(Number(order.subtotal || 0))} />
          <Detail label="DPH" value={fmtEur(Number(order.vat_amount || 0))} />
          <Detail label="Celkom" value={<strong>{fmtEur(Number(order.total || 0))}</strong>} />
          {order.notes && <Detail label="Poznámka" value={order.notes} />}
        </div>
      </Card>

      <Card>
        <CardHeader title={`Položky (${items.length})`} />
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
              <th className="text-left px-5 py-3">Popis</th>
              <th className="text-right px-3 py-3">Množstvo</th>
              <th className="text-right px-3 py-3">Cena/ks</th>
              <th className="text-right px-3 py-3">DPH</th>
              <th className="text-right px-3 py-3">Spolu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {items.map((it, i) => (
              <tr key={i}>
                <td className="px-5 py-3">{it.description || '—'}</td>
                <td className="px-3 py-3 text-right font-mono">{(it.quantity || 0).toFixed(2)} {it.unit}</td>
                <td className="px-3 py-3 text-right font-mono">{fmtEur(Number(it.unit_price || 0))}</td>
                <td className="px-3 py-3 text-right font-mono text-xs">{it.vat_rate}%</td>
                <td className="px-3 py-3 text-right font-mono">{fmtEur(Number(it.quantity || 0) * Number(it.unit_price || 0) * (1 + Number(it.vat_rate || 0) / 100))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">{label}</div>
      <div className="mt-0.5 text-zinc-900">{value}</div>
    </div>
  );
}
