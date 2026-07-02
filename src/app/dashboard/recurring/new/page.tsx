'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button, Input, Field, Card, CardHeader, PageHeader, Select } from '@/components/ui';
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react';
import Link from 'next/link';
import { fmtEur } from '@/lib/utils';
import { useToast } from '@/components/Toast';

type Item = { description: string; quantity: number; unit: string; unit_price: number; vat_rate: number };
type Company = { id: string; name: string };
type Contact = { id: string; name: string; ico: string | null; ic_dph: string | null; email: string | null };

export default function NewRecurringPage() {
  const router = useRouter();
  const toast = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactQuery, setContactQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [form, setForm] = useState({
    company_id: '',
    customer_name: '', customer_email: '', customer_ico: '', customer_ic_dph: '',
    frequency: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
    next_generation_date: new Date().toISOString().slice(0, 10),
    due_days: 14,
    currency: 'EUR',
    auto_send: true,
    is_active: true,
    notes: '',
  });
  const [items, setItems] = useState<Item[]>([{ description: '', quantity: 1, unit: 'mes', unit_price: 0, vat_rate: 23 }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('companies').select('id, name').is('deleted_at', null).order('name');
      setCompanies(data || []);
      const cid = (typeof window !== 'undefined' && localStorage.getItem('zolo_firm')) || data?.[0]?.id || '';
      if (cid) setForm((f) => ({ ...f, company_id: cid }));
    })();
  }, []);

  useEffect(() => {
    if (!form.company_id) return;
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('contacts').select('id, name, ico, ic_dph, email').eq('company_id', form.company_id).in('type', ['customer', 'both']).is('deleted_at', null).order('name').limit(500);
      setContacts((data as Contact[]) || []);
    })();
  }, [form.company_id]);

  function pick(c: Contact) {
    setForm((f) => ({ ...f, customer_name: c.name, customer_ico: c.ico || '', customer_ic_dph: c.ic_dph || '', customer_email: c.email || f.customer_email }));
    setContactQuery(c.name);
    setShowDropdown(false);
  }

  function setItem(i: number, k: keyof Item, v: string | number) {
    const next = [...items];
    // @ts-expect-error generic
    next[i][k] = v;
    setItems(next);
  }

  const totals = items.reduce((acc, it) => {
    const sub = (+it.quantity || 0) * (+it.unit_price || 0);
    const vat = sub * (+it.vat_rate || 0) / 100;
    return { subtotal: acc.subtotal + sub, vat: acc.vat + vat, total: acc.total + sub + vat };
  }, { subtotal: 0, vat: 0, total: 0 });

  const filtered = contactQuery.trim()
    ? contacts.filter((c) => c.name.toLowerCase().includes(contactQuery.toLowerCase()) || (c.ico || '').includes(contactQuery)).slice(0, 8)
    : contacts.slice(0, 8);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_id) { toast('Vyber firmu', 'error'); return; }
    if (!form.customer_name.trim()) { toast('Vyplň zákazníka', 'error'); return; }
    if (items.some((it) => !it.description.trim())) { toast('Doplň popis každej položky', 'error'); return; }
    setSaving(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { toast('Nie si prihlásený', 'error'); setSaving(false); return; }

    const itemsTpl = items.map((it, idx) => {
      const sub = it.quantity * it.unit_price;
      const vat = sub * it.vat_rate / 100;
      return {
        position: idx + 1, description: it.description, quantity: it.quantity, unit: it.unit,
        unit_price: it.unit_price, vat_rate: it.vat_rate,
        subtotal: +sub.toFixed(2), vat_amount: +vat.toFixed(2), total: +(sub + vat).toFixed(2),
      };
    });

    const interval_months = form.frequency === 'monthly' ? 1 : form.frequency === 'quarterly' ? 3 : 12;
    const { error } = await sb.from('recurring_invoices').insert({
      company_id: form.company_id,
      customer_name: form.customer_name, customer_email: form.customer_email, customer_ico: form.customer_ico, customer_ic_dph: form.customer_ic_dph,
      name: `Pre ${form.customer_name}`,
      frequency: form.frequency, interval_months,
      next_generation_date: form.next_generation_date,
      due_days: form.due_days,
      currency: form.currency,
      auto_send: form.auto_send, is_active: form.is_active,
      total: +totals.total.toFixed(2),
      template_data: { items: itemsTpl },
      notes: form.notes,
      created_by: user.id,
    });
    if (error) { toast(error.message, 'error'); setSaving(false); return; }
    toast('Šablóna vytvorená — prvá FA sa vystaví ' + form.next_generation_date, 'success');
    router.push('/dashboard/recurring');
    router.refresh();
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <PageHeader back={{ href: "/dashboard/recurring" }} title="Nová opakujúca sa šablóna" subtitle="Nastav frekvenciu — FA sa potom vystavujú automaticky" />

      <form onSubmit={save} className="space-y-4">
        <Card>
          <CardHeader title="Nastavenia" />
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Firma (dodávateľ)">
              <Select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Frekvencia">
              <Select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as 'monthly' | 'quarterly' | 'yearly' })}>
                <option value="monthly">Mesačne</option>
                <option value="quarterly">Štvrťročne</option>
                <option value="yearly">Ročne</option>
              </Select>
            </Field>
            <Field label="Prvá faktúra (dátum)">
              <Input type="date" value={form.next_generation_date} onChange={(e) => setForm({ ...form, next_generation_date: e.target.value })} />
            </Field>
            <Field label="Splatnosť (dni od vystavenia)">
              <Input type="number" value={form.due_days} onChange={(e) => setForm({ ...form, due_days: +e.target.value })} />
            </Field>
            <Field label="Mena">
              <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                <option value="EUR">EUR</option><option value="CZK">CZK</option><option value="USD">USD</option>
              </Select>
            </Field>
            <Field label="Stav">
              <label className="flex items-center gap-2 text-sm h-10">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Aktívna (auto-generuje)
              </label>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Zákazník" />
          <div className="p-5 space-y-4">
            <Field label={`Vybrať existujúceho (${contacts.length})`}>
              <div className="relative">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  <input type="text" value={contactQuery} onChange={(e) => { setContactQuery(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} onBlur={() => setTimeout(() => setShowDropdown(false), 200)} placeholder="Hľadaj podľa názvu alebo IČO…" className="w-full bg-white border border-zinc-200 rounded-lg pl-9 pr-3 py-2 text-sm" />
                </div>
                {showDropdown && filtered.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                    {filtered.map((c) => (
                      <button type="button" key={c.id} onClick={() => pick(c)} className="w-full text-left px-3 py-2 hover:bg-zinc-50 border-b border-zinc-100 last:border-0">
                        <div className="text-sm font-medium">{c.name}</div>
                        <div className="text-xs text-zinc-500 flex gap-3">{c.ico && <span>IČO: {c.ico}</span>}{c.email && <span>{c.email}</span>}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Názov *"><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required /></Field>
              <Field label="Email (kam posielať FA)"><Input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} placeholder="klient@firma.sk" /></Field>
              <Field label="IČO"><Input value={form.customer_ico} onChange={(e) => setForm({ ...form, customer_ico: e.target.value })} /></Field>
              <Field label="IČ DPH"><Input value={form.customer_ic_dph} onChange={(e) => setForm({ ...form, customer_ic_dph: e.target.value })} placeholder="SK..." /></Field>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Položky" action={<Button type="button" variant="secondary" onClick={() => setItems([...items, { description: '', quantity: 1, unit: 'mes', unit_price: 0, vat_rate: 23 }])}><Plus size={14} /> Pridať</Button>} />
          <div className="p-5 space-y-3">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_70px_110px_80px_60px] gap-2 items-end">
                <Field label={i === 0 ? 'Popis' : ''}><Input value={it.description} onChange={(e) => setItem(i, 'description', e.target.value)} placeholder="Napr. SaaS predplatné" /></Field>
                <Field label={i === 0 ? 'Množstvo' : ''}><Input type="number" step="0.01" value={it.quantity} onChange={(e) => setItem(i, 'quantity', +e.target.value)} /></Field>
                <Field label={i === 0 ? 'MJ' : ''}><Input value={it.unit} onChange={(e) => setItem(i, 'unit', e.target.value)} /></Field>
                <Field label={i === 0 ? 'Cena/ks' : ''}><Input type="number" step="0.01" value={it.unit_price} onChange={(e) => setItem(i, 'unit_price', +e.target.value)} /></Field>
                <Field label={i === 0 ? 'DPH%' : ''}>
                  <Select value={it.vat_rate} onChange={(e) => setItem(i, 'vat_rate', +e.target.value)}>
                    <option value={23}>23</option><option value={19}>19</option><option value={10}>10</option><option value={0}>0</option>
                  </Select>
                </Field>
                <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-red-500 hover:bg-red-50 p-2 rounded mb-1" disabled={items.length === 1}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <div className="border-t border-zinc-100 px-5 py-4 bg-zinc-50 flex justify-end gap-8 text-sm">
            <div><div className="text-xs text-zinc-500">Základ</div><div className="font-mono font-medium">{fmtEur(totals.subtotal)}</div></div>
            <div><div className="text-xs text-zinc-500">DPH</div><div className="font-mono font-medium">{fmtEur(totals.vat)}</div></div>
            <div><div className="text-xs text-zinc-500">Spolu / faktúra</div><div className="font-mono font-bold text-lg">{fmtEur(totals.total)}</div></div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Po vystavení" />
          <div className="p-5 space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.auto_send} onChange={(e) => setForm({ ...form, auto_send: e.target.checked })} />
              <span>Automaticky odoslať mailom (PDF + portál link) — vyžaduje email zákazníka</span>
            </label>
            <Field label="Poznámka na faktúre (voliteľné)">
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Napr. služba podľa zmluvy z 1.1.2026" />
            </Field>
          </div>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Ukladám…' : 'Vytvoriť šablónu'}</Button>
          <Link href="/dashboard/recurring"><Button type="button" variant="ghost">Zrušiť</Button></Link>
        </div>
      </form>

      <datalist id="mj-options-recurring">
        <option value="ks" /><option value="hod" /><option value="mes" /><option value="deň" /><option value="rok" />
        <option value="kg" /><option value="g" /><option value="tona" /><option value="l" /><option value="ml" />
        <option value="m" /><option value="m²" /><option value="m³" /><option value="km" />
        <option value="bal" /><option value="paleta" /><option value="sada" /><option value="pár" />
      </datalist>
    </div>
  );
}
