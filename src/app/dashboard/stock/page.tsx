import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import { Boxes } from 'lucide-react';
import { fmtEur } from '@/lib/utils';

export default async function StockPage() {
  const sb = await createClient();
  const { data: products } = await sb.from('products').select('id, name, sku, unit, selling_price, vat_rate').is('deleted_at', null);

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader title="Sklady" subtitle={`${products?.length || 0} produktov`} />
      {!products?.length ? (
        <Card><EmptyState icon={<Boxes size={24} />} title="Prázdny sklad" description="Pridaj produkty pre evidenciu zásob." /></Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="text-left px-5 py-3">Názov</th>
                <th className="text-left px-3 py-3">SKU</th>
                <th className="text-left px-3 py-3">MJ</th>
                <th className="text-right px-3 py-3">Predajná cena</th>
                <th className="text-right px-3 py-3">DPH %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-600">{p.sku || '—'}</td>
                  <td className="px-3 py-3 text-slate-600">{p.unit}</td>
                  <td className="px-3 py-3 text-right font-mono">{fmtEur(Number(p.selling_price || 0))}</td>
                  <td className="px-3 py-3 text-right font-mono">{p.vat_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
