'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button, Input, Field, Card, CardHeader, PageHeader, Select } from '@/components/ui';
import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

export default function NewCustomerPage() {
  const router = useRouter();
  const toast = useToast();
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    company_id: '',
    type: 'customer',
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
  });
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('companies').select('id, name').is('deleted_at', null).order('name');
      setCompanies(data || []);
      if (data?.length) setForm((f) => ({ ...f, company_id: localStorage.getItem('zolo_firm') || data[0].id }));
    })();
  }, []);

  async function lookupIco() {
    if (!/^\d{8}$/.test(form.ico)) { toast('IČO musí mať 8 číslic', 'error'); return; }
    setLookingUp(true);
    try {
      const r = await fetch('https://orsr-lookup.joeblackino.workers.dev?ico=' + form.ico);
      if (!r.ok) throw new Error('Worker HTTP ' + r.status);
      const payload = await r.json();
      const data = payload.data || payload;
      if (!data.name) { toast('IČO sa nenašlo', 'error'); return; }
      let street = '', city = '', zip = '';
      if (data.address) {
        const parts = String(data.address).split(',').map((s: string) => s.trim());
        if (parts.length >= 2) {
          street = parts[0];
          const zipMatch = parts[1].match(/(\d{3}\s?\d{2})/);
          zip = zipMatch ? zipMatch[1] : '';
          city = parts[1].replace(/\d{3}\s?\d{2}/, '').replace(/-\s.*/, '').trim();
        } else street = String(data.address);
      }
      setForm((f) => ({
        ...f,
        name: data.name || f.name,
        dic: data.dic || f.dic,
        ic_dph: data.icDph || f.ic_dph,
        street: street || f.street,
        city: city || f.city,
        zip: zip || f.zip,
      }));
      toast('Údaje doplnené: ' + data.name, 'success');
    } catch (e) { toast((e as Error).message, 'error'); }
    finally { setLookingUp(false); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast('Názov je povinný', 'error'); return; }
    setSaving(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { toast('Nie si prihlásený', 'error'); setSaving(false); return; }
    const { error } = await sb.from('contacts').insert([{ ...form, created_by: user.id }]);
    if (error) { toast(error.message, 'error'); setSaving(false); return; }
    toast('Zákazník pridaný', 'success');
    router.push('/dashboard/customers');
    router.refresh();
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <PageHeader back={{ href: "/dashboard/customers" }} title="Nový zákazník" subtitle="Zadaj IČO — zvyšok sa doplní automaticky z ORSR" />

      <form onSubmit={save} className="space-y-4">
        <Card>
          <CardHeader title="Údaje zákazníka" />
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Patrí pod firmu">
              <Select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Typ">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="customer">Zákazník (odberateľ)</option>
                <option value="supplier">Dodávateľ</option>
                <option value="both">Oboje</option>
              </Select>
            </Field>
            <Field label="IČO">
              <div className="flex gap-2">
                <Input value={form.ico} onChange={(e) => setForm({ ...form, ico: e.target.value.trim() })} maxLength={8} />
                <Button type="button" variant="secondary" onClick={lookupIco} disabled={lookingUp}>
                  <Search size={14} /> {lookingUp ? '…' : 'ORSR'}
                </Button>
              </div>
            </Field>
            <Field label="Názov *">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="DIČ">
              <Input value={form.dic} onChange={(e) => setForm({ ...form, dic: e.target.value.trim() })} />
            </Field>
            <Field label="IČ DPH">
              <Input value={form.ic_dph} onChange={(e) => setForm({ ...form, ic_dph: e.target.value.trim() })} placeholder="SK..." />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Telefón">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Adresa" />
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Ulica">
              <Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
            </Field>
            <Field label="Mesto">
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
            <Field label="PSČ">
              <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
            </Field>
            <Field label="Krajina">
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </Field>
          </div>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Ukladám…' : 'Pridať zákazníka'}</Button>
          <Link href="/dashboard/customers"><Button type="button" variant="ghost">Zrušiť</Button></Link>
        </div>
      </form>
    </div>
  );
}
