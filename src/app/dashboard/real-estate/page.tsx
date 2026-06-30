'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, Card, CardHeader, Input, Field, Select, Button, EmptyState } from '@/components/ui';
import { Building2, Plus, Trash2, Save } from 'lucide-react';
import { fmtEur } from '@/lib/utils';
import { useToast } from '@/components/Toast';

type Asset = {
  id?: string;
  company_id: string;
  obec: string;
  katastr: string | null;
  parcela: string | null;
  list_vlastnictva: string | null;
  druh: string;
  vymera_m2: number;
  zaklad_dane: number;
  sadzba_eur_m2: number;
  rocna_dan: number;
  poznamka: string | null;
};

export default function RealEstatePage() {
  const toast = useToast();
  const [firms, setFirms] = useState<{ id: string; name: string }[]>([]);
  const [firmId, setFirmId] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [draft, setDraft] = useState<Asset | null>(null);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('companies').select('id, name').is('deleted_at', null).order('name');
      setFirms(data || []);
      const cid = (typeof window !== 'undefined' && localStorage.getItem('zolo_firm')) || data?.[0]?.id || '';
      setFirmId(cid);
    })();
  }, []);

  useEffect(() => {
    if (!firmId) return;
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('real_estate_assets').select('*').eq('company_id', firmId).is('deleted_at', null).order('obec');
      setAssets((data || []) as Asset[]);
    })();
  }, [firmId]);

  function newAsset() {
    setDraft({
      company_id: firmId, obec: '', katastr: '', parcela: '', list_vlastnictva: '',
      druh: 'pozemok', vymera_m2: 0, zaklad_dane: 0, sadzba_eur_m2: 0.25, rocna_dan: 0, poznamka: '',
    });
  }

  async function save() {
    if (!draft) return;
    const sb = createClient();
    const computed = +(draft.vymera_m2 * draft.sadzba_eur_m2).toFixed(2);
    const payload = { ...draft, zaklad_dane: draft.vymera_m2, rocna_dan: computed };
    const { error } = draft.id
      ? await sb.from('real_estate_assets').update(payload).eq('id', draft.id)
      : await sb.from('real_estate_assets').insert(payload);
    if (error) { toast(error.message, 'error'); return; }
    toast('Uložené', 'success');
    setDraft(null);
    const { data } = await sb.from('real_estate_assets').select('*').eq('company_id', firmId).is('deleted_at', null).order('obec');
    setAssets((data || []) as Asset[]);
  }

  async function del(id: string) {
    const sb = createClient();
    await sb.from('real_estate_assets').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    setAssets(assets.filter((a) => a.id !== id));
  }

  const totalTax = assets.reduce((s, a) => s + Number(a.rocna_dan || 0), 0);

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <PageHeader
        title="Daň z nehnuteľností"
        subtitle="Evidencia pozemkov, stavieb a bytov pre miestnu daň. Podáva sa obci do 31.1."
        actions={<Button variant="primary" onClick={newAsset} disabled={!firmId}><Plus size={14} /> Pridať nehnuteľnosť</Button>}
      />

      <Card className="mb-4">
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Firma / vlastník">
            <Select value={firmId} onChange={(e) => setFirmId(e.target.value)}>
              {firms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <div className="sm:col-span-2 flex items-end justify-end">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Ročná daň spolu</div>
              <div className="font-mono font-bold text-2xl tracking-[-0.04em]">{fmtEur(totalTax)}</div>
            </div>
          </div>
        </div>
      </Card>

      {draft && (
        <Card className="mb-4 border-blue-200 bg-blue-50/30">
          <CardHeader title={draft.id ? 'Upraviť nehnuteľnosť' : 'Nová nehnuteľnosť'} />
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Obec / mesto"><Input value={draft.obec} onChange={(e) => setDraft({ ...draft, obec: e.target.value })} /></Field>
            <Field label="Katastrálne územie"><Input value={draft.katastr || ''} onChange={(e) => setDraft({ ...draft, katastr: e.target.value })} /></Field>
            <Field label="Parcela č."><Input value={draft.parcela || ''} onChange={(e) => setDraft({ ...draft, parcela: e.target.value })} /></Field>
            <Field label="LV č."><Input value={draft.list_vlastnictva || ''} onChange={(e) => setDraft({ ...draft, list_vlastnictva: e.target.value })} /></Field>
            <Field label="Druh">
              <Select value={draft.druh} onChange={(e) => setDraft({ ...draft, druh: e.target.value })}>
                <option value="pozemok">Pozemok</option>
                <option value="stavba">Stavba</option>
                <option value="byt">Byt / nebytový priestor</option>
              </Select>
            </Field>
            <Field label="Výmera (m²)"><Input type="number" step="0.01" value={draft.vymera_m2} onChange={(e) => setDraft({ ...draft, vymera_m2: +e.target.value })} /></Field>
            <Field label="Sadzba (€/m²)"><Input type="number" step="0.01" value={draft.sadzba_eur_m2} onChange={(e) => setDraft({ ...draft, sadzba_eur_m2: +e.target.value })} /></Field>
            <Field label="Poznámka">
              <Input value={draft.poznamka || ''} onChange={(e) => setDraft({ ...draft, poznamka: e.target.value })} />
            </Field>
            <div className="flex items-end gap-2">
              <Button variant="primary" onClick={save}><Save size={14} /> Uložiť</Button>
              <Button variant="secondary" onClick={() => setDraft(null)}>Zrušiť</Button>
            </div>
          </div>
        </Card>
      )}

      {assets.length === 0 ? (
        <Card><EmptyState icon={<Building2 size={24} />} title="Žiadne nehnuteľnosti" description="Pridaj prvú nehnuteľnosť pre výpočet dane." /></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                <th className="text-left px-3 py-2">Obec</th>
                <th className="text-left px-3 py-2">Druh</th>
                <th className="text-left px-3 py-2">Parcela / LV</th>
                <th className="text-right px-3 py-2">Výmera (m²)</th>
                <th className="text-right px-3 py-2">Sadzba</th>
                <th className="text-right px-3 py-2">Ročná daň</th>
                <th></th>
              </tr></thead>
              <tbody className="divide-y divide-zinc-100">
                {assets.map((a) => (
                  <tr key={a.id} className="hover:bg-zinc-50 cursor-pointer" onClick={() => setDraft(a)}>
                    <td className="px-3 py-2 font-medium">{a.obec}</td>
                    <td className="px-3 py-2">{a.druh}</td>
                    <td className="px-3 py-2 font-mono text-xs">{a.parcela || '—'} / {a.list_vlastnictva || '—'}</td>
                    <td className="px-3 py-2 text-right font-mono">{a.vymera_m2}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtEur(a.sadzba_eur_m2)}/m²</td>
                    <td className="px-3 py-2 text-right font-mono font-bold">{fmtEur(a.rocna_dan)}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={(e) => { e.stopPropagation(); if (a.id) del(a.id); }} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="mt-4 text-xs text-zinc-500">
        ⚠ Daň z nehnuteľností nie je centrálna — sadzby určuje VZN obce/mesta. Toto je len evidenčný nástroj. Priznanie podávate na obecnom úrade do 31.1.
      </div>
    </div>
  );
}
