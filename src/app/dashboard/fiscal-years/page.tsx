'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, Card, EmptyState, Badge, Button, Input, Field, Select } from '@/components/ui';
import { CalendarDays, Plus, Lock, Unlock } from 'lucide-react';
import { fmtDate } from '@/lib/utils';
import { useToast } from '@/components/Toast';

type FY = { id: string; company_id: string; name: string; start_date: string; end_date: string; status: string };

export default function FiscalYearsPage() {
  const toast = useToast();
  const [firms, setFirms] = useState<{ id: string; name: string }[]>([]);
  const [firmId, setFirmId] = useState('');
  const [years, setYears] = useState<FY[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState({ name: String(new Date().getFullYear()), start_date: `${new Date().getFullYear()}-01-01`, end_date: `${new Date().getFullYear()}-12-31` });

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
      const { data } = await sb.from('fiscal_years').select('*').eq('company_id', firmId).order('start_date', { ascending: false });
      setYears((data || []) as FY[]);
    })();
  }, [firmId]);

  async function createYear() {
    if (!firmId) return;
    const sb = createClient();
    const { error } = await sb.from('fiscal_years').insert({ company_id: firmId, ...draft, status: 'open' });
    if (error) { toast(error.message, 'error'); return; }
    toast('Účtovné obdobie vytvorené', 'success');
    setShowNew(false);
    const { data } = await sb.from('fiscal_years').select('*').eq('company_id', firmId).order('start_date', { ascending: false });
    setYears((data || []) as FY[]);
  }

  async function toggleStatus(fy: FY) {
    const newStatus = fy.status === 'closed' ? 'open' : 'closed';
    if (newStatus === 'closed' && !confirm(`Uzavrieť obdobie ${fy.name}? Nedajú sa do neho viac robiť zmeny.`)) return;
    const sb = createClient();
    const { error } = await sb.from('fiscal_years').update({ status: newStatus }).eq('id', fy.id);
    if (error) { toast(error.message, 'error'); return; }
    setYears(years.map((y) => y.id === fy.id ? { ...y, status: newStatus } : y));
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <PageHeader
        title="Účtovné obdobia"
        subtitle="Fiscal years — otvorené sa dajú meniť, uzavreté sú zamknuté."
        actions={<Button variant="primary" onClick={() => setShowNew(true)} disabled={!firmId}><Plus size={14} /> Nové obdobie</Button>}
      />

      <Card className="mb-4">
        <div className="p-5">
          <Field label="Firma">
            <Select value={firmId} onChange={(e) => setFirmId(e.target.value)}>
              {firms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      {showNew && (
        <Card className="mb-4 border-zinc-200 bg-zinc-50/30">
          <div className="p-5 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Field label="Názov"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label="Začiatok"><Input type="date" value={draft.start_date} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} /></Field>
            <Field label="Koniec"><Input type="date" value={draft.end_date} onChange={(e) => setDraft({ ...draft, end_date: e.target.value })} /></Field>
            <div className="flex items-end gap-2">
              <Button variant="primary" onClick={createYear}>Vytvoriť</Button>
              <Button variant="secondary" onClick={() => setShowNew(false)}>Zrušiť</Button>
            </div>
          </div>
        </Card>
      )}

      {years.length === 0 ? (
        <Card><EmptyState icon={<CalendarDays size={24} />} title="Žiadne účtovné obdobia" description="Vytvor prvé obdobie (rok)." /></Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                <th className="text-left px-5 py-3">Názov</th>
                <th className="text-center px-3 py-3">Začiatok</th>
                <th className="text-center px-3 py-3">Koniec</th>
                <th className="text-center px-3 py-3">Stav</th>
                <th className="text-right px-5 py-3">Akcia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {years.map((y) => (
                <tr key={y.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-3 font-mono font-medium">{y.name}</td>
                  <td className="px-3 py-3 text-center font-mono text-xs">{fmtDate(y.start_date)}</td>
                  <td className="px-3 py-3 text-center font-mono text-xs">{fmtDate(y.end_date)}</td>
                  <td className="px-3 py-3 text-center">
                    <Badge variant={y.status === 'open' ? 'green' : 'gray'}>{y.status === 'open' ? 'Otvorené' : 'Uzavreté'}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button variant="ghost" onClick={() => toggleStatus(y)}>
                      {y.status === 'open' ? <><Lock size={12} /> Uzavrieť</> : <><Unlock size={12} /> Otvoriť</>}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
