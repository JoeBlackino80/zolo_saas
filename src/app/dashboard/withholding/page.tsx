'use client';

import { useState, useEffect } from 'react';
import { PageHeader, Card, CardHeader, Input, Field, Select, Button } from '@/components/ui';
import { generateWithholdingXml, type WithholdingRow } from '@/lib/dzp';
import { fmtEur } from '@/lib/utils';
import { Download, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';

export default function WithholdingPage() {
  const toast = useToast();
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [firms, setFirms] = useState<{ id: string; name: string; dic: string | null; ic_dph: string | null }[]>([]);
  const [firmId, setFirmId] = useState('');
  const [rows, setRows] = useState<WithholdingRow[]>([
    { recipient_name: '', recipient_rc: '', payment_type: 'autorský honorár', payment_date: new Date().toISOString().slice(0, 10), brutto: 1000, rate: 19, withheld: 190 },
  ]);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('companies').select('id, name, dic, ic_dph').is('deleted_at', null).order('name');
      setFirms(data || []);
      setFirmId((typeof window !== 'undefined' && localStorage.getItem('zolo_firm')) || data?.[0]?.id || '');
    })();
  }, []);

  function add() {
    setRows([...rows, { recipient_name: '', recipient_rc: '', payment_type: 'autorský honorár', payment_date: new Date().toISOString().slice(0, 10), brutto: 0, rate: 19, withheld: 0 }]);
  }
  function remove(idx: number) {
    setRows(rows.filter((_, i) => i !== idx));
  }
  function update(idx: number, patch: Partial<WithholdingRow>) {
    setRows(rows.map((r, i) => {
      if (i !== idx) return r;
      const next = { ...r, ...patch };
      // Auto-prepocitaj zrazku ak menime brutto alebo rate
      if (patch.brutto !== undefined || patch.rate !== undefined) {
        next.withheld = +(next.brutto * (next.rate / 100)).toFixed(2);
      }
      return next;
    }));
  }

  const total = rows.reduce((s, r) => s + r.withheld, 0);
  const firm = firms.find((f) => f.id === firmId);

  function downloadXml() {
    if (!firm) { toast('Vyber firmu', 'error'); return; }
    const xml = generateWithholdingXml({ dic: firm.dic, ic_dph: firm.ic_dph, name: firm.name }, period, rows);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HlasenieZD43_${period.replace('-', '_')}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      <PageHeader
        title="Hlásenie zrážkovej dane (§43)"
        subtitle="Pre úroky, autorské honoráre, licenčné poplatky, výhry — odovzdanie do 15. dňa nasledujúceho mesiaca."
        actions={<Button variant="primary" onClick={downloadXml} disabled={!firm}><Download size={14} /> Stiahnuť XML</Button>}
      />

      <Card className="mb-4">
        <div className="p-5 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Field label="Platiteľ">
            <Select value={firmId} onChange={(e) => setFirmId(e.target.value)}>
              {firms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Obdobie">
            <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <div className="flex items-end">
            <Button variant="secondary" onClick={add}><Plus size={14} /> Pridať záznam</Button>
          </div>
          <div className="flex items-end justify-end">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Spolu zrazené</div>
              <div className="font-mono font-bold text-lg">{fmtEur(total)}</div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={`Záznamy (${rows.length})`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
              <th className="text-left px-3 py-2">Príjemca</th>
              <th className="text-left px-3 py-2">RČ / DIČ</th>
              <th className="text-left px-3 py-2">Druh príjmu</th>
              <th className="text-left px-3 py-2">Dátum</th>
              <th className="text-right px-3 py-2">Brutto (€)</th>
              <th className="text-right px-3 py-2">%</th>
              <th className="text-right px-3 py-2">Zrazená (€)</th>
              <th></th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-3 py-2"><Input value={r.recipient_name} onChange={(e) => update(i, { recipient_name: e.target.value })} /></td>
                  <td className="px-3 py-2"><Input value={r.recipient_rc || ''} onChange={(e) => update(i, { recipient_rc: e.target.value })} /></td>
                  <td className="px-3 py-2">
                    <Select value={r.payment_type} onChange={(e) => update(i, { payment_type: e.target.value })}>
                      <option value="autorský honorár">Autorský honorár</option>
                      <option value="licenčný poplatok">Licenčný poplatok</option>
                      <option value="úroky">Úroky</option>
                      <option value="výhry">Výhry</option>
                      <option value="iné">Iné</option>
                    </Select>
                  </td>
                  <td className="px-3 py-2"><Input type="date" value={r.payment_date} onChange={(e) => update(i, { payment_date: e.target.value })} /></td>
                  <td className="px-3 py-2"><Input type="number" step="0.01" value={r.brutto} onChange={(e) => update(i, { brutto: +e.target.value })} className="text-right font-mono" /></td>
                  <td className="px-3 py-2"><Input type="number" step="1" value={r.rate} onChange={(e) => update(i, { rate: +e.target.value })} className="text-right font-mono" /></td>
                  <td className="px-3 py-2"><Input type="number" step="0.01" value={r.withheld} onChange={(e) => update(i, { withheld: +e.target.value })} className="text-right font-mono font-bold" /></td>
                  <td className="px-3 py-2"><button onClick={() => remove(i)} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 text-xs text-zinc-500">
        ⚠ Sadzby: 19% štandard; 35% pre nezmluvné štáty; 7% pre dividendy z PO. Hlásenie podáva platiteľ — vyplňuje sa po skončení mesiaca, v ktorom bola daň zrazená.
      </div>
    </div>
  );
}
