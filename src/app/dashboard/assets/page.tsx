import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Button } from '@/components/ui';
import { Building2, Plus } from 'lucide-react';
import { fmtEur, fmtDate } from '@/lib/utils';
import Link from 'next/link';

export default async function AssetsPage() {
  const sb = await createClient();
  const { data: assets } = await sb.from('assets').select('id, name, inventory_number, acquisition_price, acquisition_date, depreciation_category').is('deleted_at', null);

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader
        title="Majetok"
        subtitle={`${assets?.length || 0} aktív · odpisy podľa § 26 ZDP`}
        actions={<Link href="/dashboard/assets/new"><Button variant="primary"><Plus size={14} /> Pridať majetok</Button></Link>}
      />
      {!assets?.length ? (
        <Card><EmptyState
          icon={<Building2 size={24} />}
          title="Žiadny majetok"
          description="Pridaj DHM / DNM pre evidenciu odpisov."
          action={<Link href="/dashboard/assets/new"><Button variant="primary"><Plus size={14} /> Pridať</Button></Link>}
        /></Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="text-left px-5 py-3">Aktívum</th>
                <th className="text-left px-3 py-3">Inv. č.</th>
                <th className="text-right px-3 py-3">Obstarávacia cena</th>
                <th className="text-center px-3 py-3">Dátum</th>
                <th className="text-center px-3 py-3">Skupina</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium">{a.name}</td>
                  <td className="px-3 py-3 font-mono text-xs">{a.inventory_number || '—'}</td>
                  <td className="px-3 py-3 text-right font-mono">{fmtEur(Number(a.acquisition_price || 0))}</td>
                  <td className="px-3 py-3 text-center font-mono text-xs">{fmtDate(a.acquisition_date)}</td>
                  <td className="px-3 py-3 text-center text-xs">{a.depreciation_category || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
