'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button, Input, Field, Card, CardHeader, PageHeader, Select } from '@/components/ui';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { fmtEur } from '@/lib/utils';
import { useToast } from '@/components/Toast';

type Invoice = Record<string, unknown> & { id: string; company_id: string; type: string; number: string; customer_name: string | null; customer_ico: string | null; customer_ic_dph: string | null; customer_email: string | null; reminders_enabled: boolean | null; issue_date: string; delivery_date: string | null; due_date: string; currency: string; notes: string | null };
type Item = { id?: string; position: number; description: string; quantity: number; unit: string; unit_price: number; vat_rate: number; subtotal?: number; vat_amount?: number; total?: number };
type Company = { id: string; name: string };

export default function EditInvoiceClient({ invoice, items: initItems, companies }: { invoice: Invoice; items: Item[]; companies: Company[] }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({
    company_id: invoice.company_id,
    type: invoice.type,
    number: invoice.number,
    customer_name: invoice.customer_name || '',
    customer_ico: invoice.customer_ico || '',
    customer_ic_dph: invoice.customer_ic_dph || '',
    customer_email: invoice.customer_email || '',
    reminders_enabled: invoice.reminders_enabled ?? true,
    issue_date: invoice.issue_date,
    delivery_date: invoice.delivery_date || invoice.issue_date,
    due_date: invoice.due_date,
    currency: invoice.currency || 'EUR',
    notes: invoice.notes || '',
  });
  const [items, setItems] = useState<Item[]>(initItems.length > 0 ? initItems : [{ position: 1, description: '', quantity: 1, unit: 'ks', unit_price: 0, vat_rate: 23 }]);
  const [saving, setSaving] = useState(false);

  function setItem(i: number, key: keyof Item, val: string | number) {
    const next = [...items];
    // @ts-expect-error generic
    next[i][key] = val;
    setItems(next);
  }

  const totals = items.reduce((acc, it) => {
    const sub = (+it.quantity || 0) * (+it.unit_price || 0);
    const vat = sub * (+it.vat_rate || 0) / 100;
    return { subtotal: acc.subtotal + sub, vat: acc.vat + vat, total: acc.total + sub + vat };
  }, { subtotal: 0, vat: 0, total: 0 });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const sb = createClient();
    const { error } = await sb.from('invoices').update({
      ...form,
      subtotal: +totals.subtotal.toFixed(2),
      vat_amount: +totals.vat.toFixed(2),
      total: +totals.total.toFixed(2),
    }).eq('id', invoice.id);
    if (error) { toast(error.message, 'error'); setSaving(false); return; }
    // Replace items
    await sb.from('invoice_items').delete().eq('invoice_id', invoice.id);
    const itemRows = items.map((it, idx) => ({
      company_id: form.company_id,
      invoice_id: invoice.id,
      position: idx + 1,
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
      unit_price: it.unit_price,
      vat_rate: it.vat_rate,
      subtotal: it.quantity * it.unit_price,
      vat_amount: it.quantity * it.unit_price * (it.vat_rate / 100),
      total: it.quantity * it.unit_price * (1 + it.vat_rate / 100),
    }));
    await sb.from('invoice_items').insert(itemRows);
    toast('Faktúra uložená', 'success');
    router.push(`/dashboard/invoices/${invoice.id}`);
    router.refresh();
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <Link href={`/dashboard/invoices/${invoice.id}`} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-3">
        <ArrowLeft size={14} /> Späť na detail
      </Link>
      <PageHeader title={`Upraviť ${invoice.number}`} subtitle="Editácia hlavičky aj položiek" />

      <form onSubmit={save} className="space-y-4">
        <Card>
          <CardHeader title="Doklad" />
          <div className="p-5 grid grid-cols-3 gap-4">
            <Field label="Firma"><Select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Číslo"><Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></Field>
            <Field label="Mena"><Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}><option value="EUR">EUR</option><option value="CZK">CZK</option><option value="USD">USD</option></Select></Field>
            <Field label="Vystavená"><Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></Field>
            <Field label="DZP (dátum dodania)"><Input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} /></Field>
            <Field label="Splatná"><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Odberateľ" />
          <div className="p-5 grid grid-cols-3 gap-4">
            <Field label="Názov"><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></Field>
            <Field label="IČO"><Input value={form.customer_ico} onChange={(e) => setForm({ ...form, customer_ico: e.target.value })} /></Field>
            <Field label="IČ DPH"><Input value={form.customer_ic_dph} onChange={(e) => setForm({ ...form, customer_ic_dph: e.target.value })} /></Field>
            <Field label="Email zákazníka" hint="Kam chodia pripomienky platby">
              <Input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} placeholder="zakaznik@firma.sk" />
            </Field>
            <div className="col-span-2 flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.reminders_enabled} onChange={(e) => setForm({ ...form, reminders_enabled: e.target.checked })} />
                <span>Automatické pripomienky platby</span>
              </label>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Položky" action={<Button type="button" variant="secondary" onClick={() => setItems([...items, { position: items.length + 1, description: '', quantity: 1, unit: 'ks', unit_price: 0, vat_rate: 23 }])}><Plus size={14} /> Pridať</Button>} />
          <div className="p-5 space-y-3">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_70px_110px_80px_50px] gap-2 items-end">
                <Field label={i === 0 ? 'Popis' : ''}><Input value={it.description} onChange={(e) => setItem(i, 'description', e.target.value)} /></Field>
                <Field label={i === 0 ? 'Množstvo' : ''}><Input type="number" step="0.01" value={it.quantity} onChange={(e) => setItem(i, 'quantity', +e.target.value)} /></Field>
                <Field label={i === 0 ? 'MJ' : ''}><Input value={it.unit} onChange={(e) => setItem(i, 'unit', e.target.value)} /></Field>
                <Field label={i === 0 ? 'Cena/ks' : ''}><Input type="number" step="0.01" value={it.unit_price} onChange={(e) => setItem(i, 'unit_price', +e.target.value)} /></Field>
                <Field label={i === 0 ? 'DPH%' : ''}><Select value={it.vat_rate} onChange={(e) => setItem(i, 'vat_rate', +e.target.value)}><option value={23}>23</option><option value={19}>19</option><option value={10}>10</option><option value={0}>0</option></Select></Field>
                <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-red-500 hover:bg-red-50 p-2 rounded mb-1" disabled={items.length === 1}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <div className="border-t border-zinc-100 px-5 py-4 bg-zinc-50 flex justify-end gap-8 text-sm">
            <div><div className="text-xs text-zinc-500">Základ</div><div className="font-mono font-medium">{fmtEur(totals.subtotal)}</div></div>
            <div><div className="text-xs text-zinc-500">DPH</div><div className="font-mono font-medium">{fmtEur(totals.vat)}</div></div>
            <div><div className="text-xs text-zinc-500">Spolu</div><div className="font-mono font-bold text-lg">{fmtEur(totals.total)}</div></div>
          </div>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Ukladám…' : 'Uložiť zmeny'}</Button>
          <Link href={`/dashboard/invoices/${invoice.id}`}><Button type="button" variant="ghost">Zrušiť</Button></Link>
        </div>
      </form>
    </div>
  );
}
