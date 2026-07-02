import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Button } from '@/components/ui';
import { Target, Plus } from 'lucide-react';
import Link from 'next/link';

export default async function CostCentersPage() {
  const sb = await createClient();
  const { data: cc } = await sb.from('cost_centers').select('id, name, code, description').is('deleted_at', null);

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <PageHeader title="Nákladové strediská" subtitle={`${cc?.length || 0} stredísk · vnútorná organizácia výdavkov`} />
      {!cc?.length ? (
        <Card>
          <EmptyState
            icon={<Target size={24} />}
            title="Žiadne nákladové strediská"
            description="Rozdeľ náklady podľa oddelenia, pobočky alebo strediska. Neskôr môžeš pri každom doklade priradiť stredisko."
            action={<Link href="/dashboard/cost-centers/new"><Button variant="primary"><Plus size={14} /> Vytvoriť stredisko</Button></Link>}
          />
        </Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead><tr className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
              <th className="text-left px-5 py-3">Kód</th>
              <th className="text-left px-3 py-3">Názov</th>
              <th className="text-left px-3 py-3">Popis</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-100">
              {cc.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-3 font-mono">{c.code}</td>
                  <td className="px-3 py-3 font-medium">{c.name}</td>
                  <td className="px-3 py-3 text-zinc-600">{c.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
