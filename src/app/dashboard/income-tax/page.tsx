'use client';

import { useState, useEffect } from 'react';
import { PageHeader, Card, CardHeader, Input, Field, Select, Button } from '@/components/ui';
import { calcDzp, generateDppoXml, generateDpfoBXml } from '@/lib/dzp';
import { fmtEur } from '@/lib/utils';
import { Download, Wand2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';

export default function IncomeTaxPage() {
  const toast = useToast();
  const [type, setType] = useState<'FO-A' | 'FO-B' | 'PO'>('PO');
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [revenue, setRevenue] = useState(50000);
  const [expenses, setExpenses] = useState(30000);
  const [prepaid, setPrepaid] = useState(0);
  const [children, setChildren] = useState(0);
  const [firms, setFirms] = useState<{ id: string; name: string; dic: string | null; ic_dph: string | null }[]>([]);
  const [firmId, setFirmId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('companies').select('id, name, dic, ic_dph').is('deleted_at', null).order('name');
      setFirms(data || []);
      const cid = (typeof window !== 'undefined' && localStorage.getItem('zolo_firm')) || data?.[0]?.id || '';
      setFirmId(cid);
    })();
  }, []);

  async function loadFromAccounting() {
    if (!firmId) { toast('Vyber firmu', 'error'); return; }
    setLoading(true);
    const sb = createClient();
    const yStart = `${year}-01-01`;
    const yEnd = `${year}-12-31`;
    const [{ data: out }, { data: inb }] = await Promise.all([
      sb.from('invoices').select('subtotal').eq('company_id', firmId).eq('type', 'invoice').gte('delivery_date', yStart).lte('delivery_date', yEnd).is('deleted_at', null),
      sb.from('invoices').select('subtotal').eq('company_id', firmId).eq('type', 'received_invoice').gte('delivery_date', yStart).lte('delivery_date', yEnd).is('deleted_at', null),
    ]);
    const rev = (out || []).reduce((s, r) => s + Number(r.subtotal || 0), 0);
    const exp = (inb || []).reduce((s, r) => s + Number(r.subtotal || 0), 0);
    setRevenue(+rev.toFixed(2));
    setExpenses(+exp.toFixed(2));
    setLoading(false);
    toast(`Načítané: ${(out || []).length} výnosov + ${(inb || []).length} nákladov za ${year}`, 'success');
  }

  const res = calcDzp({ type, revenue, expenses, prepaid, childCount: children });
  const firm = firms.find((f) => f.id === firmId);

  function downloadXml() {
    if (!firm) { toast('Vyber firmu', 'error'); return; }
    const xml = type === 'PO'
      ? generateDppoXml({ dic: firm.dic, ic_dph: firm.ic_dph, name: firm.name }, year, res)
      : generateDpfoBXml({ dic: firm.dic, name: firm.name }, year, res, { childCount: children });
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type === 'PO' ? 'DPPO' : 'DPFO-B'}_${year}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <PageHeader
        title="Daň z príjmov"
        subtitle="DZP FO (typ A/B) alebo DZP PO — výpočet + XML pre Daňový portál"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={loadFromAccounting} disabled={loading || !firmId}><Wand2 size={14} /> Načítať z účtovníctva</Button>
            <Button variant="primary" onClick={downloadXml} disabled={!firm}><Download size={14} /> Stiahnuť XML</Button>
          </div>
        }
      />

      <Card className="mb-4">
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Firma">
            <Select value={firmId} onChange={(e) => setFirmId(e.target.value)}>
              {firms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Zdaňovacie obdobie (rok)">
            <Input type="number" value={year} onChange={(e) => setYear(+e.target.value)} min={2020} max={2030} />
          </Field>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Vstupy" />
          <div className="p-5 space-y-4">
            <Field label="Typ priznania">
              <Select value={type} onChange={(e) => setType(e.target.value as 'FO-A' | 'FO-B' | 'PO')}>
                <option value="PO">DZP PO — Právnická osoba</option>
                <option value="FO-B">DZP FO typ B — Podnikanie / iné</option>
                <option value="FO-A">DZP FO typ A — Iba zamestnanecké</option>
              </Select>
            </Field>
            <Field label="Príjmy / Výnosy (€/rok)">
              <Input type="number" step="100" value={revenue} onChange={(e) => setRevenue(+e.target.value || 0)} />
            </Field>
            <Field label="Výdavky / Náklady (€/rok)">
              <Input type="number" step="100" value={expenses} onChange={(e) => setExpenses(+e.target.value || 0)} />
            </Field>
            <Field label="Zaplatené preddavky (€)">
              <Input type="number" step="10" value={prepaid} onChange={(e) => setPrepaid(+e.target.value || 0)} />
            </Field>
            {type !== 'PO' && (
              <Field label="Počet vyživovaných detí">
                <Input type="number" min={0} max={10} value={children} onChange={(e) => setChildren(+e.target.value || 0)} />
              </Field>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Výpočet" />
          <div className="p-5 space-y-3 text-sm">
            <Row label="Príjmy" value={fmtEur(res.revenue)} />
            <Row label="Výdavky" value={`-${fmtEur(res.expenses)}`} />
            <Row label="Zisk / Strata" value={fmtEur(res.profit)} bold variant={res.profit >= 0 ? undefined : 'red'} />
            <div className="border-t border-slate-200 pt-3" />
            <Row label="Základ dane" value={fmtEur(res.taxBase)} />
            <Row label={`Daň ${type === 'PO' ? (res.revenue <= 60000 ? '15%' : '21%') : '19/25%'}`} value={`-${fmtEur(res.tax)}`} />
            {type !== 'PO' && children > 0 && (
              <Row label={`Daňový bonus (${children}×600€)`} value={`+${fmtEur(children * 600)}`} variant="green" />
            )}
            <Row label="Daň po bonusoch" value={fmtEur(res.taxAfterBonus)} bold />
            {res.prepaid > 0 && <Row label="Zaplatené preddavky" value={`-${fmtEur(res.prepaid)}`} />}
            <div className="border-t border-slate-200 pt-3" />
            <Row
              label={res.toPay >= 0 ? 'K úhrade do 31.3.' : 'Preplatok na vrátenie'}
              value={fmtEur(Math.abs(res.toPay))}
              bold
              variant={res.toPay >= 0 ? 'red' : 'green'}
            />
            <Row label="Efektívna sadzba" value={`${res.effectiveRate}%`} />
          </div>
        </Card>
      </div>

      <div className="mt-4 text-xs text-slate-500">
        ⚠ Výpočet je orientačný. Zákon 595/2003 Z.z. s úpravami pre rok 2026. PO s obratom do 60 000 € platí 15%, ostatné 21%.
        FO: 19% do {fmtEur(47537.5)} základu, nad to 25%. Nezdaniteľná suma FO 2026: {fmtEur(5753.76)} (mení sa medziročne).
      </div>
    </div>
  );
}

function Row({ label, value, bold, variant }: { label: string; value: string; bold?: boolean; variant?: 'green' | 'red' }) {
  const color = variant === 'green' ? 'text-emerald-600' : variant === 'red' ? 'text-red-600' : 'text-slate-900';
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600">{label}</span>
      <span className={`font-mono ${bold ? 'font-bold' : ''} ${color}`}>{value}</span>
    </div>
  );
}
