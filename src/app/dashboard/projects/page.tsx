import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge } from '@/components/ui';
import { Briefcase } from 'lucide-react';
import { fmtEur, fmtDate } from '@/lib/utils';

export default async function ProjectsPage() {
  const sb = await createClient();
  const { data: projects } = await sb
    .from('projects')
    .select('id, name, code, status, budget_amount, actual_amount, start_date, end_date, companies(name)')
    .is('deleted_at', null);

  type P = { id: string; name: string; code: string | null; status: string; budget_amount: number | null; actual_amount: number | null; start_date: string | null; end_date: string | null; companies: { name: string } | { name: string }[] | null };
  const rows = (projects || []) as P[];

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader title="Projekty & nákladové strediská" subtitle={`${rows.length} projektov · sledovanie ziskovosti`} />

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={<Briefcase size={24} />} title="Žiadne projekty" description="Rozdeľ výnosy a náklady podľa projektov pre presnejšiu ziskovosť." />
        </Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="text-left px-5 py-3">Projekt</th>
                <th className="text-left px-3 py-3">Kód</th>
                <th className="text-right px-3 py-3">Rozpočet</th>
                <th className="text-right px-3 py-3">Reálne</th>
                <th className="text-right px-3 py-3">Marža</th>
                <th className="text-center px-3 py-3">Trvanie</th>
                <th className="text-center px-3 py-3">Stav</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((p) => {
                const budget = Number(p.budget_amount || 0);
                const actual = Number(p.actual_amount || 0);
                const margin = budget - actual;
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium">{p.name}</td>
                    <td className="px-3 py-3 font-mono text-xs">{p.code || '—'}</td>
                    <td className="px-3 py-3 text-right font-mono">{fmtEur(budget)}</td>
                    <td className="px-3 py-3 text-right font-mono">{fmtEur(actual)}</td>
                    <td className={`px-3 py-3 text-right font-mono font-semibold ${margin > 0 ? 'text-emerald-600' : margin < 0 ? 'text-red-600' : ''}`}>{fmtEur(margin)}</td>
                    <td className="px-3 py-3 text-center font-mono text-xs">{p.start_date ? `${fmtDate(p.start_date)}` : '—'}{p.end_date ? ` → ${fmtDate(p.end_date)}` : ''}</td>
                    <td className="px-3 py-3 text-center"><Badge variant={p.status === 'active' ? 'green' : p.status === 'completed' ? 'blue' : 'gray'}>{p.status}</Badge></td>
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
