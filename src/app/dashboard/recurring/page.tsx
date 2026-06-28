import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge, Button } from '@/components/ui';
import { Repeat, Plus } from 'lucide-react';
import Link from 'next/link';
import { fmtEur, fmtDate } from '@/lib/utils';
import RunNowButton from './run-now-button';

const FREQ_LABEL: Record<string, string> = { monthly: 'mesačne', quarterly: 'štvrťročne', yearly: 'ročne' };

export default async function RecurringPage() {
  const sb = await createClient();
  const { data: templates } = await sb
    .from('recurring_invoices')
    .select('id, customer_name, total, currency, frequency, next_generation_date, last_generated_at, is_active, auto_send')
    .is('deleted_at', null)
    .order('next_generation_date', { ascending: true });

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      <PageHeader
        title="Opakujúce sa faktúry"
        subtitle={`${templates?.length || 0} šablón · cron 06:00 UTC denne, alebo manuálne tlačidlom`}
        actions={
          <div className="flex gap-2">
            <RunNowButton />
            <Link href="/dashboard/recurring/new">
              <Button variant="primary"><Plus size={14} /> Nová šablóna</Button>
            </Link>
          </div>
        }
      />

      {!templates?.length ? (
        <Card>
          <EmptyState
            icon={<Repeat size={24} />}
            title="Žiadne opakujúce sa šablóny"
            description="Vytvor šablónu pre paušály, prenájmy, predplatné. Faktúra sa každý interval auto-vystaví, pošle mailom a v deň splatnosti začne posielať pripomienky platby."
            action={<Link href="/dashboard/recurring/new"><Button variant="primary"><Plus size={14} /> Vytvoriť šablónu</Button></Link>}
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-auto">
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
                    <td className="px-5 py-3 font-medium text-slate-900">{t.customer_name || '—'}</td>
                    <td className="px-3 py-3 text-right font-mono">{fmtEur(Number(t.total || 0))}</td>
                    <td className="px-3 py-3 text-slate-600">{FREQ_LABEL[t.frequency as string] || t.frequency || '—'}</td>
                    <td className="px-3 py-3 text-center font-mono text-xs">{t.next_generation_date ? fmtDate(t.next_generation_date) : '—'}</td>
                    <td className="px-3 py-3 text-center font-mono text-xs">{t.last_generated_at ? fmtDate(t.last_generated_at) : '—'}</td>
                    <td className="px-3 py-3 text-center">
                      <Badge variant={t.is_active ? 'green' : 'gray'}>{t.is_active ? 'aktívna' : 'pauzovaná'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
