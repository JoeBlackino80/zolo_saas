'use client';

import { useState, useEffect } from 'react';
import { PageHeader, Card, CardHeader, Input, Field, Select, Button } from '@/components/ui';
import { calcDpfoA, generateDpfoAXml } from '@/lib/dzp';
import { fmtEur } from '@/lib/utils';
import { Download } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';

export default function DpfoAPage() {
  const toast = useToast();
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [firms, setFirms] = useState<{ id: string; name: string; dic: string | null; ic_dph: string | null }[]>([]);
  const [firmId, setFirmId] = useState('');
  const [brutto, setBrutto] = useState(18000);
  const [socialne, setSocialne] = useState(1692);
  const [zdravotne, setZdravotne] = useState(720);
  const [preddavky, setPreddavky] = useState(0);
  const [children, setChildren] = useState(0);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('companies').select('id, name, dic, ic_dph').is('deleted_at', null).order('name');
      setFirms(data || []);
      setFirmId((typeof window !== 'undefined' && localStorage.getItem('zolo_firm')) || data?.[0]?.id || '');
    })();
  }, []);

  const res = calcDpfoA({ brutto_year: brutto, preddavky_paid: preddavky, socialne, zdravotne, childCount: children });
  const firm = firms.find((f) => f.id === firmId);

  function downloadXml() {
    if (!firm) { toast('Vyber firmu', 'error'); return; }
    const xml = generateDpfoAXml({ dic: firm.dic, name: firm.name }, year, res);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DPFO-A_${year}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <PageHeader
        title="DPFO typ A — Závislá činnosť"
        subtitle="Daň z príjmov FO zo zamestnaneckej mzdy (§ 5 zákona 595/2003 Z.z.). Podanie do 31.3."
        actions={<Button variant="primary" onClick={downloadXml} disabled={!firm}><Download size={14} /> Stiahnuť XML</Button>}
      />

      <Card className="mb-4">
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Firma / zamestnanec">
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
            <Field label="Hrubá ročná mzda (€)">
              <Input type="number" step="100" value={brutto} onChange={(e) => setBrutto(+e.target.value || 0)} />
            </Field>
            <Field label="Odvody sociálne (€)">
              <Input type="number" step="10" value={socialne} onChange={(e) => setSocialne(+e.target.value || 0)} />
            </Field>
            <Field label="Odvody zdravotné (€)">
              <Input type="number" step="10" value={zdravotne} onChange={(e) => setZdravotne(+e.target.value || 0)} />
            </Field>
            <Field label="Už zrazené preddavky (€)">
              <Input type="number" step="10" value={preddavky} onChange={(e) => setPreddavky(+e.target.value || 0)} />
            </Field>
            <Field label="Počet vyživovaných detí">
              <Input type="number" min={0} max={10} value={children} onChange={(e) => setChildren(+e.target.value || 0)} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Výpočet" />
          <div className="p-5 space-y-3 text-sm">
            <Row label="Hrubá mzda" value={fmtEur(res.brutto)} />
            <Row label="Odvody" value={`-${fmtEur(res.odvody)}`} />
            <Row label="Čiastkový základ" value={fmtEur(res.ciastkovyZaklad)} bold />
            <Row label="Nezdaniteľná suma" value={`-${fmtEur(res.nezdanitelna)}`} />
            <Row label="Základ dane" value={fmtEur(res.taxBase)} bold />
            <div className="border-t border-zinc-200 pt-3" />
            <Row label="Daň 19/25%" value={`-${fmtEur(res.tax)}`} />
            {children > 0 && <Row label={`Daňový bonus (${children}×600 €)`} value={`+${fmtEur(res.bonus)}`} variant="green" />}
            <Row label="Daň po bonusoch" value={fmtEur(res.taxAfterBonus)} bold />
            <Row label="Zrazené preddavky" value={`-${fmtEur(res.preddavky)}`} />
            <div className="border-t border-zinc-200 pt-3" />
            <Row
              label={res.vysledok >= 0 ? 'K úhrade do 31.3.' : 'Preplatok na vrátenie'}
              value={fmtEur(Math.abs(res.vysledok))}
              bold
              variant={res.vysledok >= 0 ? 'red' : 'green'}
            />
          </div>
        </Card>
      </div>

      <div className="mt-4 text-xs text-zinc-500">
        ⚠ Pre čisto zamestnancov stačí ročné zúčtovanie u zamestnávateľa. Toto priznanie podávajú zamestnanci s viacerými príjmami, alebo ak nepodpísali ročné zúčtovanie.
      </div>
    </div>
  );
}

function Row({ label, value, bold, variant }: { label: string; value: string; bold?: boolean; variant?: 'green' | 'red' }) {
  const color = variant === 'green' ? 'text-emerald-600' : variant === 'red' ? 'text-red-600' : 'text-zinc-900';
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-600">{label}</span>
      <span className={`font-mono ${bold ? 'font-bold' : ''} ${color}`}>{value}</span>
    </div>
  );
}
