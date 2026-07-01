import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge } from '@/components/ui';
import { Library } from 'lucide-react';

type Predkontacia = {
  id: string;
  name: string;
  entry_type: string;
  lines: { account_code?: string; side?: 'MD' | 'D'; amount_formula?: string }[] | null;
  is_system: boolean;
  is_active: boolean;
};

export default async function PredkontaciePage() {
  const sb = await createClient();
  const { data } = await sb
    .from('predkontacie')
    .select('id, name, entry_type, lines, is_system, is_active')
    .order('entry_type')
    .order('name');

  const rows = (data || []) as Predkontacia[];
  const byType: Record<string, Predkontacia[]> = {};
  for (const r of rows) {
    (byType[r.entry_type] ||= []).push(r);
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <PageHeader
        title="Predkontácie"
        subtitle="Šablóny účtovania — auto-mapping kontá MD/D pre rôzne typy dokladov (FA, PFA, BV, PPD…)"
      />

      {rows.length === 0 ? (
        <Card><EmptyState icon={<Library size={24} />} title="Žiadne predkontácie" description="Predkontácie sa generujú pri vytvorení firmy." /></Card>
      ) : (
        <div className="space-y-4">
          {Object.keys(byType).sort().map((type) => (
            <Card key={type}>
              <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Typ dokladu</div>
                    <div className="font-bold text-lg tracking-tight">{type}</div>
                  </div>
                  <div className="text-sm text-zinc-500">{byType[type].length} predkontácií</div>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold border-b border-zinc-100">
                    <th className="text-left px-5 py-2">Názov</th>
                    <th className="text-left px-3 py-2">Účtovanie (MD / D)</th>
                    <th className="text-center px-3 py-2">Systémová</th>
                    <th className="text-center px-3 py-2">Aktívna</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {byType[type].map((r) => (
                    <tr key={r.id} className="hover:bg-zinc-50">
                      <td className="px-5 py-2 font-medium">{r.name}</td>
                      <td className="px-3 py-2 font-mono text-xs text-zinc-600">
                        {(r.lines || []).map((l, i) => (
                          <span key={i} className="mr-3">
                            {l.side === 'MD' ? <span className="text-zinc-800">MD {l.account_code}</span> : <span className="text-orange-700">D {l.account_code}</span>}
                          </span>
                        ))}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {r.is_system && <Badge variant="gray">Systémová</Badge>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant={r.is_active ? 'green' : 'gray'}>{r.is_active ? 'Aktívna' : 'Vypnutá'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-4 text-xs text-zinc-500">
        ⚠ Systémové predkontácie sa nedajú editovať. Vlastné si môžeš spraviť v ďalšej verzii (form pripravený).
      </div>
    </div>
  );
}
