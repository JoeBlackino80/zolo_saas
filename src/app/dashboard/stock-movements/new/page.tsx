'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, Card, CardHeader, Field, Input, Select, Button } from '@/components/ui';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { fmtEur } from '@/lib/utils';
import { useToast } from '@/components/Toast';

type Warehouse = { id: string; name: string };
type Supplier = { id: string; name: string };
type Product = { id: string; name: string; sku: string | null; purchase_price: number | null; unit: string | null };
type Line = { product_id: string; quantity: number; unit_price: number };

export default function StockReceiptNewPage() {
  const router = useRouter();
  const toast = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    company_id: '',
    warehouse_id: '',
    supplier_id: '',
    receipt_date: new Date().toISOString().slice(0, 10),
    note: '',
  });
  const [lines, setLines] = useState<Line[]>([{ product_id: '', quantity: 1, unit_price: 0 }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const cid = typeof window !== 'undefined' ? localStorage.getItem('zolo_firm') : null;
      if (cid) setForm((f) => ({ ...f, company_id: cid }));
      const [{ data: w }, { data: s }, { data: p }] = await Promise.all([
        sb.from('warehouses').select('id, name').eq('is_active', true).order('name'),
        sb.from('contacts').select('id, name').in('type', ['supplier', 'both']).is('deleted_at', null).order('name'),
        sb.from('products').select('id, name, sku, purchase_price, unit').eq('is_active', true).is('deleted_at', null).order('name'),
      ]);
      setWarehouses(w || []);
      setSuppliers(s || []);
      setProducts(p || []);
      if (w?.length) setForm((f) => ({ ...f, warehouse_id: w[0].id }));
    })();
  }, []);

  function addLine() {
    setLines([...lines, { product_id: '', quantity: 1, unit_price: 0 }]);
  }
  function removeLine(idx: number) {
    setLines(lines.filter((_, i) => i !== idx));
  }
  function updateLine(idx: number, patch: Partial<Line>) {
    setLines(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function onPickProduct(idx: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    updateLine(idx, { product_id: productId, unit_price: p?.purchase_price ?? lines[idx].unit_price });
  }

  const total = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.warehouse_id) { toast('Vyber sklad', 'error'); return; }
    const validLines = lines.filter((l) => l.product_id && l.quantity > 0);
    if (validLines.length === 0) { toast('Pridaj aspoň jednu položku', 'error'); return; }
    setSaving(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setSaving(false); return; }

    const y = new Date(form.receipt_date).getFullYear();
    const { data: existing } = await sb.from('stock_receipts')
      .select('receipt_number')
      .eq('company_id', form.company_id)
      .like('receipt_number', `PRI-${y}-%`)
      .order('receipt_number', { ascending: false })
      .limit(1);
    const lastSeq = existing?.[0]?.receipt_number?.match(/(\d+)$/);
    const nextSeq = lastSeq ? parseInt(lastSeq[1], 10) + 1 : 1;
    const receipt_number = `PRI-${y}-${String(nextSeq).padStart(5, '0')}`;

    const { data: receipt, error: rErr } = await sb.from('stock_receipts').insert({
      company_id: form.company_id,
      warehouse_id: form.warehouse_id,
      supplier_id: form.supplier_id || null,
      receipt_number,
      receipt_date: form.receipt_date,
      note: form.note || null,
      total_amount: +total.toFixed(2),
      created_by: user.id,
    }).select('id').single();
    if (rErr || !receipt) { toast(rErr?.message || 'Chyba', 'error'); setSaving(false); return; }

    const items = validLines.map((l, i) => ({
      receipt_id: receipt.id,
      product_id: l.product_id,
      quantity: l.quantity,
      unit_price: l.unit_price,
      total_price: l.quantity * l.unit_price,
      position: i + 1,
    }));
    await sb.from('stock_receipt_items').insert(items);

    // Update warehouse_stock
    for (const l of validLines) {
      const { data: existing } = await sb.from('warehouse_stock')
        .select('id, quantity')
        .eq('warehouse_id', form.warehouse_id)
        .eq('product_id', l.product_id)
        .maybeSingle();
      if (existing) {
        await sb.from('warehouse_stock').update({ quantity: Number(existing.quantity) + l.quantity, updated_at: new Date().toISOString() }).eq('id', existing.id);
      } else {
        await sb.from('warehouse_stock').insert({ warehouse_id: form.warehouse_id, product_id: l.product_id, quantity: l.quantity });
      }
    }

    // Post journal entry MD 132 / D 321
    const { error: jeErr } = await sb.rpc('post_stock_receipt_journal', { p_receipt_id: receipt.id });
    if (jeErr) console.warn('Journal posting skipped:', jeErr.message);

    toast('Skladový príjem zaúčtovaný', 'success');
    router.push('/dashboard/stock-movements');
    router.refresh();
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <PageHeader back={{ href: "/dashboard/stock-movements" }} title="Nový skladový príjem (PRI)" subtitle="Naskladnenie od dodávateľa · auto-zápis MD 132 / D 321" />

      <form onSubmit={save} className="space-y-4">
        <Card>
          <div className="p-5 grid sm:grid-cols-2 gap-4">
            <Field label="Sklad *">
              <Select value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })} required>
                <option value="">Vyber sklad</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </Field>
            <Field label="Dodávateľ">
              <Select value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
                <option value="">— neuvedený —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Dátum">
              <Input type="date" value={form.receipt_date} onChange={(e) => setForm({ ...form, receipt_date: e.target.value })} required />
            </Field>
            <Field label="Poznámka">
              <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="napr. číslo PFA" />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Položky" action={<Button type="button" variant="secondary" onClick={addLine}><Plus size={14} /> Pridať</Button>} />
          <div className="p-5 space-y-2">
            {lines.map((l, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_90px_120px_120px_40px] gap-2 items-end">
                <Field label={idx === 0 ? 'Produkt' : ''}>
                  <Select value={l.product_id} onChange={(e) => onPickProduct(idx, e.target.value)} required>
                    <option value="">Vyber produkt</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ''}</option>)}
                  </Select>
                </Field>
                <Field label={idx === 0 ? 'Množstvo' : ''}>
                  <Input type="number" step="0.01" min="0" value={l.quantity} onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })} required />
                </Field>
                <Field label={idx === 0 ? 'Cena/ks (€)' : ''}>
                  <Input type="number" step="0.01" min="0" value={l.unit_price} onChange={(e) => updateLine(idx, { unit_price: Number(e.target.value) })} required />
                </Field>
                <Field label={idx === 0 ? 'Spolu' : ''}>
                  <div className="px-2.5 py-2 text-[13px] font-mono">{fmtEur(l.quantity * l.unit_price)}</div>
                </Field>
                {lines.length > 1 && (
                  <button type="button" onClick={() => removeLine(idx)} className="text-zinc-400 hover:text-red-600 p-2" aria-label="Odstrániť">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            <div className="pt-3 mt-2 border-t border-zinc-100 flex justify-end items-center gap-3">
              <span className="text-sm text-zinc-500">Celkom:</span>
              <span className="text-lg font-bold tracking-tight">{fmtEur(total)}</span>
            </div>
          </div>
        </Card>

        <div className="flex gap-2 justify-end">
          <Link href="/dashboard/stock-movements"><Button type="button" variant="ghost">Zrušiť</Button></Link>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Ukladám…' : 'Uložiť a zaúčtovať'}</Button>
        </div>
      </form>
    </div>
  );
}
