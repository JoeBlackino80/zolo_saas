'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button, Input, Field, Card, CardHeader, PageHeader, Select } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

// SK odpisové skupiny § 26 ZDP
const DEPRECIATION_GROUPS = [
  { code: '0', years: 2, label: 'Skupina 0 — 2 roky (počítače, IT vybavenie)' },
  { code: '1', years: 4, label: 'Skupina 1 — 4 roky (kancelárske zariadenia, autá)' },
  { code: '2', years: 6, label: 'Skupina 2 — 6 rokov (stroje, prístroje)' },
  { code: '3', years: 8, label: 'Skupina 3 — 8 rokov (priemyselné stroje)' },
  { code: '4', years: 12, label: 'Skupina 4 — 12 rokov (drevené stavby)' },
  { code: '5', years: 20, label: 'Skupina 5 — 20 rokov (administratívne budovy)' },
  { code: '6', years: 40, label: 'Skupina 6 — 40 rokov (rezidenčné budovy)' },
];

export default function NewAssetPage() {
  const router = useRouter();
  const toast = useToast();
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    company_id: '',
    name: '',
    inventory_number: '',
    acquisition_price: 0,
    acquisition_date: new Date().toISOString().slice(0, 10),
    depreciation_category: '1',
    depreciation_method: 'straight_line',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('companies').select('id, name').is('deleted_at', null).order('name');
      setCompanies(data || []);
      if (data?.length) setForm((f) => ({ ...f, company_id: localStorage.getItem('zolo_firm') || data[0].id }));
    })();
  }, []);

  const group = DEPRECIATION_GROUPS.find((g) => g.code === form.depreciation_category)!;
  const yearlyDep = form.acquisition_price / group.years;
  const monthlyDep = yearlyDep / 12;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast('Názov je povinný', 'error'); return; }
    setSaving(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { toast('Nie si prihlásený', 'error'); setSaving(false); return; }
    const { error } = await sb.from('assets').insert([{ ...form, created_by: user.id }]);
    if (error) { toast(error.message, 'error'); setSaving(false); return; }
    toast('Majetok pridaný', 'success');
    router.push('/dashboard/assets');
    router.refresh();
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <Link href="/dashboard/assets" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-3">
        <ArrowLeft size={14} /> Späť na majetok
      </Link>
      <PageHeader title="Nový majetok" subtitle="DHM / DNM s automatickým výpočtom odpisov podľa § 26 ZDP" />

      <form onSubmit={save} className="space-y-4">
        <Card>
          <CardHeader title="Údaje majetku" />
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label="Patrí pod firmu">
              <Select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Inventárne číslo">
              <Input value={form.inventory_number} onChange={(e) => setForm({ ...form, inventory_number: e.target.value })} placeholder="INV-001" />
            </Field>
            <Field label="Názov *">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="MacBook Pro 16" required />
            </Field>
            <Field label="Obstarávacia cena (€)">
              <Input type="number" step="0.01" value={form.acquisition_price} onChange={(e) => setForm({ ...form, acquisition_price: +e.target.value || 0 })} required />
            </Field>
            <Field label="Dátum obstarania">
              <Input type="date" value={form.acquisition_date} onChange={(e) => setForm({ ...form, acquisition_date: e.target.value })} />
            </Field>
            <Field label="Spôsob odpisovania">
              <Select value={form.depreciation_method} onChange={(e) => setForm({ ...form, depreciation_method: e.target.value })}>
                <option value="straight_line">Rovnomerný</option>
                <option value="accelerated">Zrýchlený</option>
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Odpisová skupina (§ 26 ZDP)" />
          <div className="p-5">
            <Field label="Skupina">
              <Select value={form.depreciation_category} onChange={(e) => setForm({ ...form, depreciation_category: e.target.value })}>
                {DEPRECIATION_GROUPS.map((g) => <option key={g.code} value={g.code}>{g.label}</option>)}
              </Select>
            </Field>
            {form.acquisition_price > 0 && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-600">Obstarávacia cena</span><span className="font-mono">{form.acquisition_price.toFixed(2)} €</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Doba odpisovania</span><span className="font-mono">{group.years} rokov</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Ročný odpis</span><span className="font-mono font-semibold">{yearlyDep.toFixed(2)} €</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Mesačný odpis</span><span className="font-mono">{monthlyDep.toFixed(2)} €</span></div>
                <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200">Účtovne: 551 / 082 (odpisy / oprávky) každý rok cez celé obdobie.</div>
              </div>
            )}
          </div>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Ukladám…' : 'Pridať majetok'}</Button>
          <Link href="/dashboard/assets"><Button type="button" variant="ghost">Zrušiť</Button></Link>
        </div>
      </form>
    </div>
  );
}
