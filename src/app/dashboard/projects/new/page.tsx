'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button, Input, Field, Card, PageHeader, Select } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

export default function NewProjectPage() {
  const router = useRouter();
  const toast = useToast();
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    company_id: '', code: '', name: '', start_date: '', end_date: '', budget: 0, is_active: true,
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
    if (!form.name) { toast('Názov povinný', 'error'); return; }
    setSaving(true);
    const { error } = await createClient().from('projects').insert([{
      ...form,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    }]);
    if (error) { toast(error.message, 'error'); setSaving(false); return; }
    toast('Projekt vytvorený', 'success');
    router.push('/dashboard/projects');
    router.refresh();
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <Link href="/dashboard/projects" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-3"><ArrowLeft size={14} /> Späť</Link>
      <PageHeader title="Nový projekt" />

      <form onSubmit={save} className="space-y-4">
        <Card>
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label="Firma"><Select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Kód projektu"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="PROJ-001" /></Field>
            <Field label="Názov *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="Rozpočet (€)"><Input type="number" step="100" value={form.budget} onChange={(e) => setForm({ ...form, budget: +e.target.value || 0 })} /></Field>
            <Field label="Začiatok"><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
            <Field label="Koniec"><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></Field>
          </div>
        </Card>
        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Ukladám…' : 'Vytvoriť projekt'}</Button>
          <Link href="/dashboard/projects"><Button type="button" variant="ghost">Zrušiť</Button></Link>
        </div>
      </form>
    </div>
  );
}
