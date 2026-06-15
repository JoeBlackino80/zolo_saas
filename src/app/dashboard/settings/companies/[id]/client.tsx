'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button, Input, Field, Card, CardHeader, PageHeader, Select } from '@/components/ui';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

type Company = {
  id: string;
  name: string | null;
  ico: string | null;
  dic: string | null;
  ic_dph: string | null;
  street: string | null;
  city: string | null;
  zip: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  iban: string | null;
  bic: string | null;
  bank_name: string | null;
  is_vat_payer: boolean | null;
  business_type: string | null;
};

export default function EditCompanyClient({ company }: { company: Company }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({
    name: company.name || '',
    ico: company.ico || '',
    dic: company.dic || '',
    ic_dph: company.ic_dph || '',
    street: company.street || '',
    city: company.city || '',
    zip: company.zip || '',
    country: company.country || 'Slovensko',
    email: company.email || '',
    phone: company.phone || '',
    iban: company.iban || '',
    bic: company.bic || '',
    bank_name: company.bank_name || '',
    is_vat_payer: !!company.is_vat_payer,
    business_type: company.business_type || 'sro',
  });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const sb = createClient();
    const { error } = await sb.from('companies').update(form).eq('id', company.id);
    if (error) { toast(error.message, 'error'); setSaving(false); return; }
    toast('Firma uložená', 'success');
    router.push('/dashboard/settings');
    router.refresh();
  }

  async function softDelete() {
    if (!confirm(`Naozaj zmazať firmu "${company.name}"? (soft-delete — dáta zostanú v cloude)`)) return;
    const sb = createClient();
    const { error } = await sb.from('companies').update({ deleted_at: new Date().toISOString() }).eq('id', company.id);
    if (error) { toast(error.message, 'error'); return; }
    toast('Firma zmazaná', 'success');
    router.push('/dashboard/settings');
    router.refresh();
  }

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/dashboard/settings" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-3">
        <ArrowLeft size={14} /> Späť na nastavenia
      </Link>
      <PageHeader title={`Upraviť: ${company.name}`} subtitle="Zmena údajov firmy ovplyvní budúce faktúry a výkazy" />

      <form onSubmit={save} className="space-y-4">
        <Card>
          <CardHeader title="Základné údaje" />
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label="Názov *">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Typ podnikania">
              <Select value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })}>
                <option value="sro">s.r.o.</option>
                <option value="as">a.s.</option>
                <option value="szco">SZČO</option>
                <option value="other">Iné</option>
              </Select>
            </Field>
            <Field label="IČO">
              <Input value={form.ico} onChange={(e) => setForm({ ...form, ico: e.target.value.trim() })} maxLength={8} />
            </Field>
            <Field label="DIČ">
              <Input value={form.dic} onChange={(e) => setForm({ ...form, dic: e.target.value.trim() })} />
            </Field>
            <Field label="IČ DPH">
              <Input value={form.ic_dph} onChange={(e) => setForm({ ...form, ic_dph: e.target.value.trim() })} />
            </Field>
            <Field label="Platca DPH">
              <label className="flex items-center gap-2 text-sm h-10">
                <input type="checkbox" checked={form.is_vat_payer} onChange={(e) => setForm({ ...form, is_vat_payer: e.target.checked })} />
                Áno
              </label>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Adresa" />
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label="Ulica"><Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} /></Field>
            <Field label="Mesto"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
            <Field label="PSČ"><Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></Field>
            <Field label="Krajina"><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Banka & kontakt" />
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label="IBAN"><Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value.toUpperCase().replace(/\s/g, '') })} /></Field>
            <Field label="BIC"><Input value={form.bic} onChange={(e) => setForm({ ...form, bic: e.target.value.toUpperCase() })} /></Field>
            <Field label="Banka"><Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Telefón"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          </div>
        </Card>

        <div className="flex justify-between">
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Ukladám…' : 'Uložiť zmeny'}</Button>
            <Link href="/dashboard/settings"><Button type="button" variant="ghost">Zrušiť</Button></Link>
          </div>
          <Button type="button" variant="danger" onClick={softDelete}>
            <Trash2 size={14} /> Zmazať firmu
          </Button>
        </div>
      </form>
    </div>
  );
}
