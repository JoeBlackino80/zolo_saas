'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, FileText, Download } from 'lucide-react';
import { PageHeader, Card, Field, Select, Textarea, Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';

const SECTIONS = [
  { key: 'metody', label: '1. Účtovné metódy a princípy', placeholder: 'Účtovná jednotka účtuje v sústave podvojného účtovníctva podľa zákona č. 431/2002 Z.z. Účtovné obdobie je kalendárny rok. Mena: EUR. Oceňovanie zásob: FIFO.' },
  { key: 'majetok', label: '2. Dlhodobý majetok', placeholder: 'Obstarávacia cena, doba odpisovania, použité odpisové sadzby (lineárne / zrýchlené), prírastky a úbytky majetku počas obdobia.' },
  { key: 'zasoby', label: '3. Zásoby', placeholder: 'Spôsob oceňovania (FIFO/priemer), opravné položky, inventarizačné rozdiely.' },
  { key: 'pohladavky', label: '4. Pohľadávky', placeholder: 'Členenie pohľadávok podľa lehoty splatnosti, opravné položky k pochybným pohľadávkam.' },
  { key: 'zavazky', label: '5. Záväzky', placeholder: 'Členenie záväzkov, krátkodobé vs dlhodobé, daňové záväzky.' },
  { key: 'imanie', label: '6. Vlastné imanie', placeholder: 'Zmeny základného imania, rozdelenie zisku, rezervné fondy.' },
  { key: 'rezervy', label: '7. Rezervy a časové rozlíšenie', placeholder: 'Rezervy na dovolenky, audit, súdne spory; náklady a výnosy budúcich období.' },
  { key: 'naklady_vynosy', label: '8. Náklady a výnosy', placeholder: 'Členenie podľa druhov a stredísk, najvýznamnejšie kategórie.' },
  { key: 'mzdy', label: '9. Zamestnanci', placeholder: 'Priemerný počet zamestnancov, mzdové náklady, sociálne náklady.' },
  { key: 'spriaznene', label: '10. Spriaznené osoby', placeholder: 'Obchodné vzťahy s materskou/dcérskou spoločnosťou, štatutármi.' },
  { key: 'udalosti', label: '11. Udalosti po dátume súvahy', placeholder: 'Významné udalosti medzi 31.12. a dátumom zostavenia závierky.' },
  { key: 'rizika', label: '12. Riziká a neistoty', placeholder: 'Súdne spory, daňové kontroly, garančné záväzky.' },
];

type FY = { id: string; name: string };

export default function ClosingNotesPage() {
  const toast = useToast();
  const [companyId, setCompanyId] = useState('');
  const [years, setYears] = useState<FY[]>([]);
  const [fiscalYearId, setFiscalYearId] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const cid = typeof window !== 'undefined' ? localStorage.getItem('zolo_firm') : null;
      if (cid) setCompanyId(cid);
      let q = sb.from('fiscal_years').select('id, name').order('start_date', { ascending: false });
      if (cid) q = q.eq('company_id', cid);
      const { data } = await q;
      setYears((data as FY[]) || []);
      if (data?.length) setFiscalYearId(data[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!fiscalYearId) return;
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('closing_notes').select('section, content').eq('fiscal_year_id', fiscalYearId);
      const map: Record<string, string> = {};
      for (const r of (data as { section: string; content: string }[]) || []) {
        map[r.section] = r.content;
      }
      setNotes(map);
    })();
  }, [fiscalYearId]);

  async function save() {
    if (!fiscalYearId || !companyId) { toast('Vyber účtovný rok', 'error'); return; }
    setLoading(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    // Wipe existing for this year
    await sb.from('closing_notes').delete().eq('fiscal_year_id', fiscalYearId).eq('company_id', companyId);
    const rows = SECTIONS.filter((s) => notes[s.key]?.trim()).map((s) => ({
      company_id: companyId,
      fiscal_year_id: fiscalYearId,
      section: s.key,
      content: notes[s.key].trim(),
      created_by: user?.id,
    }));
    if (rows.length > 0) {
      const { error } = await sb.from('closing_notes').insert(rows);
      if (error) { setLoading(false); toast(error.message, 'error'); return; }
    }
    setLoading(false);
    toast(`${rows.length} sekcií uložených`, 'success');
  }

  function downloadTxt() {
    const yearName = years.find((y) => y.id === fiscalYearId)?.name || 'rok';
    const text = ['POZNÁMKY K ÚČTOVNEJ ZÁVIERKE — ' + yearName, '='.repeat(60), '', ...SECTIONS
      .filter((s) => notes[s.key]?.trim())
      .map((s) => `${s.label}\n${'-'.repeat(s.label.length)}\n${notes[s.key]}\n`)].join('\n');
    const blob = new Blob([text], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poznamky-${yearName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <Link href="/dashboard/closing" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-3">
        <ArrowLeft size={14} /> Späť
      </Link>
      <PageHeader
        title="Poznámky k účtovnej závierke"
        subtitle="Štruktúrované poznámky pre veľkú účtovnú jednotku · 12 sekcií"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={downloadTxt}><Download size={14} /> Export TXT</Button>
            <Button variant="primary" onClick={save} disabled={loading || !fiscalYearId}><Save size={14} /> {loading ? 'Ukladám…' : 'Uložiť'}</Button>
          </div>
        }
      />

      <Card className="mb-4">
        <div className="p-5">
          <Field label="Účtovný rok">
            <Select value={fiscalYearId} onChange={(e) => setFiscalYearId(e.target.value)}>
              <option value="">— vyber —</option>
              {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      <div className="space-y-3">
        {SECTIONS.map((s) => (
          <Card key={s.key}>
            <div className="p-5 space-y-2">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-zinc-400" />
                <div className="font-semibold text-sm">{s.label}</div>
              </div>
              <Textarea rows={4} value={notes[s.key] || ''} onChange={(e) => setNotes({ ...notes, [s.key]: e.target.value })} placeholder={s.placeholder} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
