'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { PageHeader, Card, Field, Input, Select, Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { fmtEur } from '@/lib/utils';

type Wh = { id: string; name: string };
type Row = { product_id: string; product_name: string; sku: string | null; expected: number; counted: number; unit_price: number };

export default function InventoryPage() {
  const router = useRouter();
  const toast = useToast();
  const [warehouses, setWarehouses] = useState<Wh[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const cid = typeof window !== 'undefined' ? localStorage.getItem('zolo_firm') : null;
      if (cid) setCompanyId(cid);
      const { data: ws } = await sb.from('warehouses').select('id, name').eq('is_active', true).order('name');
      setWarehouses((ws as Wh[]) || []);
      if (ws?.length) setWarehouseId(ws[0].id);
    })();
  }, []);

  async function loadStock() {
    if (!warehouseId) return;
    setLoading(true);
    const sb = createClient();
    const { data: stock } = await sb
      .from('warehouse_stock')
      .select('product_id, quantity, products(name, sku, purchase_price)')
      .eq('warehouse_id', warehouseId);
    type S = { product_id: string; quantity: number; products: { name: string; sku: string | null; purchase_price: number | null } | { name: string; sku: string | null; purchase_price: number | null }[] | null };
    const newRows: Row[] = ((stock || []) as S[]).map((s) => {
      const p = Array.isArray(s.products) ? s.products[0] : s.products;
      return {
        product_id: s.product_id,
        product_name: p?.name || '?',
        sku: p?.sku || null,
        expected: Number(s.quantity || 0),
        counted: Number(s.quantity || 0),
        unit_price: Number(p?.purchase_price || 0),
      };
    });
    setRows(newRows);
    setLoading(false);
  }

  function updateCounted(idx: number, qty: number) {
    setRows(rows.map((r, i) => (i === idx ? { ...r, counted: qty } : r)));
  }

  const totalDiff = rows.reduce((s, r) => s + (r.counted - r.expected), 0);
  const totalValueDiff = rows.reduce((s, r) => s + (r.counted - r.expected) * r.unit_price, 0);

  async function save() {
    if (rows.length === 0) { toast('Najprv načítaj stav', 'error'); return; }
    setSaving(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { data: inv, error } = await sb.from('warehouse_inventories').insert({
      company_id: companyId,
      warehouse_id: warehouseId,
      inventory_date: date,
      status: 'completed',
      total_differences: rows.filter((r) => r.counted !== r.expected).length,
      total_value_difference: +totalValueDiff.toFixed(2),
      created_by: user.id,
    }).select('id').single();
    if (error || !inv) { toast(error?.message || 'Chyba', 'error'); setSaving(false); return; }

    const items = rows.map((r) => ({
      inventory_id: inv.id,
      product_id: r.product_id,
      expected_quantity: r.expected,
      actual_quantity: r.counted,
      difference: r.counted - r.expected,
      unit_price: r.unit_price,
      value_difference: +((r.counted - r.expected) * r.unit_price).toFixed(2),
      type: r.counted > r.expected ? 'surplus' : r.counted < r.expected ? 'shortage' : 'match',
    }));
    await sb.from('warehouse_inventory_items').insert(items);

    // Adjust warehouse_stock to reflect counted quantities
    for (const r of rows) {
      if (r.counted === r.expected) continue;
      await sb.from('warehouse_stock').update({ quantity: r.counted, updated_at: new Date().toISOString() })
        .eq('warehouse_id', warehouseId).eq('product_id', r.product_id);
    }

    toast(`Inventúra dokončená · ${rows.filter((r) => r.counted !== r.expected).length} rozdielov`, 'success');
    router.push('/dashboard/stock');
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <PageHeader back={{ href: "/dashboard/stock" }} title="Inventúra skladu" subtitle="Spočítaj skutočný stav a porovnaj so systémovým" />

      <Card className="mb-4">
        <div className="p-5 grid sm:grid-cols-3 gap-3 items-end">
          <Field label="Sklad">
            <Select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
          </Field>
          <Field label="Dátum">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Button variant="primary" onClick={loadStock} disabled={!warehouseId || loading}>
            {loading ? 'Načítavam…' : 'Načítať stav'}
          </Button>
        </div>
      </Card>

      {rows.length > 0 && (
        <Card>
          <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
            <div className="text-sm font-semibold">{rows.length} produktov · rozdiel hodnoty: <span className={totalValueDiff > 0 ? 'text-emerald-700' : totalValueDiff < 0 ? 'text-red-700' : ''}>{fmtEur(totalValueDiff)}</span></div>
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving ? 'Ukladám…' : `Dokončiť inventúru`}
            </Button>
          </div>
          <div className="overflow-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 sticky top-0">
                <tr className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                  <th className="text-left px-3 py-3">Produkt</th>
                  <th className="text-left px-3 py-3">SKU</th>
                  <th className="text-right px-3 py-3">Systém</th>
                  <th className="text-right px-3 py-3">Spočítané</th>
                  <th className="text-right px-3 py-3">Rozdiel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((r, i) => {
                  const diff = r.counted - r.expected;
                  return (
                    <tr key={r.product_id} className={diff !== 0 ? 'bg-amber-50/40' : ''}>
                      <td className="px-3 py-2 font-medium">{r.product_name}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.sku || '—'}</td>
                      <td className="px-3 py-2 text-right font-mono">{r.expected.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">
                        <input type="number" step="0.01" min="0" value={r.counted} onChange={(e) => updateCounted(i, Number(e.target.value))} className="w-24 text-right border border-zinc-200 rounded px-2 py-1 text-sm" />
                      </td>
                      <td className={`px-3 py-2 text-right font-mono text-xs ${diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-red-700' : 'text-zinc-400'}`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {rows.length === 0 && (
        <Card>
          <div className="p-10 text-center text-zinc-500">
            <ClipboardList size={40} className="mx-auto mb-3 text-zinc-300" />
            <div className="text-sm">Vyber sklad a klikni „Načítať stav"</div>
          </div>
        </Card>
      )}
    </div>
  );
}
