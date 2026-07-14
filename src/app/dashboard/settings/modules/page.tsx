'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, Card, CardHeader, Field, Select, Button, Badge } from '@/components/ui';
import { Lock, Check, Sparkles, Save } from 'lucide-react';
import { PLANS, type Module } from '@/lib/modules';
import { useToast } from '@/components/Toast';

const MODULE_LABELS: Record<Module, { label: string; desc: string }> = {
  invoicing: { label: 'Fakturácia', desc: 'FA, PFA, ZF, DL, PPD, cenník, zákazníci' },
  finance: { label: 'Financie', desc: 'Banka, pokladnica, pohľadávky, záväzky, cashflow' },
  accounting: { label: 'Účtovníctvo', desc: 'Denník, osnova, projekty, majetok, cestovné' },
  taxes: { label: 'Dane a výkazy', desc: 'DPH XML, priznania, eDane, eKasa, závierka' },
  reports: { label: 'Reporty', desc: 'Súvaha, výsledovka, cash flow, archív' },
  payroll: { label: 'Mzdy', desc: 'Zamestnanci, výpočet miezd, odvody' },
  warehouse: { label: 'Sklad', desc: 'FIFO batches, pohyby, prevodky, inventúra' },
  ai: { label: 'AI asistent', desc: 'PFA extract cez Claude Vision, predkontácie' },
  api: { label: 'REST API', desc: 'Externá integrácia cez Bearer tokens' },
  multi_company: { label: 'Viac firiem', desc: 'Neobmedzene firiem pod jedným účtom' },
};

type Company = {
  id: string;
  name: string;
  plan: string | null;
  enabled_modules: string[] | null;
};

export default function ModulesPage() {
  const toast = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [firmId, setFirmId] = useState('');
  const [modules, setModules] = useState<Set<Module>>(new Set());
  const [plan, setPlan] = useState('business');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('companies').select('id, name, plan, enabled_modules').is('deleted_at', null).order('name');
      setCompanies((data as Company[]) || []);
      const cid = (typeof window !== 'undefined' && localStorage.getItem('zolo_firm')) || data?.[0]?.id || '';
      setFirmId(cid);
      const co = (data as Company[])?.find((c) => c.id === cid);
      if (co) {
        setModules(new Set((co.enabled_modules || []) as Module[]));
        setPlan(co.plan || 'business');
      }
    })();
  }, []);

  useEffect(() => {
    const co = companies.find((c) => c.id === firmId);
    if (co) {
      setModules(new Set((co.enabled_modules || []) as Module[]));
      setPlan(co.plan || 'business');
    }
  }, [firmId, companies]);

  function toggleModule(m: Module) {
    const next = new Set(modules);
    if (next.has(m)) next.delete(m);
    else next.add(m);
    setModules(next);
  }

  function applyPreset(p: string) {
    setPlan(p);
    const preset = PLANS[p];
    if (preset) setModules(new Set(preset.modules));
  }

  async function save() {
    setSaving(true);
    const sb = createClient();
    const { error } = await sb.from('companies').update({
      plan,
      enabled_modules: Array.from(modules),
    }).eq('id', firmId);
    setSaving(false);
    if (error) { toast(error.message, 'error'); return; }
    toast('Moduly aktualizované', 'success');
    // Reload
    const { data } = await sb.from('companies').select('id, name, plan, enabled_modules').is('deleted_at', null).order('name');
    setCompanies((data as Company[]) || []);
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <PageHeader
        back={{ href: '/dashboard/settings' }}
        title="Aktivované moduly"
        subtitle="Nastavuj čo klient (alebo tvoja firma) uvidí v aplikácii. Sekcie ktoré nemajú aktívny modul sa v sidebar skryjú."
      />

      <Card className="mb-4">
        <CardHeader title="Vyber firmu" />
        <div className="p-5">
          <Field label="Firma">
            <Select value={firmId} onChange={(e) => setFirmId(e.target.value)}>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="mb-4">
        <CardHeader title="Rýchle voľby (preset plán)" subtitle="Klik na plán → auto-nastaví moduly. Potom si môžeš vypnúť/zapnúť jednotlivé." />
        <div className="p-5 grid grid-cols-1 sm:grid-cols-4 gap-3">
          {Object.entries(PLANS).map(([code, p]) => (
            <button
              key={code}
              onClick={() => applyPreset(code)}
              className={`text-left p-4 rounded-xl border-2 transition-colors ${
                plan === code ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="font-bold text-zinc-900">{p.label}</div>
                {plan === code && <Check size={14} className="text-zinc-900" />}
              </div>
              <div className="text-[13px] font-semibold text-zinc-700">{p.price}</div>
              <div className="text-[11px] text-zinc-500 mt-2 leading-relaxed">{p.description}</div>
              <div className="mt-3 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                {p.modules.length} modulov
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="mb-4">
        <CardHeader
          title={`Moduly (${modules.size}/${Object.keys(MODULE_LABELS).length} aktívnych)`}
          subtitle="Zaškrtnuté = klient má prístup. Odškrtnuté = sekcia skrytá + placeholder page 'Upgrade'."
        />
        <div className="p-5 space-y-2">
          {(Object.entries(MODULE_LABELS) as [Module, { label: string; desc: string }][]).map(([m, info]) => {
            const enabled = modules.has(m);
            return (
              <label
                key={m}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  enabled ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggleModule(m)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900 text-[14px]">{info.label}</span>
                    {enabled ? (
                      <Badge variant="green">Aktívny</Badge>
                    ) : (
                      <Badge variant="gray">Vypnutý</Badge>
                    )}
                  </div>
                  <div className="text-[12px] text-zinc-500 mt-0.5">{info.desc}</div>
                </div>
                {!enabled && <Lock size={14} className="text-zinc-400 shrink-0 mt-1" />}
              </label>
            );
          })}
        </div>
      </Card>

      <div className="flex gap-2">
        <Button variant="primary" onClick={save} disabled={saving}>
          {saving ? 'Ukladám…' : <><Save size={14} /> Uložiť zmeny</>}
        </Button>
      </div>

      <div className="mt-6 p-4 bg-zinc-50 border border-zinc-100 rounded-xl text-[12px] text-zinc-600 leading-relaxed">
        <strong className="text-zinc-900">💡 Ako to funguje pre tvojho klienta:</strong>
        <ul className="mt-2 space-y-1 list-disc pl-5">
          <li>Sidebar zobrazí len sekcie, ktorým firma má aktivované moduly (napr. len &quot;Predaj&quot; a &quot;Reporty&quot; pre Free plán).</li>
          <li>Sekcie bez modulu majú 🔒 ikonu + link &quot;Upgradovať pre prístup&quot;.</li>
          <li>Ak niekto priamo otvorí URL zablokovanej sekcie (napr. /dashboard/journal), zobrazí sa &quot;Modul nie je aktívny&quot; s Upgrade CTA.</li>
        </ul>
        <div className="mt-3">
          <strong>Neskôr (po Stripe integrácii):</strong> plán a moduly sa nastavia automaticky pri kúpe. Manuálne nastavenie tu bude pre admin úpravy.
        </div>
      </div>
    </div>
  );
}
