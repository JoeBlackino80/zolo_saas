import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge } from '@/components/ui';
import { Repeat } from 'lucide-react';
import { fmtEur, fmtDate } from '@/lib/utils';

export default async function RecurringPage() {
  const sb = await createClient();
  const { data: templates } = await sb
    .from('recurring_invoices')
    .select('id, customer_name, total, frequency, next_due_date, is_active, last_issued_at')
    .is('deleted_at', null);

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader title="Recurring faktúry" subtitle={`${templates?.length || 0} šablón · auto-generujú sa pri splatnosti`} />

      {!templates?.length ? (
        <Card><EmptyState icon={<Repeat size={24} />} title="Žiadne recurring šablóny" description="Vytvor šablónu pre opakujúce sa faktúry (paušály, prenájmy, SaaS)." /></Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="text-left px-5 py-3">Zákazník</th>
                <th className="text-right px-3 py-3">Suma</th>
                <th className="text-left px-3 py-3">Frekvencia</th>
                <th className="text-center px-3 py-3">Ďalšie</th>
                <th className="text-center px-3 py-3">Naposledy</th>
                <th className="text-center px-3 py-3">Stav</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium">{t.customer_name}</td>
                  <td className="px-3 py-3 text-right font-mono">{fmtEur(Number(t.total || 0))}</td>
                  <td className="px-3 py-3 text-slate-600">{t.frequency}</td>
                  <td className="px-3 py-3 text-center font-mono text-xs">{fmtDate(t.next_due_date)}</td>
                  <td className="px-3 py-3 text-center font-mono text-xs">{t.last_issued_at ? fmtDate(t.last_issued_at) : '—'}</td>
                  <td className="px-3 py-3 text-center"><Badge variant={t.is_active ? 'green' : 'gray'}>{t.is_active ? 'aktívna' : 'pauzovaná'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
