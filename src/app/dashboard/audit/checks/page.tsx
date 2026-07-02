import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardHeader, Badge, EmptyState } from '@/components/ui';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { fmtEur } from '@/lib/utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Programová kontrola' };

type Inv = { id: string; number: string; type: string; total: number; subtotal: number; vat_amount: number; customer_name: string | null; supplier_name: string | null; supplier_ico: string | null; supplier_iban: string | null; variable_symbol: string | null; due_date: string; status: string };

export default async function DocChecksPage() {
  const sb = await createClient();
  const { data: invoices } = await sb
    .from('invoices')
    .select('id, number, type, total, subtotal, vat_amount, customer_name, supplier_name, supplier_ico, supplier_iban, variable_symbol, due_date, status')
    .is('deleted_at', null)
    .limit(500);

  const all = (invoices || []) as Inv[];

  type Issue = { invId: string; number: string; type: string; problem: string; severity: 'error' | 'warn' };
  const issues: Issue[] = [];

  for (const inv of all) {
    const isReceived = inv.type === 'received_invoice';
    // Total mismatch
    const expected = +(Number(inv.subtotal || 0) + Number(inv.vat_amount || 0)).toFixed(2);
    if (Math.abs(expected - Number(inv.total || 0)) > 0.02) {
      issues.push({ invId: inv.id, number: inv.number, type: inv.type, problem: `Total ${fmtEur(inv.total)} ≠ subtotal+VAT ${fmtEur(expected)}`, severity: 'error' });
    }
    // Missing customer (outgoing) or supplier (incoming)
    if (!isReceived && !inv.customer_name) {
      issues.push({ invId: inv.id, number: inv.number, type: inv.type, problem: 'Chýba meno zákazníka', severity: 'error' });
    }
    if (isReceived && !inv.supplier_name) {
      issues.push({ invId: inv.id, number: inv.number, type: inv.type, problem: 'Chýba meno dodávateľa', severity: 'error' });
    }
    if (isReceived && !inv.supplier_ico) {
      issues.push({ invId: inv.id, number: inv.number, type: inv.type, problem: 'Chýba IČO dodávateľa', severity: 'warn' });
    }
    if (isReceived && !inv.supplier_iban) {
      issues.push({ invId: inv.id, number: inv.number, type: inv.type, problem: 'Chýba IBAN dodávateľa (problém pre prevodný príkaz)', severity: 'warn' });
    }
    // Missing VS
    if (!inv.variable_symbol) {
      issues.push({ invId: inv.id, number: inv.number, type: inv.type, problem: 'Chýba variabilný symbol', severity: 'warn' });
    }
    // Overdue but not marked as overdue
    if (inv.status !== 'paid' && new Date(inv.due_date) < new Date()) {
      if (inv.status !== 'overdue') {
        issues.push({ invId: inv.id, number: inv.number, type: inv.type, problem: `Po splatnosti od ${inv.due_date} ale status = ${inv.status}`, severity: 'warn' });
      }
    }
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warn');

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <PageHeader back={{ href: "/dashboard/audit" }} title="Programová kontrola dokladov" subtitle={`${errors.length} kritických chýb · ${warnings.length} upozornení`} />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <div className="p-5">
            <div className="text-xs text-zinc-500 font-semibold uppercase">Kritické chyby</div>
            <div className="text-2xl font-bold mt-1 text-red-600">{errors.length}</div>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <div className="text-xs text-zinc-500 font-semibold uppercase">Upozornenia</div>
            <div className="text-2xl font-bold mt-1 text-amber-600">{warnings.length}</div>
          </div>
        </Card>
      </div>

      {issues.length === 0 ? (
        <Card>
          <EmptyState icon={<CheckCircle2 size={24} />} title="Všetky doklady sú v poriadku" description={`Skontrolovaných ${all.length} dokladov, žiadna nezrovnalosť.`} />
        </Card>
      ) : (
        <Card>
          <CardHeader title="Zoznam zistení" subtitle="Klikni na číslo dokladu pre opravu" />
          <div className="divide-y divide-zinc-100">
            {issues.map((i, idx) => (
              <div key={idx} className="px-5 py-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={14} className={i.severity === 'error' ? 'text-red-500' : 'text-amber-500'} />
                  <Link href={`/dashboard/invoices/${i.invId}`} className="font-mono text-zinc-900 hover:underline">{i.number}</Link>
                  <Badge variant={i.type === 'received_invoice' ? 'blue' : 'gray'}>{i.type}</Badge>
                  <span className="text-zinc-700">{i.problem}</span>
                </div>
                <Badge variant={i.severity === 'error' ? 'red' : 'amber'}>{i.severity === 'error' ? 'Chyba' : 'Upozornenie'}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
