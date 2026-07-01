'use client';

import { useState, useEffect } from 'react';
import { PageHeader, Card, CardHeader, Input, Field, Select, Button } from '@/components/ui';
import { calcDpmv, generateDpmvXml, type Vehicle } from '@/lib/dzp';
import { fmtEur } from '@/lib/utils';
import { Download, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';

export default function DpmvPage() {
  const toast = useToast();
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [firms, setFirms] = useState<{ id: string; name: string; dic: string | null; ic_dph: string | null }[]>([]);
  const [firmId, setFirmId] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    { plate: '', type: 'osobné', weight_kg: 1500, engine_cm3: 1600, fuel: 'diesel', first_registration: '2020-01-01', annual_tax: 148 },
  ]);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('companies').select('id, name, dic, ic_dph').is('deleted_at', null).order('name');
      setFirms(data || []);
      setFirmId((typeof window !== 'undefined' && localStorage.getItem('zolo_firm')) || data?.[0]?.id || '');
    })();
  }, []);

  function addVehicle() {
    setVehicles([...vehicles, { plate: '', type: 'osobné', weight_kg: 1500, engine_cm3: 1600, fuel: 'diesel', first_registration: '2020-01-01', annual_tax: 148 }]);
  }
  function removeVehicle(idx: number) {
    setVehicles(vehicles.filter((_, i) => i !== idx));
  }
  function update(idx: number, patch: Partial<Vehicle>) {
    setVehicles(vehicles.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  }

  const calc = calcDpmv(vehicles);
  const firm = firms.find((f) => f.id === firmId);

  function downloadXml() {
    if (!firm) { toast('Vyber firmu', 'error'); return; }
    const xml = generateDpmvXml({ dic: firm.dic, ic_dph: firm.ic_dph, name: firm.name }, year, vehicles);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DPMV_${year}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <PageHeader
        title="Daň z motorových vozidiel"
        subtitle="DPMV — pre podnikateľsky využívané vozidlá. Podanie do 31. januára."
        actions={<Button variant="primary" onClick={downloadXml} disabled={!firm}><Download size={14} /> Stiahnuť XML</Button>}
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
          <div className="flex items-end">
            <Button variant="secondary" onClick={addVehicle}><Plus size={14} /> Pridať vozidlo</Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={`Vozidlá (${vehicles.length})`} subtitle={`Spolu daň: ${fmtEur(calc.total)}`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
              <th className="text-left px-3 py-2">EV. číslo</th>
              <th className="text-left px-3 py-2">Druh</th>
              <th className="text-right px-3 py-2">Hmot. (kg)</th>
              <th className="text-right px-3 py-2">cm³</th>
              <th className="text-left px-3 py-2">Palivo</th>
              <th className="text-left px-3 py-2">1. evidencia</th>
              <th className="text-right px-3 py-2">Ročná daň</th>
              <th></th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-100">
              {vehicles.map((v, i) => (
                <tr key={i}>
                  <td className="px-3 py-2"><Input value={v.plate} onChange={(e) => update(i, { plate: e.target.value })} placeholder="BA-123-AB" /></td>
                  <td className="px-3 py-2">
                    <Select value={v.type} onChange={(e) => update(i, { type: e.target.value })}>
                      <option value="osobné">Osobné</option>
                      <option value="nákladné">Nákladné</option>
                      <option value="prípojné">Prípojné</option>
                      <option value="autobus">Autobus</option>
                    </Select>
                  </td>
                  <td className="px-3 py-2"><Input type="number" value={v.weight_kg} onChange={(e) => update(i, { weight_kg: +e.target.value })} /></td>
                  <td className="px-3 py-2"><Input type="number" value={v.engine_cm3} onChange={(e) => update(i, { engine_cm3: +e.target.value })} /></td>
                  <td className="px-3 py-2">
                    <Select value={v.fuel} onChange={(e) => update(i, { fuel: e.target.value as Vehicle['fuel'] })}>
                      <option value="diesel">Diesel</option>
                      <option value="gasoline">Benzín</option>
                      <option value="electric">Elektro</option>
                      <option value="other">Iné</option>
                    </Select>
                  </td>
                  <td className="px-3 py-2"><Input type="date" value={v.first_registration} onChange={(e) => update(i, { first_registration: e.target.value })} /></td>
                  <td className="px-3 py-2"><Input type="number" step="0.01" value={v.annual_tax} onChange={(e) => update(i, { annual_tax: +e.target.value })} className="text-right font-mono" /></td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => removeVehicle(i)} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-zinc-50 font-semibold">
                <td colSpan={6} className="px-3 py-2 text-right">Celková daň</td>
                <td className="px-3 py-2 text-right font-mono">{fmtEur(calc.total)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <div className="mt-4 text-xs text-zinc-500">
        ⚠ Sadzby závisia od kraja, hmotnosti a typu vozidla. Vlož ročnú daň ručne podľa <a href="https://www.financnasprava.sk" target="_blank" rel="noreferrer" className="text-zinc-900 underline">tabuľky FS SR</a>. Podanie cez eDane do 31.1. za predchádzajúci rok.
      </div>
    </div>
  );
}
