import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardHeader, EmptyState, Badge, Button } from '@/components/ui';
import { Boxes, ClipboardList, AlertTriangle } from 'lucide-react';
import { fmtEur } from '@/lib/utils';
import Link from 'next/link';

export default async function StockPage() {
  const sb = await createClient();
  const { data: products } = await sb.from('products').select('id, name, sku, unit, selling_price, vat_rate, min_stock, max_stock').is('deleted_at', null);
  const { data: stockLevels } = await sb.from('warehouse_stock').select('product_id, quantity');
  type WS = { product_id: string; quantity: number };
  const onHand = new Map<string, number>();
  for (const r of (stockLevels || []) as WS[]) {
    onHand.set(r.product_id, (onHand.get(r.product_id) || 0) + Number(r.quantity || 0));
  }

  type P = { id: string; name: string; sku: string | null; unit: string | null; selling_price: number; vat_rate: number; min_stock: number | null; max_stock: number | null };
  const rows = (products || []) as P[];
  const lowStock = rows.filter((p) => p.min_stock != null && Number(p.min_stock) > 0 && (onHand.get(p.id) || 0) < Number(p.min_stock));

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      <PageHeader
        title="Sklady"
        subtitle={`${rows.length} produktov · ${lowStock.length} pod minimum`}
        actions={
          <Link href="/dashboard/stock/inventory">
            <Button variant="primary"><ClipboardList size={14} /> Inventúra</Button>
          </Link>
        }
      />

      {lowStock.length > 0 && (
        <Card className="mb-4">
          <CardHeader title="Nízka zásoba" subtitle={`${lowStock.length} produktov pod minimálnym stavom`} />
          <div className="divide-y divide-zinc-100">
            {lowStock.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-zinc-500">{p.sku && `${p.sku} · `}min {Number(p.min_stock).toFixed(0)} {p.unit || 'ks'}</div>
                  </div>
                </div>
                <Badge variant="amber">{(onHand.get(p.id) || 0).toFixed(0)} / {Number(p.min_stock).toFixed(0)}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!rows.length ? (
        <Card><EmptyState icon={<Boxes size={24} />} title="Prázdny sklad" description="Pridaj produkty pre evidenciu zásob." /></Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                <th className="text-left px-5 py-3">Názov</th>
                <th className="text-left px-3 py-3">SKU</th>
                <th className="text-left px-3 py-3">MJ</th>
                <th className="text-right px-3 py-3">Predaj</th>
                <th className="text-right px-3 py-3">DPH</th>
                <th className="text-right px-3 py-3">Na sklade</th>
                <th className="text-right px-3 py-3">Min</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((p) => {
                const stock = onHand.get(p.id) || 0;
                const low = p.min_stock != null && Number(p.min_stock) > 0 && stock < Number(p.min_stock);
                return (
                  <tr key={p.id} className={low ? 'bg-amber-50/30' : 'hover:bg-zinc-50'}>
                    <td className="px-5 py-3 font-medium text-zinc-900">{p.name}</td>
                    <td className="px-3 py-3 font-mono text-xs text-zinc-600">{p.sku || '—'}</td>
                    <td className="px-3 py-3 text-zinc-600">{p.unit}</td>
                    <td className="px-3 py-3 text-right font-mono">{fmtEur(Number(p.selling_price || 0))}</td>
                    <td className="px-3 py-3 text-right font-mono">{p.vat_rate}%</td>
                    <td className={`px-3 py-3 text-right font-mono ${low ? 'text-amber-700 font-semibold' : ''}`}>{stock.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-zinc-500">{p.min_stock ? Number(p.min_stock).toFixed(0) : '—'}</td>
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
