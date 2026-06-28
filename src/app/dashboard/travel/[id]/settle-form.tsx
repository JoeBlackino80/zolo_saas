'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, Field, Input, Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { fmtEur } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export default function SettleForm({ orderId, companyId, advance }: { orderId: string; companyId: string; advance: number }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({
    meal_allowance: 0,
    vehicle_compensation: 0,
    accommodation: 0,
    other_expenses: 0,
    settlement_date: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);

  const total = form.meal_allowance + form.vehicle_compensation + form.accommodation + form.other_expenses;
  const difference = total - advance;

  async function settle() {
    if (total <= 0) { toast('Zadaj aspoň jednu sumu', 'error'); return; }
    setSaving(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { data: settled, error } = await sb.from('travel_settlements').insert({
      travel_order_id: orderId,
      company_id: companyId,
      total_expenses: total,
      meal_allowance: form.meal_allowance,
      vehicle_compensation: form.vehicle_compensation,
      accommodation: form.accommodation,
      other_expenses: form.other_expenses,
      advance_amount: advance,
      difference,
      settlement_date: form.settlement_date,
      created_by: user.id,
    }).select('id').single();
    if (error || !settled) { toast(error?.message || 'Chyba', 'error'); setSaving(false); return; }

    const { error: jeErr } = await sb.rpc('post_travel_settlement_journal', { p_settlement_id: settled.id });
    if (jeErr) console.warn('Travel journal skipped:', jeErr.message);

    toast('Vyúčtovanie zaúčtované', 'success');
    router.refresh();
  }

  return (
    <Card>
      <CardHeader title="Vyúčtovanie cestovného" subtitle="Po uložení sa vytvorí denníkový zápis MD 512 / D 335 + cash diff" />
      <div className="p-5 grid sm:grid-cols-2 gap-3">
        <Field label="Stravné (€)">
          <Input type="number" step="0.01" min="0" value={form.meal_allowance} onChange={(e) => setForm({ ...form, meal_allowance: Number(e.target.value) })} />
        </Field>
        <Field label="Vozidlo / km (€)">
          <Input type="number" step="0.01" min="0" value={form.vehicle_compensation} onChange={(e) => setForm({ ...form, vehicle_compensation: Number(e.target.value) })} />
        </Field>
        <Field label="Ubytovanie (€)">
          <Input type="number" step="0.01" min="0" value={form.accommodation} onChange={(e) => setForm({ ...form, accommodation: Number(e.target.value) })} />
        </Field>
        <Field label="Iné výdavky (€)">
          <Input type="number" step="0.01" min="0" value={form.other_expenses} onChange={(e) => setForm({ ...form, other_expenses: Number(e.target.value) })} />
        </Field>
        <Field label="Dátum vyúčtovania">
          <Input type="date" value={form.settlement_date} onChange={(e) => setForm({ ...form, settlement_date: e.target.value })} />
        </Field>
        <Field label="Preddavok">
          <div className="px-3 py-2 text-[13px] font-mono">{fmtEur(advance)}</div>
        </Field>
      </div>
      <div className="px-5 pb-5">
        <div className="flex justify-between mt-2 pt-3 border-t border-zinc-100">
          <span className="text-sm text-zinc-700">Celkom výdavky</span>
          <span className="font-mono">{fmtEur(total)}</span>
        </div>
        <div className="flex justify-between mt-1 font-bold">
          <span>Doplatok zamestnancovi / vrátenie</span>
          <span className={`font-mono ${difference > 0 ? 'text-emerald-700' : difference < 0 ? 'text-red-700' : ''}`}>{fmtEur(difference)}</span>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="primary" onClick={settle} disabled={saving}>
            {saving && <Loader2 size={14} className="animate-spin" />} Vyúčtovať a zaúčtovať
          </Button>
        </div>
      </div>
    </Card>
  );
}
