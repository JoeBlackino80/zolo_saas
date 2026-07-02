'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button, Input, Field, Card, CardHeader, PageHeader } from '@/components/ui';
import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';

export default function NewCompanyPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    ico: '',
    dic: '',
    ic_dph: '',
    street: '',
    city: '',
    zip: '',
    country: 'Slovensko',
    email: '',
    phone: '',
    iban: '',
    bic: '',
    bank_name: '',
    is_vat_payer: false,
    business_type: 'sro',
  });
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm({ ...form, [key]: val });
  }

  async function lookupIco() {
    if (!form.ico || !/^\d{8}$/.test(form.ico)) {
      setError('IČO musí mať 8 číslic');
      return;
    }
    setLookingUp(true);
    setError(null);
    try {
      const url = 'https://orsr-lookup.joeblackino.workers.dev?ico=' + form.ico;
      const r = await fetch(url);
      if (!r.ok) throw new Error('Worker HTTP ' + r.status);
      const payload = await r.json();
      const data = payload.data || payload;
      if (!data.name) {
        setError('IČO sa nenašlo v ORSR/Finstat. Vyplň údaje ručne.');
        return;
      }
      let street = '', city = '', zip = '';
      if (data.address) {
        const parts = String(data.address).split(',').map((s: string) => s.trim());
        if (parts.length >= 2) {
          street = parts[0];
          const zipMatch = parts[1].match(/(\d{3}\s?\d{2})/);
          zip = zipMatch ? zipMatch[1] : '';
          city = parts[1].replace(/\d{3}\s?\d{2}/, '').replace(/-\s.*/, '').trim();
        } else {
          street = String(data.address);
        }
      }
      setForm({
        ...form,
        name: data.name || form.name,
        dic: data.dic || form.dic,
        ic_dph: data.icDph || form.ic_dph,
        street: street || form.street,
        city: city || form.city,
        zip: zip || form.zip,
        is_vat_payer: !!data.icDph || form.is_vat_payer,
      });
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLookingUp(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Názov firmy je povinný');
      return;
    }
    setSaving(true);
    setError(null);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      setError('Nie si prihlásený');
      setSaving(false);
      return;
    }
    const { error } = await sb
      .from('companies')
      .insert([{ ...form, created_by: user.id }])
      .select()
      .single();
    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }
    // admin role granted automatically by auto_grant_company_admin_trigger
    router.push('/dashboard/settings');
    router.refresh();
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <PageHeader back={{ href: "/dashboard/settings" }} title="Nová firma" subtitle="Začni zadaním IČO — zvyšok sa auto-doplní z ORSR" />

      <form onSubmit={save} className="space-y-4">
        <Card>
          <CardHeader title="Základné údaje" />
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="IČO">
              <div className="flex gap-2">
                <Input value={form.ico} onChange={(e) => set('ico', e.target.value.trim())} placeholder="12345678" maxLength={8} />
                <Button type="button" variant="secondary" onClick={lookupIco} disabled={lookingUp}>
                  <Search size={14} /> {lookingUp ? 'Hľadám…' : 'ORSR'}
                </Button>
              </div>
            </Field>
            <Field label="Typ podnikania">
              <select
                value={form.business_type}
                onChange={(e) => set('business_type', e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900"
              >
                <option value="sro">s.r.o.</option>
                <option value="as">a.s.</option>
                <option value="szco">SZČO / živnostník</option>
                <option value="other">Iné</option>
              </select>
            </Field>
            <Field label="Názov firmy *">
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Moja Firma s.r.o." required />
            </Field>
            <Field label="DIČ">
              <Input value={form.dic} onChange={(e) => set('dic', e.target.value.trim())} placeholder="1234567890" />
            </Field>
            <Field label="IČ DPH">
              <Input value={form.ic_dph} onChange={(e) => set('ic_dph', e.target.value.trim())} placeholder="SK1234567890" />
            </Field>
            <Field label="Platca DPH">
              <label className="flex items-center gap-2 text-sm h-10">
                <input type="checkbox" checked={form.is_vat_payer} onChange={(e) => set('is_vat_payer', e.target.checked)} />
                Áno, je registrovaná
              </label>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Adresa" />
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Ulica">
              <Input value={form.street} onChange={(e) => set('street', e.target.value)} placeholder="Hlavná 123" />
            </Field>
            <Field label="Mesto">
              <Input value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Bratislava" />
            </Field>
            <Field label="PSČ">
              <Input value={form.zip} onChange={(e) => set('zip', e.target.value)} placeholder="81101" />
            </Field>
            <Field label="Krajina">
              <Input value={form.country} onChange={(e) => set('country', e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Bankové údaje" subtitle="Použijú sa na faktúrach" />
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="IBAN">
              <Input value={form.iban} onChange={(e) => set('iban', e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="SK..." />
            </Field>
            <Field label="BIC / SWIFT">
              <Input value={form.bic} onChange={(e) => set('bic', e.target.value.toUpperCase())} placeholder="TATRSKBX" />
            </Field>
            <Field label="Banka">
              <Input value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} placeholder="Tatra banka" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="info@firma.sk" />
            </Field>
          </div>
        </Card>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-lg">{error}</div>
        )}

        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Ukladám…' : 'Vytvoriť firmu'}
          </Button>
          <Link href="/dashboard/settings">
            <Button type="button" variant="ghost">
              Zrušiť
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
