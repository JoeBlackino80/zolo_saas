import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { PageHeader, Card, CardHeader, Badge, Button } from '@/components/ui';
import { fmtEur, fmtDate } from '@/lib/utils';
import { ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';
import InvoiceActions from './actions';

const TYPE_LABEL: Record<string, string> = {
  invoice: 'Faktúra',
  proforma: 'Zálohová faktúra',
  credit_note: 'Dobropis',
  delivery_note: 'Dodací list',
  quote: 'Cenová ponuka',
  cash_receipt: 'Pokladničný príjmový doklad',
};

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { data: invoice } = await sb
    .from('invoices')
    .select('*, invoice_items(*), companies(name, ico, dic, ic_dph, street, city, zip, iban, bic, bank_name)')
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  if (!invoice) notFound();

  type Item = { position: number; description: string; quantity: number; unit: string; unit_price: number; vat_rate: number; subtotal: number; vat_amount: number; total: number };
  const items: Item[] = ((invoice.invoice_items as Item[]) || []).sort((a, b) => a.position - b.position);

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/dashboard/invoices" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-3">
        <ArrowLeft size={14} /> Späť na zoznam
      </Link>
      <PageHeader
        title={`${TYPE_LABEL[invoice.type] || invoice.type} ${invoice.number}`}
        subtitle={`Vystavená ${fmtDate(invoice.issue_date)} · splatná ${fmtDate(invoice.due_date)}`}
        actions={
          <div className="flex gap-2">
            <InvoiceActions invoice={invoice} />
            <Button variant="secondary" onClick={undefined as never}>
              <Printer size={14} /> Tlač
            </Button>
          </div>
        }
      />

      <Card className="mb-4">
        <CardHeader title="Strany" />
        <div className="p-5 grid grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Dodávateľ</div>
            <div className="text-base font-semibold text-slate-900">{(invoice.companies as { name: string })?.name || invoice.supplier_name}</div>
            <div className="text-sm text-slate-600 mt-2 space-y-0.5">
              <div>IČO: <strong>{(invoice.companies as { ico: string })?.ico || invoice.supplier_ico || '—'}</strong></div>
              <div>DIČ: <strong>{(invoice.companies as { dic: string })?.dic || invoice.supplier_dic || '—'}</strong></div>
              <div>IČ DPH: <strong>{(invoice.companies as { ic_dph: string })?.ic_dph || invoice.supplier_ic_dph || '—'}</strong></div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Odberateľ</div>
            <div className="text-base font-semibold text-slate-900">{invoice.customer_name || '—'}</div>
            <div className="text-sm text-slate-600 mt-2 space-y-0.5">
              <div>IČO: <strong>{invoice.customer_ico || '—'}</strong></div>
              <div>DIČ: <strong>{invoice.customer_dic || '—'}</strong></div>
              <div>IČ DPH: <strong>{invoice.customer_ic_dph || '—'}</strong></div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <CardHeader title="Položky" />
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="text-left px-5 py-3">#</th>
                <th className="text-left px-3 py-3">Popis</th>
                <th className="text-right px-3 py-3">Množ.</th>
                <th className="text-left px-3 py-3">MJ</th>
                <th className="text-right px-3 py-3">Cena/ks</th>
                <th className="text-right px-3 py-3">DPH%</th>
                <th className="text-right px-3 py-3">Základ</th>
                <th className="text-right px-3 py-3">DPH</th>
                <th className="text-right px-5 py-3">Spolu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {items.map((it, i) => (
                <tr key={i}>
                  <td className="px-5 py-2.5 text-slate-500">{it.position}</td>
                  <td className="px-3 py-2.5 font-sans text-sm text-slate-900">{it.description}</td>
                  <td className="px-3 py-2.5 text-right">{it.quantity}</td>
                  <td className="px-3 py-2.5">{it.unit}</td>
                  <td className="px-3 py-2.5 text-right">{fmtEur(Number(it.unit_price))}</td>
                  <td className="px-3 py-2.5 text-right">{it.vat_rate}%</td>
                  <td className="px-3 py-2.5 text-right">{fmtEur(Number(it.subtotal))}</td>
                  <td className="px-3 py-2.5 text-right">{fmtEur(Number(it.vat_amount))}</td>
                  <td className="px-5 py-2.5 text-right font-semibold">{fmtEur(Number(it.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-5 py-4 bg-slate-50 flex justify-end gap-10 text-sm">
          <div>
            <div className="text-xs text-slate-500">Základ</div>
            <div className="font-mono font-medium">{fmtEur(Number(invoice.subtotal))}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">DPH</div>
            <div className="font-mono font-medium">{fmtEur(Number(invoice.vat_amount))}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Spolu</div>
            <div className="font-mono font-bold text-lg text-slate-900">{fmtEur(Number(invoice.total))}</div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Platba & stav" />
        <div className="p-5 grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-500 mb-1">VS</div>
            <div className="font-mono">{invoice.variable_symbol || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Zaplatené</div>
            <div className="font-mono">{fmtEur(Number(invoice.paid_amount || 0))}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Stav</div>
            <Badge variant={invoice.status === 'paid' ? 'green' : invoice.status === 'overdue' ? 'red' : 'blue'}>
              {invoice.status}
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
