import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Button, Badge } from '@/components/ui';
import { FileText, Plus } from 'lucide-react';
import Link from 'next/link';
import { fmtEur, fmtDate } from '@/lib/utils';

const TYPE_LABEL: Record<string, string> = {
  invoice: 'FA',
  proforma: 'ZF',
  credit_note: 'DO',
  delivery_note: 'DL',
  quote: 'CP',
  cash_receipt: 'PPD',
};

const STATUS_BADGE: Record<string, 'gray' | 'green' | 'red' | 'amber' | 'blue'> = {
  draft: 'gray',
  issued: 'blue',
  sent: 'blue',
  paid: 'green',
  partially_paid: 'amber',
  overdue: 'red',
  cancelled: 'gray',
};

export default async function InvoicesPage() {
  const sb = await createClient();
  const { data: invoices } = await sb
    .from('invoices')
    .select('id, type, number, customer_name, issue_date, due_date, total, paid_amount, status, currency')
    .is('deleted_at', null)
    .order('issue_date', { ascending: false })
    .limit(200);

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader
        title="Fakturácia"
        subtitle="Faktúry · Zálohové · Dobropisy · Dodacie listy · PPD · Cenové ponuky"
        actions={
          <Link href="/dashboard/invoices/new">
            <Button variant="primary">
              <Plus size={14} /> Nový doklad
            </Button>
          </Link>
        }
      />

      <Card>
        {!invoices?.length ? (
          <EmptyState
            icon={<FileText size={24} />}
            title="Zatiaľ žiadne doklady"
            description="Vystav prvú faktúru, cenovú ponuku alebo dodací list."
            action={
              <Link href="/dashboard/invoices/new">
                <Button variant="primary">
                  <Plus size={14} /> Vystaviť doklad
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="text-left px-5 py-3">Typ</th>
                  <th className="text-left px-3 py-3">Číslo</th>
                  <th className="text-left px-3 py-3">Odberateľ</th>
                  <th className="text-right px-3 py-3">Suma</th>
                  <th className="text-center px-3 py-3">Vystavená</th>
                  <th className="text-center px-3 py-3">Splatná</th>
                  <th className="text-center px-3 py-3">Stav</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50 transition cursor-pointer" onClick={undefined as never}>
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/invoices/${i.id}`}>
                        <Badge variant="blue">{TYPE_LABEL[i.type] || i.type}</Badge>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/dashboard/invoices/${i.id}`} className="font-mono text-xs font-medium text-blue-600 hover:underline">
                        {i.number}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{i.customer_name || '—'}</td>
                    <td className="px-3 py-3 text-right font-mono text-slate-900 font-medium">
                      {fmtEur(Number(i.total || 0))}
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-xs text-slate-600">{fmtDate(i.issue_date)}</td>
                    <td className="px-3 py-3 text-center font-mono text-xs text-slate-600">{fmtDate(i.due_date)}</td>
                    <td className="px-3 py-3 text-center">
                      <Badge variant={STATUS_BADGE[i.status] || 'gray'}>{i.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
