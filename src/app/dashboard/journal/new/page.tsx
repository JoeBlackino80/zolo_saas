'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button, Input, Field, Card, CardHeader, PageHeader, Select } from '@/components/ui';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { fmtEur } from '@/lib/utils';
import { useToast } from '@/components/Toast';

type Line = { account_code: string; debit_amount: number; credit_amount: number; description?: string };

export default function NewJournalEntryPage() {
  const router = useRouter();
  const toast = useToast();
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    company_id: '', entry_date: new Date().toISOString().slice(0, 10),
    description: '', entry_number: '',
  });
  const [lines, setLines] = useState<Line[]>([
    { account_code: '', debit_amount: 0, credit_amount: 0 },
    { account_code: '', debit_amount: 0, credit_amount: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('companies').select('id, name').is('deleted_at', null).order('name');
      setCompanies(data || []);
      if (data?.length) setForm((f) => ({ ...f, company_id: localStorage.getItem('zolo_firm') || data[0].id }));
    })();
  }, []);

  function setLine(i: number, key: keyof Line, val: string | number) {
    const next = [...lines];
    // @ts-expect-error generic
    next[i][key] = val;
    setLines(next);
  }

  const totalDebit = lines.reduce((s, l) => s + (+l.debit_amount || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (+l.credit_amount || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!balanced) { toast('MD musí sa rovnať Dal', 'error'); return; }
    if (totalDebit === 0) { toast('Suma nemôže byť 0', 'error'); return; }
    setSaving(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    const { data: entry, error } = await sb.from('journal_entries').insert([{
      ...form,
      created_by: user?.id,
    }]).select().single();
    if (error) { toast(error.message, 'error'); setSaving(false); return; }
    const lineRows = lines.filter((l) => l.account_code && (l.debit_amount || l.credit_amount)).map((l, i) => ({
      company_id: form.company_id,
      journal_entry_id: entry.id,
      line_number: i + 1,
      account_code: l.account_code,
      debit_amount: +l.debit_amount || 0,
      credit_amount: +l.credit_amount || 0,
      description: l.description || '',
    }));
    await sb.from('journal_entry_lines').insert(lineRows);
    toast('Zápis uložený', 'success');
    router.push('/dashboard/journal');
    router.refresh();
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <PageHeader back={{ href: "/dashboard/journal" }} title="Nový účtovný zápis" subtitle="Podvojné účtovanie: MD = Dal" />

      <form onSubmit={save} className="space-y-4">
        <Card>
          <CardHeader title="Hlavička zápisu" />
          <div className="p-5 grid grid-cols-3 gap-4">
            <Field label="Firma"><Select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Dátum"><Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} /></Field>
            <Field label="Číslo zápisu"><Input value={form.entry_number} onChange={(e) => setForm({ ...form, entry_number: e.target.value })} placeholder="auto" /></Field>
            <div className="col-span-3"><Field label="Popis"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="napr. Nájomné za jún 2026" /></Field></div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Účtovné riadky"
            action={<Button type="button" variant="secondary" onClick={() => setLines([...lines, { account_code: '', debit_amount: 0, credit_amount: 0 }])}><Plus size={14} /> Pridať riadok</Button>}
          />
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-[120px_1fr_130px_130px_50px] gap-2 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
              <div>Účet</div>
              <div>Popis</div>
              <div className="text-right">Má dať (D)</div>
              <div className="text-right">Dal (C)</div>
              <div></div>
            </div>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[120px_1fr_130px_130px_50px] gap-2 items-center">
                <Input value={l.account_code} onChange={(e) => setLine(i, 'account_code', e.target.value)} placeholder="napr. 311" className="font-mono" />
                <Input value={l.description || ''} onChange={(e) => setLine(i, 'description', e.target.value)} />
                <Input type="number" step="0.01" value={l.debit_amount} onChange={(e) => setLine(i, 'debit_amount', +e.target.value || 0)} className="font-mono text-right" />
                <Input type="number" step="0.01" value={l.credit_amount} onChange={(e) => setLine(i, 'credit_amount', +e.target.value || 0)} className="font-mono text-right" />
                <button type="button" onClick={() => setLines(lines.filter((_, j) => j !== i))} className="text-red-500 hover:bg-red-50 p-2 rounded" disabled={lines.length === 1}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <div className="border-t border-zinc-100 px-5 py-4 bg-zinc-50">
            <div className="flex justify-end gap-8 text-sm font-mono">
              <div><div className="text-xs text-zinc-500">Σ MD</div><div className="font-bold">{fmtEur(totalDebit)}</div></div>
              <div><div className="text-xs text-zinc-500">Σ Dal</div><div className="font-bold">{fmtEur(totalCredit)}</div></div>
              <div><div className="text-xs text-zinc-500">Rozdiel</div><div className={`font-bold ${balanced ? 'text-emerald-600' : 'text-red-600'}`}>{fmtEur(totalDebit - totalCredit)} {balanced ? '✓' : '✗'}</div></div>
            </div>
          </div>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving || !balanced}>{saving ? 'Ukladám…' : 'Uložiť zápis'}</Button>
          <Link href="/dashboard/journal"><Button type="button" variant="ghost">Zrušiť</Button></Link>
        </div>
      </form>
    </div>
  );
}
