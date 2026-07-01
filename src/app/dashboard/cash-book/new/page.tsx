'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button, Input, Field, Card, PageHeader, Select } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

export default function NewCashEntryPage() {
  const router = useRouter();
  const toast = useToast();
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    company_id: '', entry_date: new Date().toISOString().slice(0, 10),
    type: 'income', category: '', amount: 0, is_tax_relevant: true,
    description: '', document_number: '', source: '',
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
    setSaving(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    const { data: inserted, error } = await sb.from('cash_book_entries').insert([{ ...form, created_by: user?.id }]).select('id').single();
    if (error) { toast(error.message, 'error'); setSaving(false); return; }
    if (inserted?.id) {
      const { error: jeErr } = await sb.rpc('post_cashbook_journal', { p_entry_id: inserted.id });
      if (jeErr) console.warn('Cashbook journal skipped:', jeErr.message);
    }
    toast('Zápis pridaný · denníkový zápis vytvorený', 'success');
    router.push('/dashboard/cash-book');
    router.refresh();
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <Link href="/dashboard/cash-book" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-3"><ArrowLeft size={14} /> Späť</Link>
      <PageHeader title="Nový zápis do pokladne" subtitle="PPD (príjmovka) alebo VPD (výdavkový)" />

      <form onSubmit={save} className="space-y-4">
        <Card>
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label="Firma"><Select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Dátum"><Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} /></Field>
            <Field label="Typ"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="income">Príjem (PPD)</option><option value="expense">Výdaj (VPD)</option></Select></Field>
            <Field label="Kategória"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="napr. Tržby / Materiál" /></Field>
            <Field label="Suma *"><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value || 0 })} required /></Field>
            <Field label="Číslo dokladu"><Input value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} placeholder="PPD-001" /></Field>
            <div className="col-span-2"><Field label="Popis"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
            <Field label="Daňový vplyv">
              <label className="flex items-center gap-2 text-sm h-10">
                <input type="checkbox" checked={form.is_tax_relevant} onChange={(e) => setForm({ ...form, is_tax_relevant: e.target.checked })} />
                Áno, vstupuje do daňového základu
              </label>
            </Field>
          </div>
        </Card>
        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Ukladám…' : 'Uložiť zápis'}</Button>
          <Link href="/dashboard/cash-book"><Button type="button" variant="ghost">Zrušiť</Button></Link>
        </div>
      </form>
    </div>
  );
}
