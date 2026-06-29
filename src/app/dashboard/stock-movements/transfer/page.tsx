'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRightLeft, Plus, Trash2 } from 'lucide-react';
import { PageHeader, Card, Field, Input, Select, Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';

type Wh = { id: string; name: string };
type Prod = { id: string; name: string; sku: string | null };
type Line = { product_id: string; quantity: number };

export default function TransferPage() {
  const router = useRouter();
  const toast = useToast();
  const [warehouses, setWarehouses] = useState<Wh[]>([]);
  const [products, setProducts] = useState<Prod[]>([]);
  const [form, setForm] = useState({
    company_id: '',
    from_warehouse_id: '',
    to_warehouse_id: '',
    transfer_date: new Date().toISOString().slice(0, 10),
    note: '',
  });
  const [lines, setLines] = useState<Line[]>([{ product_id: '', quantity: 1 }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const cid = typeof window !== 'undefined' ? localStorage.getItem('zolo_firm') : null;
      if (cid) setForm((f) => ({ ...f, company_id: cid }));
      const [{ data: w }, { data: p }] = await Promise.all([
        sb.from('warehouses').select('id, name').eq('is_active', true).order('name'),
        sb.from('products').select('id, name, sku').eq('is_active', true).is('deleted_at', null).order('name'),
      ]);
      setWarehouses((w as Wh[]) || []);
      setProducts((p as Prod[]) || []);
      if (w && w.length >= 2) setForm((f) => ({ ...f, from_warehouse_id: w[0].id, to_warehouse_id: w[1].id }));
      else if (w?.length) setForm((f) => ({ ...f, from_warehouse_id: w[0].id }));
    })();
  }, []);

  function addLine() { setLines([...lines, { product_id: '', quantity: 1 }]); }
  function removeLine(i: number) { setLines(lines.filter((_, idx) => idx !== i)); }
  function updateLine(i: number, patch: Partial<Line>) { setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l))); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.from_warehouse_id || !form.to_warehouse_id) { toast('Vyber sklady', 'error'); return; }
    if (form.from_warehouse_id === form.to_warehouse_id) { toast('Sklady musia byť rôzne', 'error'); return; }
    const valid = lines.filter((l) => l.product_id && l.quantity > 0);
    if (valid.length === 0) { toast('Pridaj aspoň jednu položku', 'error'); return; }

    setSaving(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setSaving(false); return; }

    const y = new Date(form.transfer_date).getFullYear();
    const { data: existing } = await sb.from('stock_transfers')
      .select('transfer_number').eq('company_id', form.company_id)
      .like('transfer_number', `PRE-${y}-%`)
      .order('transfer_number', { ascending: false }).limit(1);
    const lastSeq = existing?.[0]?.transfer_number?.match(/(\d+)$/);
    const nextSeq = lastSeq ? parseInt(lastSeq[1], 10) + 1 : 1;
    const transfer_number = `PRE-${y}-${String(nextSeq).padStart(5, '0')}`;

    const { data: tr, error: trErr } = await sb.from('stock_transfers').insert({
      company_id: form.company_id,
      from_warehouse_id: form.from_warehouse_id,
      to_warehouse_id: form.to_warehouse_id,
      transfer_number,
      transfer_date: form.transfer_date,
      note: form.note || null,
      created_by: user.id,
    }).select('id').single();
    if (trErr || !tr) { toast(trErr?.message || 'Chyba', 'error'); setSaving(false); return; }

    const items = valid.map((l, i) => ({ transfer_id: tr.id, product_id: l.product_id, quantity: l.quantity, position: i + 1 }));
    await sb.from('stock_transfer_items').insert(items);

    // Adjust warehouse_stock: decrement from, increment to
    for (const l of valid) {
      const { data: src } = await sb.from('warehouse_stock').select('id, quantity').eq('warehouse_id', form.from_warehouse_id).eq('product_id', l.product_id).maybeSingle();
      if (src) await sb.from('warehouse_stock').update({ quantity: Number(src.quantity) - l.quantity, updated_at: new Date().toISOString() }).eq('id', src.id);
      const { data: dst } = await sb.from('warehouse_stock').select('id, quantity').eq('warehouse_id', form.to_warehouse_id).eq('product_id', l.product_id).maybeSingle();
      if (dst) await sb.from('warehouse_stock').update({ quantity: Number(dst.quantity) + l.quantity, updated_at: new Date().toISOString() }).eq('id', dst.id);
      else await sb.from('warehouse_stock').insert({ warehouse_id: form.to_warehouse_id, product_id: l.product_id, quantity: l.quantity });
    }

    toast('Prevodka uložená', 'success');
    router.push('/dashboard/stock-movements');
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <Link href="/dashboard/stock-movements" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-3">
        <ArrowLeft size={14} /> Späť
      </Link>
      <PageHeader title="Prevodka medzi skladmi" subtitle="Tovar z jedného skladu do druhého · žiadny účtovný dopad" />
      <form onSubmit={save} className="space-y-4">
        <Card>
          <div className="p-5 grid sm:grid-cols-2 gap-4">
            <Field label="Zo skladu *">
              <Select value={form.from_warehouse_id} onChange={(e) => setForm({ ...form, from_warehouse_id: e.target.value })} required>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </Field>
            <Field label="Do skladu *">
              <Select value={form.to_warehouse_id} onChange={(e) => setForm({ ...form, to_warehouse_id: e.target.value })} required>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </Field>
            <Field label="Dátum">
              <Input type="date" value={form.transfer_date} onChange={(e) => setForm({ ...form, transfer_date: e.target.value })} required />
            </Field>
            <Field label="Poznámka">
              <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="napr. dôvod presunu" />
            </Field>
          </div>
        </Card>

        <Card>
          <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
            <div className="text-sm font-semibold">Položky</div>
            <Button type="button" variant="secondary" onClick={addLine}><Plus size={14} /> Pridať</Button>
          </div>
          <div className="p-5 space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_40px] gap-2 items-end">
                <Field label={i === 0 ? 'Produkt' : ''}>
                  <Select value={l.product_id} onChange={(e) => updateLine(i, { product_id: e.target.value })} required>
                    <option value="">Vyber produkt</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ''}</option>)}
                  </Select>
                </Field>
                <Field label={i === 0 ? 'Množstvo' : ''}>
                  <Input type="number" step="0.01" min="0" value={l.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} required />
                </Field>
                {lines.length > 1 && (
                  <button type="button" onClick={() => removeLine(i)} className="text-zinc-400 hover:text-red-600 p-2"><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>
        </Card>

        <div className="flex gap-2 justify-end">
          <Link href="/dashboard/stock-movements"><Button type="button" variant="ghost">Zrušiť</Button></Link>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Ukladám…' : 'Vytvoriť prevodku'}</Button>
        </div>
      </form>
    </div>
  );
}
