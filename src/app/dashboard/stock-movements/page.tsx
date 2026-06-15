import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge } from '@/components/ui';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { fmtEur, fmtDate } from '@/lib/utils';

export default async function StockMovementsPage() {
  const sb = await createClient();
  const { data: moves } = await sb
    .from('stock_movements')
    .select('id, movement_type, movement_number, movement_date, total_value, status')
    .order('movement_date', { ascending: false })
    .limit(100);

  type M = { id: string; movement_type: string; movement_number: string; movement_date: string; total_value: number | null; status: string };
  const rows = (moves || []) as M[];

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader title="Skladové pohyby" subtitle={`${rows.length} pohybov · príjemky, výdajky, prevody`} />
      {rows.length === 0 ? (
        <Card><EmptyState icon={<TrendingUp size={24} />} title="Žiadne pohyby" description="Vytvor príjemku alebo výdajku v sklade." /></Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              <th className="text-center px-5 py-3"></th>
              <th className="text-left px-3 py-3">Číslo</th>
              <th className="text-left px-3 py-3">Typ</th>
              <th className="text-center px-3 py-3">Dátum</th>
              <th className="text-right px-3 py-3">Hodnota</th>
              <th className="text-center px-3 py-3">Stav</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-center">{m.movement_type === 'receipt' ? <TrendingUp size={14} className="text-emerald-500 inline" /> : <TrendingDown size={14} className="text-red-500 inline" />}</td>
                  <td className="px-3 py-3 font-mono text-xs">{m.movement_number}</td>
                  <td className="px-3 py-3"><Badge variant={m.movement_type === 'receipt' ? 'green' : 'red'}>{m.movement_type}</Badge></td>
                  <td className="px-3 py-3 text-center font-mono text-xs">{fmtDate(m.movement_date)}</td>
                  <td className="px-3 py-3 text-right font-mono">{fmtEur(Number(m.total_value || 0))}</td>
                  <td className="px-3 py-3 text-center"><Badge variant={m.status === 'posted' ? 'green' : 'amber'}>{m.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
