import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge, Button } from '@/components/ui';
import { Plane, Plus } from 'lucide-react';
import { fmtEur, fmtDate } from '@/lib/utils';
import Link from 'next/link';

export default async function TravelPage() {
  const sb = await createClient();
  const { data: orders } = await sb
    .from('travel_orders')
    .select('id, order_number, employee_name, destination, departure_date, return_date, total_amount, status, currency')
    .order('departure_date', { ascending: false })
    .limit(100);

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader
        title="Cestovné príkazy"
        subtitle={`${orders?.length || 0} príkazov`}
        actions={
          <Link href="/dashboard/travel/new">
            <Button variant="primary"><Plus size={14} /> Nový príkaz</Button>
          </Link>
        }
      />

      {!orders?.length ? (
        <Card>
          <EmptyState
            icon={<Plane size={24} />}
            title="Žiadne cestovné príkazy"
            description="Pridaj prvý príkaz — diéty, náhrady, vyúčtovanie."
            action={<Link href="/dashboard/travel/new"><Button variant="primary"><Plus size={14} /> Nový príkaz</Button></Link>}
          />
        </Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="text-left px-5 py-3">Číslo</th>
                <th className="text-left px-3 py-3">Zamestnanec</th>
                <th className="text-left px-3 py-3">Cieľ</th>
                <th className="text-center px-3 py-3">Odchod</th>
                <th className="text-center px-3 py-3">Návrat</th>
                <th className="text-right px-3 py-3">Suma</th>
                <th className="text-center px-3 py-3">Stav</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono text-xs font-medium">{o.order_number}</td>
                  <td className="px-3 py-3 text-slate-700">{o.employee_name}</td>
                  <td className="px-3 py-3 text-slate-700">{o.destination}</td>
                  <td className="px-3 py-3 text-center font-mono text-xs">{fmtDate(o.departure_date)}</td>
                  <td className="px-3 py-3 text-center font-mono text-xs">{fmtDate(o.return_date)}</td>
                  <td className="px-3 py-3 text-right font-mono">{fmtEur(Number(o.total_amount || 0))}</td>
                  <td className="px-3 py-3 text-center"><Badge variant={o.status === 'approved' ? 'green' : o.status === 'rejected' ? 'red' : 'amber'}>{o.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
