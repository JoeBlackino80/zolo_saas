'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { PageHeader, Card, Field, Input, Select, Button, Badge } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';

type Level = { id: string; name: string; description: string | null; type: string | null; percentage: number | null; discount_percent: number | null; markup_percent: number | null; is_default: boolean };

export default function PriceLevelsPage() {
  const toast = useToast();
  const [companyId, setCompanyId] = useState('');
  const [levels, setLevels] = useState<Level[]>([]);
  const [draft, setDraft] = useState({ name: '', type: 'discount', percentage: 5, description: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    const sb = createClient();
    const cid = typeof window !== 'undefined' ? localStorage.getItem('zolo_firm') : null;
    if (cid) setCompanyId(cid);
    let q = sb.from('price_levels').select('id, name, description, type, percentage, discount_percent, markup_percent, is_default').order('name');
    if (cid) q = q.eq('company_id', cid);
    const { data } = await q;
    setLevels((data as Level[]) || []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!draft.name) { toast('Zadaj názov', 'error'); return; }
    setSaving(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from('price_levels').insert({
      company_id: companyId,
      name: draft.name,
      description: draft.description || null,
      type: draft.type,
      percentage: draft.percentage,
      discount_percent: draft.type === 'discount' ? draft.percentage : 0,
      markup_percent: draft.type === 'markup' ? draft.percentage : 0,
      is_default: false,
      created_by: user?.id || null,
    });
    setSaving(false);
    if (error) { toast(error.message, 'error'); return; }
    setDraft({ name: '', type: 'discount', percentage: 5, description: '' });
    toast('Cenová úroveň pridaná', 'success');
    load();
  }

  async function setDefault(id: string) {
    const sb = createClient();
    await sb.from('price_levels').update({ is_default: false }).eq('company_id', companyId);
    await sb.from('price_levels').update({ is_default: true }).eq('id', id);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Zmazať cenovú úroveň?')) return;
    const sb = createClient();
    await sb.from('price_levels').delete().eq('id', id);
    load();
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <PageHeader back={{ href: "/dashboard/settings" }} title="Cenové úrovne" subtitle="Skupiny zákazníkov (VIP, distribútor, retail) so zľavou alebo prirážkou" />

      <Card className="mb-4">
        <div className="p-5">
          <div className="text-sm font-semibold mb-3">Pridať úroveň</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Názov *">
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="napr. VIP, Distribútor" />
            </Field>
            <Field label="Typ">
              <Select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                <option value="discount">Zľava (%)</option>
                <option value="markup">Prirážka (%)</option>
              </Select>
            </Field>
            <Field label="Percento">
              <Input type="number" step="0.01" min="0" value={draft.percentage} onChange={(e) => setDraft({ ...draft, percentage: Number(e.target.value) })} />
            </Field>
            <Field label="Popis">
              <Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="voliteľné" />
            </Field>
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="primary" onClick={add} disabled={saving || !draft.name}><Plus size={14} /> {saving ? 'Pridávam…' : 'Pridať'}</Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="px-5 py-3 border-b border-zinc-100 text-sm font-semibold">{levels.length} úrovní</div>
        {levels.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-500">Žiadne cenové úrovne. Pridaj prvú hore.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {levels.map((l) => (
              <div key={l.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{l.name}</span>
                    {l.is_default && <Badge variant="green">predvolené</Badge>}
                    <Badge variant={l.type === 'discount' ? 'amber' : 'blue'}>{l.type === 'discount' ? `−${l.percentage}%` : `+${l.percentage}%`}</Badge>
                  </div>
                  {l.description && <div className="text-xs text-zinc-500 mt-0.5">{l.description}</div>}
                </div>
                {!l.is_default && <button onClick={() => setDefault(l.id)} className="text-xs text-zinc-600 hover:text-zinc-900">Nastaviť ako predvolené</button>}
                <button onClick={() => remove(l.id)} className="text-zinc-400 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
