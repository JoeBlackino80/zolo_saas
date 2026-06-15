import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge, Button } from '@/components/ui';
import { Plane, Plus } from 'lucide-react';
import { fmtEur, fmtDate } from '@/lib/utils';
import Link from 'next/link';

export default async function TravelPage() {
  const sb = await createClient();
  const { data: orders } = await sb
    .from('travel_orders')
    .select('id, purpose, destination, country, departure_date, arrival_date, total_amount, status, advance_currency, employees(name, surname)')
    .is('deleted_at', null)
    .order('departure_date', { ascending: false })
    .limit(100);

  type R = { id: string; purpose: string | null; destination: string | null; country: string | null; departure_date: string | null; arrival_date: string | null; total_amount: number | null; status: string | null; advance_currency: string | null; employees: { name: string; surname: string } | { name: string; surname: string }[] | null };
  const rows = (orders || []) as R[];

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader
        title="Cestovné príkazy"
        subtitle={`${rows.length} príkazov`}
        actions={<Link href="/dashboard/travel/new"><Button variant="primary"><Plus size={14} /> Nový príkaz</Button></Link>}
      />

      {!rows.length ? (
        <Card>
          <EmptyState
            icon={<Plane size={24} />}
            title="Žiadne cestovné príkazy"
            description="Vytvor prvý príkaz pre vyúčtovanie ciest."
            action={<Link href="/dashboard/travel/new"><Button variant="primary"><Plus size={14} /> Vytvoriť príkaz</Button></Link>}
          />
        </Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="text-left px-5 py-3">Zamestnanec</th>
                <th className="text-left px-3 py-3">Cieľ</th>
                <th className="text-left px-3 py-3">Účel</th>
                <th className="text-center px-3 py-3">Odchod</th>
                <th className="text-center px-3 py-3">Návrat</th>
                <th className="text-right px-3 py-3">Suma</th>
                <th className="text-center px-3 py-3">Stav</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((o) => {
                const emp = Array.isArray(o.employees) ? o.employees[0] : o.employees;
                return (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-700">{emp ? `${emp.name} ${emp.surname}` : '—'}</td>
                    <td className="px-3 py-3 text-slate-700">{o.destination}{o.country ? `, ${o.country}` : ''}</td>
                    <td className="px-3 py-3 text-slate-600 text-xs truncate max-w-[200px]">{o.purpose || '—'}</td>
                    <td className="px-3 py-3 text-center font-mono text-xs">{o.departure_date ? fmtDate(o.departure_date) : '—'}</td>
                    <td className="px-3 py-3 text-center font-mono text-xs">{o.arrival_date ? fmtDate(o.arrival_date) : '—'}</td>
                    <td className="px-3 py-3 text-right font-mono">{fmtEur(Number(o.total_amount || 0))}</td>
                    <td className="px-3 py-3 text-center"><Badge variant={o.status === 'approved' ? 'green' : o.status === 'rejected' ? 'red' : 'amber'}>{o.status || 'pending'}</Badge></td>
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
