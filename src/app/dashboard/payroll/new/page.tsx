'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button, Input, Field, Card, CardHeader, PageHeader, Select } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

export default function NewEmployeePage() {
  const router = useRouter();
  const toast = useToast();
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    company_id: '', name: '', surname: '', date_of_birth: '', rodne_cislo: '',
    id_number: '', address_street: '', address_city: '', address_zip: '',
    iban: '', health_insurance: '', sp_registration_number: '', marital_status: 'single',
    active: true,
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

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.surname) { toast('Meno a priezvisko sú povinné', 'error'); return; }
    setSaving(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setSaving(false); return; }
    const payload = { ...form, date_of_birth: form.date_of_birth || null, created_by: user.id };
    const { error } = await sb.from('employees').insert([payload]);
    if (error) { toast(error.message, 'error'); setSaving(false); return; }
    toast('Zamestnanec pridaný', 'success');
    router.push('/dashboard/payroll');
    router.refresh();
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <Link href="/dashboard/payroll" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-3"><ArrowLeft size={14} /> Späť</Link>
      <PageHeader title="Nový zamestnanec" subtitle="Údaje pre mzdový list" />

      <form onSubmit={save} className="space-y-4">
        <Card>
          <CardHeader title="Osobné údaje" />
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label="Firma"><Select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Stav"><Select value={form.marital_status} onChange={(e) => setForm({ ...form, marital_status: e.target.value })}><option value="single">Slobodný/á</option><option value="married">Ženatý/Vydatá</option><option value="divorced">Rozvedený/á</option><option value="widowed">Vdovec/Vdova</option></Select></Field>
            <Field label="Meno *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="Priezvisko *"><Input value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} required /></Field>
            <Field label="Dátum narodenia"><Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></Field>
            <Field label="Rodné číslo"><Input value={form.rodne_cislo} onChange={(e) => setForm({ ...form, rodne_cislo: e.target.value })} placeholder="000000/0000" /></Field>
            <Field label="Číslo OP"><Input value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} /></Field>
            <Field label="IBAN (mzda)"><Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value.toUpperCase().replace(/\s/g, '') })} /></Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Adresa" />
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label="Ulica"><Input value={form.address_street} onChange={(e) => setForm({ ...form, address_street: e.target.value })} /></Field>
            <Field label="Mesto"><Input value={form.address_city} onChange={(e) => setForm({ ...form, address_city: e.target.value })} /></Field>
            <Field label="PSČ"><Input value={form.address_zip} onChange={(e) => setForm({ ...form, address_zip: e.target.value })} /></Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Poisťovne" />
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label="Zdravotná poisťovňa">
              <Select value={form.health_insurance} onChange={(e) => setForm({ ...form, health_insurance: e.target.value })}>
                <option value="">Vyber…</option>
                <option value="VSZP">Všeobecná zdravotná poisťovňa</option>
                <option value="Dovera">Dôvera</option>
                <option value="Union">Union</option>
              </Select>
            </Field>
            <Field label="SP registračné číslo"><Input value={form.sp_registration_number} onChange={(e) => setForm({ ...form, sp_registration_number: e.target.value })} /></Field>
          </div>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Ukladám…' : 'Pridať zamestnanca'}</Button>
          <Link href="/dashboard/payroll"><Button type="button" variant="ghost">Zrušiť</Button></Link>
        </div>
      </form>
    </div>
  );
}
