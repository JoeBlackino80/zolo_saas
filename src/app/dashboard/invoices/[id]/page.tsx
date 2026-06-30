import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { PageHeader, Card, CardHeader, Badge, Button } from '@/components/ui';
import { fmtEur, fmtDate } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import InvoiceActions from './actions';
import InstallmentsSection from './installments-form';
import InvoiceAttachments from './attachments';

const TYPE_LABEL: Record<string, string> = {
  invoice: 'Faktúra',
  received_invoice: 'Prijatá faktúra',
  proforma: 'Zálohová faktúra',
  credit_note: 'Dobropis',
  debit_note: 'Ťarchopis',
  storno: 'Storno',
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

  // Linked documents: parent (if this is dobropis/storno/zalohova OF something) + children (created from this)
  const [{ data: parent }, { data: children }, { data: linkedDeliveryNotes }] = await Promise.all([
    invoice.parent_invoice_id
      ? sb.from('invoices').select('id, type, number, total').eq('id', invoice.parent_invoice_id).is('deleted_at', null).maybeSingle()
      : Promise.resolve({ data: null }),
    sb.from('invoices').select('id, type, number, total').eq('parent_invoice_id', invoice.id).is('deleted_at', null).order('issue_date', { ascending: false }),
    sb.from('delivery_notes').select('id, number, delivery_date').eq('invoice_id', invoice.id).is('deleted_at', null).order('delivery_date', { ascending: false }),
  ]);
  const hasLinks = !!parent || (children?.length ?? 0) > 0 || (linkedDeliveryNotes?.length ?? 0) > 0;
  const canIssueCredit = invoice.type === 'invoice' && !(children?.some((c) => c.type === 'storno'));

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <Link href="/dashboard/invoices" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-3">
        <ArrowLeft size={14} /> Späť na zoznam
      </Link>
      <PageHeader
        title={`${TYPE_LABEL[invoice.type] || invoice.type} ${invoice.number}`}
        subtitle={`Vystavená ${fmtDate(invoice.issue_date)} · DZP ${fmtDate(invoice.delivery_date || invoice.issue_date)} · splatná ${fmtDate(invoice.due_date)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <InvoiceActions invoice={invoice} />
            {invoice.type === 'invoice' && canIssueCredit && (
              <>
                <Link href={`/dashboard/invoices/new?from=${invoice.id}&type=credit_note&parent=${invoice.id}`}>
                  <Button variant="secondary">Vystaviť dobropis</Button>
                </Link>
                <Link href={`/dashboard/invoices/new?from=${invoice.id}&type=storno&parent=${invoice.id}`}>
                  <Button variant="secondary">Storno</Button>
                </Link>
                <Link href={`/dashboard/invoices/new?from=${invoice.id}&type=debit_note&parent=${invoice.id}`}>
                  <Button variant="secondary">Ťarchopis</Button>
                </Link>
                <Link href={`/dashboard/invoices/new?from=${invoice.id}&type=delivery_note&parent=${invoice.id}`}>
                  <Button variant="secondary">Dodací list</Button>
                </Link>
              </>
            )}
            {(invoice.type === 'proforma' || invoice.type === 'quote' || invoice.type === 'delivery_note') && (
              <Link href={`/dashboard/invoices/new?from=${invoice.id}&type=invoice&parent=${invoice.id}`}>
                <Button variant="primary">Vystaviť FA</Button>
              </Link>
            )}
            <Link href={`/dashboard/invoices/new?from=${invoice.id}&type=${invoice.type}`}>
              <Button variant="ghost">Duplikovať</Button>
            </Link>
          </div>
        }
      />

      {invoice.type === 'invoice' && Number(invoice.paid_amount || 0) < Number(invoice.total) && (
        <InstallmentsSection invoiceId={invoice.id} companyId={invoice.company_id} total={Number(invoice.total)} />
      )}

      <InvoiceAttachments invoiceId={invoice.id} companyId={invoice.company_id} />

      {hasLinks && (
        <Card className="mb-4">
          <CardHeader title="Súvisiace doklady" />
          <div className="p-5 space-y-1.5 text-sm">
            {parent && (
              <div className="flex items-center gap-2">
                <Badge variant="gray">Pôvodný</Badge>
                <Link href={`/dashboard/invoices/${parent.id}`} className="text-blue-600 hover:underline font-mono">{parent.number}</Link>
                <span className="text-slate-500">— {TYPE_LABEL[parent.type] || parent.type} · {fmtEur(Number(parent.total))}</span>
              </div>
            )}
            {(children || []).map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <Badge variant={c.type === 'storno' ? 'red' : c.type === 'credit_note' ? 'amber' : 'blue'}>{TYPE_LABEL[c.type] || c.type}</Badge>
                <Link href={`/dashboard/invoices/${c.id}`} className="text-blue-600 hover:underline font-mono">{c.number}</Link>
                <span className="text-slate-500">— {fmtEur(Number(c.total))}</span>
              </div>
            ))}
            {(linkedDeliveryNotes || []).map((dn) => (
              <div key={dn.id} className="flex items-center gap-2">
                <Badge variant="gray">Dodací list</Badge>
                <Link href={`/dashboard/delivery-notes/${dn.id}`} className="text-blue-600 hover:underline font-mono">{dn.number}</Link>
                <span className="text-slate-500">— {fmtDate(dn.delivery_date)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

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

      <Card className="mb-4">
        <CardHeader title="Platba & stav" />
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
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

      {invoice.type === 'invoice' && (
        <Card>
          <CardHeader title="Pripomienky platby" subtitle={invoice.reminders_enabled === false ? 'Vypnuté pre tento doklad' : `Posielame na ${invoice.customer_email || invoice.sent_to || '— chýba email'}`} />
          <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              { kind: 1, label: '3 dni pred', col: 'reminder_1_sent_at' },
              { kind: 2, label: 'V deň splatnosti', col: 'reminder_2_sent_at' },
              { kind: 3, label: '+7 dní po', col: 'reminder_3_sent_at' },
              { kind: 4, label: '+30 dní po', col: 'reminder_4_sent_at' },
            ].map(({ kind, label, col }) => {
              const sent = invoice[col as 'reminder_1_sent_at'];
              return (
                <div key={kind} className={`border rounded-lg p-3 ${sent ? 'bg-emerald-50 border-emerald-200' : 'border-slate-200'}`}>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
                  <div className={`text-sm mt-0.5 ${sent ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                    {sent ? '✓ ' + fmtDate(sent) : 'Čaká'}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
