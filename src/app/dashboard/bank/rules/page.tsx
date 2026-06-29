'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { PageHeader, Card, Field, Input, Button, Badge } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';

type Rule = { id: string; name: string; conditions: Record<string, string>; account_debit: string | null; account_credit: string | null; priority: number; is_active: boolean };

export default function BankRulesPage() {
  const toast = useToast();
  const [companyId, setCompanyId] = useState('');
  const [rules, setRules] = useState<Rule[]>([]);
  const [draft, setDraft] = useState({
    name: '',
    contains: '',
    counterparty_iban: '',
    account_debit: '221',
    account_credit: '648',
    priority: 100,
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    const sb = createClient();
    const cid = typeof window !== 'undefined' ? localStorage.getItem('zolo_firm') : null;
    if (cid) setCompanyId(cid);
    let q = sb.from('bank_matching_rules').select('id, name, conditions, account_debit, account_credit, priority, is_active').order('priority', { ascending: true });
    if (cid) q = q.eq('company_id', cid);
    const { data } = await q;
    setRules((data as Rule[]) || []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!draft.name) { toast('Zadaj názov pravidla', 'error'); return; }
    setSaving(true);
    const sb = createClient();
    const conditions: Record<string, string> = {};
    if (draft.contains) conditions.description_contains = draft.contains;
    if (draft.counterparty_iban) conditions.counterparty_iban = draft.counterparty_iban;
    const { error } = await sb.from('bank_matching_rules').insert({
      company_id: companyId,
      name: draft.name,
      conditions,
      account_debit: draft.account_debit || null,
      account_credit: draft.account_credit || null,
      priority: draft.priority,
      is_active: true,
    });
    setSaving(false);
    if (error) { toast(error.message, 'error'); return; }
    setDraft({ ...draft, name: '', contains: '', counterparty_iban: '' });
    toast('Pravidlo pridané', 'success');
    load();
  }

  async function toggle(id: string, active: boolean) {
    const sb = createClient();
    await sb.from('bank_matching_rules').update({ is_active: !active }).eq('id', id);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Zmazať pravidlo?')) return;
    const sb = createClient();
    await sb.from('bank_matching_rules').delete().eq('id', id);
    load();
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <Link href="/dashboard/bank" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-3">
        <ArrowLeft size={14} /> Späť
      </Link>
      <PageHeader title="Pravidlá auto-účtovania" subtitle="Pri importe bankového výpisu sa nezospárované transakcie skúsia napárovať podľa týchto pravidiel" />

      <Card className="mb-4">
        <div className="p-5">
          <div className="text-sm font-semibold mb-3">Pridať pravidlo</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Názov *">
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="napr. SIPO platba" />
            </Field>
            <Field label="Priorita (nižšie = skôr)">
              <Input type="number" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: parseInt(e.target.value, 10) || 100 })} />
            </Field>
            <Field label="Popis obsahuje (alebo IBAN protistrany)">
              <Input value={draft.contains} onChange={(e) => setDraft({ ...draft, contains: e.target.value })} placeholder="SIPO / Telekom / etc." />
            </Field>
            <Field label="Protistrana IBAN (voliteľné)">
              <Input value={draft.counterparty_iban} onChange={(e) => setDraft({ ...draft, counterparty_iban: e.target.value })} placeholder="SK…" />
            </Field>
            <Field label="MD účet">
              <Input value={draft.account_debit} onChange={(e) => setDraft({ ...draft, account_debit: e.target.value })} placeholder="221 / 518 / 501…" />
            </Field>
            <Field label="D účet">
              <Input value={draft.account_credit} onChange={(e) => setDraft({ ...draft, account_credit: e.target.value })} placeholder="221 / 311 / 321…" />
            </Field>
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="primary" onClick={add} disabled={saving || !draft.name}>
              <Plus size={14} /> {saving ? 'Pridávam…' : 'Pridať'}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="px-5 py-3 border-b border-zinc-100 text-sm font-semibold">{rules.length} pravidiel</div>
        {rules.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-500">Žiadne pravidlá zatiaľ. Pridaj prvé hore.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {rules.map((r) => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-zinc-500">P{r.priority}</span>
                    <span className="font-semibold">{r.name}</span>
                    {!r.is_active && <Badge variant="gray">vypnuté</Badge>}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5 truncate">
                    Ak: {Object.entries(r.conditions || {}).map(([k, v]) => `${k}=${v}`).join(', ') || '—'} → MD {r.account_debit || '—'} / D {r.account_credit || '—'}
                  </div>
                </div>
                <button onClick={() => toggle(r.id, r.is_active)} className="text-xs text-zinc-600 hover:text-zinc-900">{r.is_active ? 'Vypnúť' : 'Zapnúť'}</button>
                <button onClick={() => remove(r.id)} className="text-zinc-400 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
