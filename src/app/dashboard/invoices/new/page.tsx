'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button, Input, Field, Card, CardHeader, PageHeader, Select } from '@/components/ui';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { fmtEur } from '@/lib/utils';

type Item = {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
};

type Company = { id: string; name: string };

export default function NewInvoicePage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState({
    company_id: '',
    type: 'invoice',
    number: '',
    customer_name: '',
    customer_ico: '',
    customer_ic_dph: '',
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10); })(),
    currency: 'EUR',
    notes: '',
  });
  const [items, setItems] = useState<Item[]>([{ description: '', quantity: 1, unit: 'ks', unit_price: 0, vat_rate: 23 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('companies').select('id, name').is('deleted_at', null).order('name');
      setCompanies(data || []);
      const firmFromStorage = typeof window !== 'undefined' ? localStorage.getItem('zolo_firm') : '';
      if (data?.length) setForm((f) => ({ ...f, company_id: firmFromStorage || data[0].id }));
    })();
  }, []);

  function setItem(i: number, key: keyof Item, val: string | number) {
    const next = [...items];
    // @ts-expect-error generic
    next[i][key] = val;
    setItems(next);
  }

  const totals = items.reduce(
    (acc, it) => {
      const sub = (+it.quantity || 0) * (+it.unit_price || 0);
      const vat = sub * (+it.vat_rate || 0) / 100;
      return { subtotal: acc.subtotal + sub, vat: acc.vat + vat, total: acc.total + sub + vat };
    },
    { subtotal: 0, vat: 0, total: 0 }
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_id) { setError('Vyber firmu'); return; }
    if (!form.number.trim()) { setError('Číslo dokladu je povinné'); return; }
    setSaving(true);
    setError(null);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setError('Nie si prihlásený'); setSaving(false); return; }

    const invoice = {
      ...form,
      subtotal: +totals.subtotal.toFixed(2),
      vat_amount: +totals.vat.toFixed(2),
      total: +totals.total.toFixed(2),
      paid_amount: 0,
      status: 'issued',
      created_by: user.id,
    };

    const { data: inv, error: invErr } = await sb.from('invoices').insert([invoice]).select().single();
    if (invErr) { setError(invErr.message); setSaving(false); return; }

    const itemRows = items.map((it, idx) => ({
      company_id: form.company_id,
      invoice_id: inv.id,
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

    router.push('/dashboard/invoices');
    router.refresh();
  }

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/dashboard/invoices" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-3">
        <ArrowLeft size={14} /> Späť na zoznam
      </Link>
      <PageHeader title="Nový doklad" subtitle="Vystaviť FA, ZF, DO, DL, PPD alebo CP" />

      <form onSubmit={save} className="space-y-4">
        <Card>
          <CardHeader title="Doklad" />
          <div className="p-5 grid grid-cols-3 gap-4">
            <Field label="Firma (dodávateľ)">
              <Select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Typ dokladu">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="invoice">Faktúra (FA)</option>
                <option value="proforma">Zálohová (ZF)</option>
                <option value="credit_note">Dobropis (DO)</option>
                <option value="delivery_note">Dodací list (DL)</option>
                <option value="cash_receipt">Pokladnica (PPD)</option>
                <option value="quote">Cenová ponuka (CP)</option>
              </Select>
            </Field>
            <Field label="Číslo dokladu *">
              <Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="FA-2026-001" required />
            </Field>
            <Field label="Dátum vystavenia">
              <Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
            </Field>
            <Field label="Dátum splatnosti">
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </Field>
            <Field label="Mena">
              <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                <option value="EUR">EUR</option>
                <option value="CZK">CZK</option>
                <option value="USD">USD</option>
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Odberateľ" />
          <div className="p-5 grid grid-cols-3 gap-4">
            <Field label="Názov zákazníka">
              <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            </Field>
            <Field label="IČO">
              <Input value={form.customer_ico} onChange={(e) => setForm({ ...form, customer_ico: e.target.value })} />
            </Field>
            <Field label="IČ DPH">
              <Input value={form.customer_ic_dph} onChange={(e) => setForm({ ...form, customer_ic_dph: e.target.value })} placeholder="SK1234567890" />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Položky"
            action={
              <Button
                type="button"
                variant="secondary"
                onClick={() => setItems([...items, { description: '', quantity: 1, unit: 'ks', unit_price: 0, vat_rate: 23 }])}
              >
                <Plus size={14} /> Pridať položku
              </Button>
            }
          />
          <div className="p-5 space-y-3">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_90px_80px_120px_90px_60px_auto] gap-2 items-end">
                <Field label={i === 0 ? 'Popis' : ''}>
                  <Input value={it.description} onChange={(e) => setItem(i, 'description', e.target.value)} placeholder="Tovar / služba" />
                </Field>
                <Field label={i === 0 ? 'Množstvo' : ''}>
                  <Input type="number" step="0.01" value={it.quantity} onChange={(e) => setItem(i, 'quantity', +e.target.value)} />
                </Field>
                <Field label={i === 0 ? 'MJ' : ''}>
                  <Input value={it.unit} onChange={(e) => setItem(i, 'unit', e.target.value)} />
                </Field>
                <Field label={i === 0 ? 'Cena/ks' : ''}>
                  <Input type="number" step="0.01" value={it.unit_price} onChange={(e) => setItem(i, 'unit_price', +e.target.value)} />
                </Field>
                <Field label={i === 0 ? 'DPH%' : ''}>
                  <Select value={it.vat_rate} onChange={(e) => setItem(i, 'vat_rate', +e.target.value)}>
                    <option value={23}>23</option>
                    <option value={19}>19</option>
                    <option value={10}>10</option>
                    <option value={0}>0</option>
                  </Select>
                </Field>
                <Field label={i === 0 ? 'Spolu' : ''}>
                  <div className="text-sm font-mono py-2 text-slate-900 text-right">
                    {fmtEur(it.quantity * it.unit_price * (1 + it.vat_rate / 100))}
                  </div>
                </Field>
                <button
                  type="button"
                  onClick={() => setItems(items.filter((_, j) => j !== i))}
                  className="text-red-500 hover:bg-red-50 p-2 rounded mb-1"
                  disabled={items.length === 1}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 px-5 py-4 bg-slate-50 flex justify-end gap-8 text-sm">
            <div>
              <div className="text-xs text-slate-500">Základ</div>
              <div className="font-mono font-medium">{fmtEur(totals.subtotal)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">DPH</div>
              <div className="font-mono font-medium">{fmtEur(totals.vat)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Spolu</div>
              <div className="font-mono font-bold text-lg text-slate-900">{fmtEur(totals.total)}</div>
            </div>
          </div>
        </Card>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-lg">{error}</div>
        )}

        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Ukladám…' : 'Vystaviť doklad'}
          </Button>
          <Link href="/dashboard/invoices"><Button type="button" variant="ghost">Zrušiť</Button></Link>
        </div>
      </form>
    </div>
  );
}
