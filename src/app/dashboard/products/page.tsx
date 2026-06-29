import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Button } from '@/components/ui';
import { Tag, Plus, Upload } from 'lucide-react';
import { fmtEur } from '@/lib/utils';
import Link from 'next/link';

export default async function ProductsPage() {
  const sb = await createClient();
  const { data: products } = await sb.from('products').select('id, name, sku, unit, selling_price, vat_rate, category').is('deleted_at', null).order('name');

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      <PageHeader
        title="Cenník"
        subtitle={`${products?.length || 0} položiek`}
        actions={
          <div className="flex gap-2">
            <Link href="/dashboard/products/import"><Button variant="secondary"><Upload size={14} /> Import CSV</Button></Link>
            <Link href="/dashboard/products/new"><Button variant="primary"><Plus size={14} /> Nová položka</Button></Link>
          </div>
        }
      />
      {!products?.length ? (
        <Card><EmptyState
          icon={<Tag size={24} />}
          title="Prázdny cenník"
          description="Pridaj produkty alebo služby pre používanie pri vystavovaní dokladov."
          action={<Link href="/dashboard/products/new"><Button variant="primary"><Plus size={14} /> Pridať položku</Button></Link>}
        /></Card>
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
