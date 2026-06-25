'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button, Input, Field, Card, PageHeader, Select } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

export default function NewAccountPage() {
  const router = useRouter();
  const toast = useToast();
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    company_id: '', account_code: '', account_name: '', account_type: 'asset', is_active: true,
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
    if (!form.account_code || !form.account_name) { toast('Kód a názov sú povinné', 'error'); return; }
    setSaving(true);
    const { error } = await createClient().from('chart_of_accounts').insert([form]);
    if (error) { toast(error.message, 'error'); setSaving(false); return; }
    toast('Účet pridaný', 'success');
    router.push('/dashboard/chart-of-accounts');
    router.refresh();
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <Link href="/dashboard/chart-of-accounts" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-3"><ArrowLeft size={14} /> Späť</Link>
      <PageHeader title="Nový účet" subtitle="Pridať do účtovej osnovy" />

      <form onSubmit={save} className="space-y-4">
        <Card>
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label="Firma"><Select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Typ"><Select value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })}><option value="asset">Aktívum</option><option value="liability">Pasívum</option><option value="equity">Vlastný kapitál</option><option value="revenue">Výnos</option><option value="expense">Náklad</option></Select></Field>
            <Field label="Kód účtu *"><Input value={form.account_code} onChange={(e) => setForm({ ...form, account_code: e.target.value })} placeholder="311" className="font-mono" required /></Field>
            <Field label="Názov účtu *"><Input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} placeholder="Odberatelia" required /></Field>
          </div>
        </Card>
        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Ukladám…' : 'Pridať účet'}</Button>
          <Link href="/dashboard/chart-of-accounts"><Button type="button" variant="ghost">Zrušiť</Button></Link>
        </div>
      </form>
    </div>
  );
}
