'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { PageHeader, Card, Field, Input, Select, Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { fmtEur } from '@/lib/utils';

type Contact = { id: string; name: string };
type Product = { id: string; name: string; selling_price: number; vat_rate: number; unit: string | null };
type Line = { description: string; quantity: number; unit: string; unit_price: number; vat_rate: number };

export default function NewOrderPage() {
  const router = useRouter();
  const toast = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    company_id: '',
    contact_id: '',
    order_date: new Date().toISOString().slice(0, 10),
    currency: 'EUR',
    status: 'draft',
    notes: '',
  });
  const [lines, setLines] = useState<Line[]>([{ description: '', quantity: 1, unit: 'ks', unit_price: 0, vat_rate: 23 }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const cid = typeof window !== 'undefined' ? localStorage.getItem('zolo_firm') : null;
      if (cid) setForm((f) => ({ ...f, company_id: cid }));
      const [{ data: cs }, { data: ps }] = await Promise.all([
        sb.from('contacts').select('id, name').in('type', ['customer', 'both']).is('deleted_at', null).order('name'),
        sb.from('products').select('id, name, selling_price, vat_rate, unit').eq('is_active', true).is('deleted_at', null).order('name'),
      ]);
      setContacts((cs as Contact[]) || []);
      setProducts((ps as Product[]) || []);
    })();
  }, []);

  function addLine() { setLines([...lines, { description: '', quantity: 1, unit: 'ks', unit_price: 0, vat_rate: 23 }]); }
  function removeLine(i: number) { setLines(lines.filter((_, idx) => idx !== i)); }
  function updateLine(i: number, patch: Partial<Line>) { setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l))); }
  function pickProduct(i: number, pid: string) {
    const p = products.find((x) => x.id === pid);
    if (p) updateLine(i, { description: p.name, unit_price: p.selling_price, vat_rate: p.vat_rate, unit: p.unit || 'ks' });
  }

  const totals = lines.reduce((acc, l) => {
    const sub = l.quantity * l.unit_price;
    const vat = sub * (l.vat_rate / 100);
    return { sub: acc.sub + sub, vat: acc.vat + vat, total: acc.total + sub + vat };
  }, { sub: 0, vat: 0, total: 0 });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_id) { toast('Vyber firmu', 'error'); return; }
    setSaving(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setSaving(false); return; }

    const y = new Date(form.order_date).getFullYear();
    const { data: existing } = await sb.from('orders').select('number').eq('company_id', form.company_id).like('number', `OBJ-${y}-%`).order('number', { ascending: false }).limit(1);
    const lastSeq = existing?.[0]?.number?.match(/(\d+)$/);
    const number = `OBJ-${y}-${String(lastSeq ? parseInt(lastSeq[1], 10) + 1 : 1).padStart(5, '0')}`;

    const { error } = await sb.from('orders').insert({
      company_id: form.company_id,
      number,
      contact_id: form.contact_id || null,
      order_date: form.order_date,
      subtotal: +totals.sub.toFixed(2),
      vat_amount: +totals.vat.toFixed(2),
      total: +totals.total.toFixed(2),
      currency: form.currency,
      status: form.status,
      notes: form.notes || null,
      items: lines as unknown as object,
      created_by: user.id,
    });
    setSaving(false);
    if (error) { toast(error.message, 'error'); return; }
    toast(`Objednávka ${number} vytvorená`, 'success');
    router.push('/dashboard/orders');
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <PageHeader back={{ href: "/dashboard/orders" }} title="Nová objednávka" subtitle="Prijatá objednávka od zákazníka — neskôr konvertuješ na FA" />
      <form onSubmit={save} className="space-y-4">
        <Card>
          <div className="p-5 grid sm:grid-cols-2 gap-4">
            <Field label="Zákazník">
              <Select value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })}>
                <option value="">— vyber —</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Dátum">
              <Input type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} required />
            </Field>
            <Field label="Stav">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">Návrh</option>
                <option value="confirmed">Potvrdená</option>
                <option value="completed">Vybavená</option>
                <option value="cancelled">Stornovaná</option>
              </Select>
            </Field>
            <Field label="Poznámka">
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
              <div key={i} className="grid grid-cols-[1fr_80px_70px_100px_80px_30px] gap-2 items-end">
                <Field label={i === 0 ? 'Položka' : ''}>
                  <div className="flex gap-1">
                    <Input value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} placeholder="popis alebo z cenníka →" required />
                    <Select onChange={(e) => pickProduct(i, e.target.value)} value="">
                      <option value="">…</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </Select>
                  </div>
                </Field>
                <Field label={i === 0 ? 'Množstvo' : ''}>
                  <Input type="number" step="0.01" min="0" value={l.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} required />
                </Field>
                <Field label={i === 0 ? 'MJ' : ''}>
                  <Input value={l.unit} onChange={(e) => updateLine(i, { unit: e.target.value })} />
                </Field>
                <Field label={i === 0 ? 'Cena/ks' : ''}>
                  <Input type="number" step="0.01" min="0" value={l.unit_price} onChange={(e) => updateLine(i, { unit_price: Number(e.target.value) })} required />
                </Field>
                <Field label={i === 0 ? 'DPH %' : ''}>
                  <Input type="number" step="1" min="0" value={l.vat_rate} onChange={(e) => updateLine(i, { vat_rate: Number(e.target.value) })} required />
                </Field>
                {lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="text-zinc-400 hover:text-red-600 p-2"><Trash2 size={14} /></button>}
              </div>
            ))}
            <div className="pt-3 mt-2 border-t border-zinc-100 flex justify-end gap-6 text-sm">
              <span className="text-zinc-500">Bez DPH <strong className="font-mono text-zinc-900 ml-2">{fmtEur(totals.sub)}</strong></span>
              <span className="text-zinc-500">DPH <strong className="font-mono text-zinc-900 ml-2">{fmtEur(totals.vat)}</strong></span>
              <span className="text-zinc-900 font-bold">Celkom <strong className="font-mono ml-2">{fmtEur(totals.total)}</strong></span>
            </div>
          </div>
        </Card>

        <div className="flex gap-2 justify-end">
          <Link href="/dashboard/orders"><Button type="button" variant="ghost">Zrušiť</Button></Link>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Ukladám…' : 'Vytvoriť'}</Button>
        </div>
      </form>
    </div>
  );
}
