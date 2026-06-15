import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Button } from '@/components/ui';
import { Book, Plus } from 'lucide-react';
import Link from 'next/link';

export default async function ChartOfAccountsPage() {
  const sb = await createClient();
  const { data: accounts } = await sb.from('chart_of_accounts').select('id, account_code, account_name, account_type, is_active').is('deleted_at', null).order('account_code');

  // Group by first digit (class)
  type A = { id: string; account_code: string; account_name: string; account_type: string; is_active: boolean };
  const rows = (accounts || []) as A[];
  const classes: Record<string, A[]> = {};
  rows.forEach((a) => {
    const cls = a.account_code[0];
    if (!classes[cls]) classes[cls] = [];
    classes[cls].push(a);
  });
  const classNames: Record<string, string> = {
    '0': 'Dlhodobý majetok',
    '1': 'Zásoby',
    '2': 'Finančné účty',
    '3': 'Zúčtovacie vzťahy',
    '4': 'Kapitálové účty',
    '5': 'Náklady',
    '6': 'Výnosy',
    '7': 'Závierkové účty',
  };

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Účtová osnova"
        subtitle={`${rows.length} účtov · podľa SK štandardu`}
        actions={<Link href="/dashboard/chart-of-accounts/new"><Button variant="primary"><Plus size={14} /> Pridať účet</Button></Link>}
      />
      {rows.length === 0 ? (
        <Card><EmptyState icon={<Book size={24} />} title="Prázdna osnova" description="Importuj štandardnú SK účtovú osnovu pre začiatok." /></Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(classes).sort().map(([cls, accs]) => (
            <Card key={cls}>
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold mr-3">Trieda {cls}</span>
                  <span className="text-sm text-slate-600">{classNames[cls] || ''}</span>
                </div>
                <span className="text-xs text-slate-500">{accs.length} účtov</span>
              </div>
              <div className="divide-y divide-slate-100">
                {accs.map((a) => (
                  <div key={a.id} className="px-5 py-2 grid grid-cols-[80px_1fr_120px] gap-4 text-sm hover:bg-slate-50">
                    <div className="font-mono font-semibold text-slate-700">{a.account_code}</div>
                    <div className="text-slate-900">{a.account_name}</div>
                    <div className="text-xs text-slate-500 text-right">{a.account_type}</div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
