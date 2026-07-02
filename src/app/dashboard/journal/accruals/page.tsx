'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CalendarRange } from 'lucide-react';
import { PageHeader, Card, Field, Input, Select, Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { fmtEur } from '@/lib/utils';

export default function AccrualsPage() {
  const router = useRouter();
  const toast = useToast();
  const [companyId, setCompanyId] = useState('');
  const [form, setForm] = useState({
    type: 'cost' as 'cost' | 'revenue',
    total_amount: 1200,
    start_date: new Date().toISOString().slice(0, 10),
    months: 12,
    counter_account: '518',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cid = typeof window !== 'undefined' ? localStorage.getItem('zolo_firm') : null;
    if (cid) setCompanyId(cid);
  }, []);

  const perMonth = form.months > 0 ? form.total_amount / form.months : 0;

  async function save() {
    if (!companyId) { toast('Vyber firmu v sidebare', 'error'); return; }
    if (!form.description) { toast('Doplň popis', 'error'); return; }
    setSaving(true);
    const sb = createClient();
    const { data, error } = await sb.rpc('post_accrual_schedule', {
      p_company_id: companyId,
      p_type: form.type,
      p_total_amount: form.total_amount,
      p_start_date: form.start_date,
      p_months: form.months,
      p_counter_account: form.counter_account,
      p_description: form.description,
    });
    setSaving(false);
    if (error) { toast(error.message, 'error'); return; }
    toast(`Vytvorených ${data} mesačných zápisov`, 'success');
    router.push('/dashboard/journal');
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <PageHeader back={{ href: "/dashboard/journal" }} title="Časové rozlíšenie" subtitle="Rovnomerné rozloženie nákladu / výnosu na viac mesiacov (381 / 384)" />

      <Card>
        <div className="p-5 space-y-4">
          <Field label="Typ">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'cost' | 'revenue', counter_account: e.target.value === 'cost' ? '518' : '602' })}>
              <option value="cost">Náklad budúcich období (381 → 5xx)</option>
              <option value="revenue">Výnos budúcich období (384 → 6xx)</option>
            </Select>
          </Field>
          <Field label="Popis (napr. Poistné 2026, Predplatné SaaS)">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Celková suma (€)">
              <Input type="number" step="0.01" min="0" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: Number(e.target.value) })} />
            </Field>
            <Field label="Počet mesiacov">
              <Input type="number" min="1" value={form.months} onChange={(e) => setForm({ ...form, months: parseInt(e.target.value, 10) || 1 })} />
            </Field>
            <Field label="Začiatok obdobia">
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </Field>
            <Field label={form.type === 'cost' ? 'Nákladový účet (5xx)' : 'Výnosový účet (6xx)'}>
              <Input value={form.counter_account} onChange={(e) => setForm({ ...form, counter_account: e.target.value })} placeholder={form.type === 'cost' ? '518 / 501 / 521…' : '602 / 604 / 648…'} />
            </Field>
          </div>
          <div className="bg-zinc-50 rounded-lg p-3 text-sm flex justify-between">
            <span>Mesačná suma:</span>
            <span className="font-mono font-bold">{fmtEur(perMonth)}</span>
          </div>
          <div className="bg-zinc-50 rounded-lg p-3 text-xs text-zinc-600 leading-relaxed flex gap-2">
            <CalendarRange size={14} className="shrink-0 mt-0.5" />
            <div>
              Vytvorí <strong>{form.months}</strong> ID-typov denníkových zápisov, jeden za každý mesiac obdobia.
              {form.type === 'cost'
                ? ` Vzor: MD ${form.counter_account} ${fmtEur(perMonth)} / D 381 ${fmtEur(perMonth)}`
                : ` Vzor: MD 384 ${fmtEur(perMonth)} / D ${form.counter_account} ${fmtEur(perMonth)}`
              }
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Link href="/dashboard/journal"><Button variant="ghost">Zrušiť</Button></Link>
            <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Vytváram…' : 'Vytvoriť zápisy'}</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
