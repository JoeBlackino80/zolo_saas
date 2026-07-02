'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button, Input, Field, Card, CardHeader, PageHeader, Select } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

export default function NewBankAccountPage() {
  const router = useRouter();
  const toast = useToast();
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    company_id: '', name: '', iban: '', bic: '', bank_name: '',
    currency: 'EUR', synth_account: '221', opening_balance: 0, is_active: true,
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
    if (!form.name || !form.iban) { toast('Názov a IBAN sú povinné', 'error'); return; }
    setSaving(true);
    const { error } = await createClient().from('bank_accounts').insert([form]);
    if (error) { toast(error.message, 'error'); setSaving(false); return; }
    toast('Účet pridaný', 'success');
    router.push('/dashboard/bank-accounts');
    router.refresh();
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <PageHeader back={{ href: "/dashboard/bank-accounts" }} title="Nový bankový účet" />

      <form onSubmit={save} className="space-y-4">
        <Card>
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label="Firma"><Select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Mena"><Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}><option>EUR</option><option>CZK</option><option>USD</option></Select></Field>
            <Field label="Názov účtu *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Bežný účet Tatra" required /></Field>
            <Field label="Banka"><Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="Tatra banka" /></Field>
            <Field label="IBAN *"><Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value.toUpperCase().replace(/\s/g, '') })} placeholder="SK..." required /></Field>
            <Field label="BIC / SWIFT"><Input value={form.bic} onChange={(e) => setForm({ ...form, bic: e.target.value.toUpperCase() })} placeholder="TATRSKBX" /></Field>
            <Field label="Syntetický účet"><Input value={form.synth_account} onChange={(e) => setForm({ ...form, synth_account: e.target.value })} placeholder="221" /></Field>
            <Field label="Počiatočný zostatok"><Input type="number" step="0.01" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: +e.target.value || 0 })} /></Field>
          </div>
        </Card>
        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Ukladám…' : 'Pridať účet'}</Button>
          <Link href="/dashboard/bank-accounts"><Button type="button" variant="ghost">Zrušiť</Button></Link>
        </div>
      </form>
    </div>
  );
}
