'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button, Input, Field } from '@/components/ui';
import { X, Search, Package, AlertTriangle, Plus } from 'lucide-react';
import { fmtEur } from '@/lib/utils';
import { useToast } from '@/components/Toast';

export type PickedProduct = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  vat_rate: number;
  purchase_price: number;
  selling_price: number;
  stock_qty: number;
};

export default function ProductPickerModal({
  companyId,
  onClose,
  onPicked,
}: {
  companyId: string;
  onClose: () => void;
  onPicked: (product: PickedProduct) => void;
}) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<PickedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PickedProduct | null>(null);
  const [receiveQty, setReceiveQty] = useState(10);
  const [receiveCost, setReceiveCost] = useState(0);
  const [receiving, setReceiving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const sb = createClient();
    const { data: prods } = await sb
      .from('products')
      .select('id, name, sku, unit, vat_rate, purchase_price, selling_price')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name')
      .limit(100);

    const ids = (prods || []).map((p) => p.id);
    let stockMap: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: batches } = await sb
        .from('stock_batches')
        .select('product_id, qty_remaining')
        .eq('company_id', companyId)
        .in('product_id', ids);
      for (const b of batches || []) {
        stockMap[b.product_id as string] = (stockMap[b.product_id as string] || 0) + Number(b.qty_remaining || 0);
      }
    }
    const merged: PickedProduct[] = (prods || []).map((p) => ({
      id: p.id as string,
      name: p.name as string,
      sku: (p.sku as string | null),
      unit: (p.unit as string) || 'ks',
      vat_rate: Number(p.vat_rate ?? 23),
      purchase_price: Number(p.purchase_price ?? 0),
      selling_price: Number(p.selling_price ?? 0),
      stock_qty: stockMap[p.id as string] || 0,
    }));
    setProducts(merged);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const filtered = query.trim()
    ? products.filter((p) => {
        const q = query.toLowerCase();
        return p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q);
      })
    : products;

  async function receiveStock() {
    if (!selected) return;
    if (receiveQty <= 0) { toast('Množstvo > 0', 'error'); return; }
    setReceiving(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    const { data: warehouse } = await sb.from('warehouses').select('id').eq('company_id', companyId).limit(1).maybeSingle();
    if (!warehouse) {
      // Auto-create default warehouse
      await sb.from('warehouses').insert({ company_id: companyId, name: 'Hlavný sklad', is_active: true, created_by: user?.id });
      const { data: w2 } = await sb.from('warehouses').select('id').eq('company_id', companyId).limit(1).maybeSingle();
      if (!w2) { toast('Nepodarilo sa vytvoriť sklad', 'error'); setReceiving(false); return; }
    }
    const { data: w } = await sb.from('warehouses').select('id').eq('company_id', companyId).limit(1).maybeSingle();
    const cost = receiveCost > 0 ? receiveCost : selected.purchase_price;
    const { error } = await sb.from('stock_batches').insert({
      company_id: companyId,
      warehouse_id: w?.id,
      product_id: selected.id,
      received_date: new Date().toISOString().slice(0, 10),
      qty_received: receiveQty,
      qty_remaining: receiveQty,
      cost_per_unit: cost,
    });
    setReceiving(false);
    if (error) { toast(error.message, 'error'); return; }
    toast(`Naskladnené: ${receiveQty} ${selected.unit} × ${fmtEur(cost)}`, 'success');
    // Confirm pick + auto-close
    const updated = { ...selected, stock_qty: selected.stock_qty + receiveQty };
    onPicked(updated);
  }

  function pick(p: PickedProduct) {
    if (p.stock_qty <= 0) {
      setSelected(p);
      setReceiveCost(p.purchase_price);
      return; // Show receive form inline
    }
    onPicked(p);
  }

  return (
    <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-zinc-100 px-6 py-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <Package size={18} /> Vybrať z cenníka
            </h2>
            <p className="text-[12px] text-zinc-500 mt-0.5">Prepojí položku so skladom — pri vystavení sa odpočíta, pri dobropise vráti späť.</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 p-1"><X size={18} /></button>
        </div>

        <div className="border-b border-zinc-100 px-6 py-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hľadaj podľa SKU alebo názvu…"
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-10 text-center text-zinc-500 text-sm">Načítavam…</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-zinc-500 text-sm">
              {query ? `Žiadny produkt "${query}"` : 'Cenník je prázdny.'}
              <div className="mt-3">
                <a href="/dashboard/products/new" target="_blank" className="text-zinc-900 hover:underline text-[13px]">
                  Pridať nový produkt →
                </a>
              </div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold sticky top-0">
                  <th className="text-left px-5 py-2">SKU</th>
                  <th className="text-left px-3 py-2">Názov</th>
                  <th className="text-center px-3 py-2">Sklad</th>
                  <th className="text-right px-3 py-2">Cena</th>
                  <th className="text-right px-5 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((p) => {
                  const isSelected = selected?.id === p.id;
                  const stockColor = p.stock_qty <= 0 ? 'text-red-600' : p.stock_qty < 5 ? 'text-amber-700' : 'text-emerald-600';
                  return (
                    <tr key={p.id} className={`hover:bg-zinc-50 ${isSelected ? 'bg-zinc-50' : ''}`}>
                      <td className="px-5 py-2.5 font-mono text-[11px] text-zinc-600">{p.sku || '—'}</td>
                      <td className="px-3 py-2.5 font-medium text-zinc-900">{p.name}</td>
                      <td className={`px-3 py-2.5 text-center font-mono tabular-nums font-semibold ${stockColor}`}>
                        {p.stock_qty} <span className="text-zinc-400 font-normal text-[10px]">{p.unit}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">{fmtEur(p.selling_price)}</td>
                      <td className="px-5 py-2.5 text-right">
                        <Button variant={p.stock_qty > 0 ? 'primary' : 'secondary'} onClick={() => pick(p)}>
                          {p.stock_qty > 0 ? 'Vybrať' : <><AlertTriangle size={12} /> Naskladniť</>}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Naskladniť form — inline pri vybere produktu s 0 kusmi */}
        {selected && selected.stock_qty <= 0 && (
          <div className="border-t border-amber-200 bg-amber-50 px-6 py-4">
            <div className="flex items-center gap-2 text-amber-900 font-semibold text-[13px] mb-3">
              <AlertTriangle size={14} /> {selected.name} nie je na sklade — naskladni pred fakturáciou
            </div>
            <div className="grid grid-cols-3 gap-3 items-end">
              <Field label={`Množstvo (${selected.unit})`}>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  value={receiveQty}
                  onChange={(e) => setReceiveQty(+e.target.value || 0)}
                />
              </Field>
              <Field label="Nákupná cena (€/ks)">
                <Input
                  type="number"
                  step="0.01"
                  value={receiveCost}
                  onChange={(e) => setReceiveCost(+e.target.value || 0)}
                />
              </Field>
              <div className="flex gap-2">
                <Button variant="primary" onClick={receiveStock} disabled={receiving}>
                  <Plus size={12} /> {receiving ? 'Ukladám…' : 'Naskladniť a vybrať'}
                </Button>
                <Button variant="ghost" onClick={() => setSelected(null)}>Naspäť</Button>
              </div>
            </div>
            <div className="text-[11px] text-amber-800 mt-2">
              Vytvorí sa nová šarža v sklade. Pri vystavení FA sa {receiveQty} ks odpočíta a MD 504 / D 132 zaúčtuje COGS.
            </div>
          </div>
        )}

        <div className="border-t border-zinc-100 px-6 py-3 flex justify-between items-center">
          <div className="text-[11px] text-zinc-500">
            💡 Faktúru môžeš vystaviť aj <strong>bez</strong> prepojenia so skladom — použi voľný text v Popise.
          </div>
          <Button variant="ghost" onClick={onClose}>Zrušiť</Button>
        </div>
      </div>
    </div>
  );
}
