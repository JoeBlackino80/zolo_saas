import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import { Tag } from 'lucide-react';
import { fmtEur } from '@/lib/utils';

export default async function ProductsPage() {
  const sb = await createClient();
  const { data: products } = await sb.from('products').select('id, name, sku, unit, selling_price, vat_rate, category').is('deleted_at', null).order('name');

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader title="Cenník" subtitle={`${products?.length || 0} položiek`} />
      {!products?.length ? (
        <Card><EmptyState icon={<Tag size={24} />} title="Prázdny cenník" description="Pridaj produkty alebo služby." /></Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="text-left px-5 py-3">Názov</th>
                <th className="text-left px-3 py-3">Kategória</th>
                <th className="text-left px-3 py-3">SKU</th>
                <th className="text-right px-3 py-3">Cena</th>
                <th className="text-right px-3 py-3">DPH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium">{p.name}</td>
                  <td className="px-3 py-3 text-slate-600">{p.category || '—'}</td>
                  <td className="px-3 py-3 font-mono text-xs">{p.sku || '—'}</td>
                  <td className="px-3 py-3 text-right font-mono">{fmtEur(Number(p.selling_price || 0))} / {p.unit}</td>
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
