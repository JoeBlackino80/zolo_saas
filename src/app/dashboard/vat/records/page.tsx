'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, Card, CardHeader, Field, Select } from '@/components/ui';
import { SkeletonCard } from '@/components/Skeleton';
import { fmtEur } from '@/lib/utils';
import { aggregateVat } from '@/lib/vat';

type RawItem = { vat_rate: number; subtotal: number; vat_amount: number };

export default function VatRecordsPage() {
  const [firms, setFirms] = useState<{ id: string; name: string }[]>([]);
  const [firmId, setFirmId] = useState('');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [out, setOut] = useState<RawItem[]>([]);
  const [inb, setInb] = useState<RawItem[]>([]);
  const [loading, setLoading] = useState(false);

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
      setLoading(true);
      const sb = createClient();
      const [y, m] = period.split('-').map(Number);
      const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
      const nextMonth = new Date(y, m, 1).toISOString().slice(0, 10);

      const { data: outRaw } = await sb
        .from('invoices')
        .select('invoice_items(vat_rate, subtotal, vat_amount)')
        .eq('company_id', firmId)
        .in('type', ['invoice', 'credit_note'])
        .gte('delivery_date', monthStart)
        .lt('delivery_date', nextMonth);
      const { data: inRaw } = await sb
        .from('invoices')
        .select('invoice_items(vat_rate, subtotal, vat_amount)')
        .eq('company_id', firmId)
        .eq('type', 'received_invoice')
        .gte('delivery_date', monthStart)
        .lt('delivery_date', nextMonth);

      const oi: RawItem[] = (outRaw || []).flatMap((i) => (i.invoice_items as RawItem[]) || []);
      const ii: RawItem[] = (inRaw || []).flatMap((i) => (i.invoice_items as RawItem[]) || []);
      setOut(oi);
      setInb(ii);
      setLoading(false);
    })();
  }, [firmId, period]);

  const t = aggregateVat(out, inb);

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <PageHeader
        title="Záznamová povinnosť DPH"
        subtitle="Evidencia DPH za mesiac — agregát výnosov a nákladov podľa sadzby"
      />

      <Card className="mb-4">
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Firma">
            <Select value={firmId} onChange={(e) => setFirmId(e.target.value)}>
              {firms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Obdobie">
            <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm" />
          </Field>
        </div>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard lines={7} />
          <SkeletonCard lines={7} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Výstupné plnenia (predaj)" />
            <div className="p-5 space-y-2 text-sm">
              <Row label="Základ 23%"  value={fmtEur(t.outBase23)} />
              <Row label="DPH 23%"      value={fmtEur(t.outVat23)} bold />
              <Row label="Základ 19%"  value={fmtEur(t.outBase19)} />
              <Row label="DPH 19%"      value={fmtEur(t.outVat19)} bold />
              <Row label="Základ 10%"  value={fmtEur(t.outBase10)} />
              <Row label="DPH 10%"      value={fmtEur(t.outVat10)} bold />
              <Row label="EU oslobodené" value={fmtEur(t.outBaseEu)} />
              <div className="border-t border-zinc-200 pt-2" />
              <Row label="DPH na výstupe spolu" value={fmtEur(t.totalOutVat)} bold variant="red" />
            </div>
          </Card>

          <Card>
            <CardHeader title="Vstupné plnenia (nákupy)" />
            <div className="p-5 space-y-2 text-sm">
              <Row label="Základ 23%" value={fmtEur(t.inBase23)} />
              <Row label="DPH 23%"     value={fmtEur(t.inVat23)} bold />
              <Row label="Základ 19%" value={fmtEur(t.inBase19)} />
              <Row label="DPH 19%"     value={fmtEur(t.inVat19)} bold />
              <Row label="Základ 10%" value={fmtEur(t.inBase10)} />
              <Row label="DPH 10%"     value={fmtEur(t.inVat10)} bold />
              <div className="border-t border-zinc-200 pt-2" />
              <Row label="DPH na vstupe spolu" value={fmtEur(t.totalInVat)} bold variant="green" />
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader title="Výsledok obdobia" />
            <div className="p-5">
              <Row label={t.obligation >= 0 ? 'Daňová povinnosť (do odvodu)' : 'Nadmerný odpočet'}
                value={fmtEur(Math.abs(t.obligation))}
                bold
                variant={t.obligation >= 0 ? 'red' : 'green'}
                big
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold, variant, big }: { label: string; value: string; bold?: boolean; variant?: 'green' | 'red'; big?: boolean }) {
  const color = variant === 'green' ? 'text-emerald-600' : variant === 'red' ? 'text-red-600' : 'text-zinc-900';
  return (
    <div className="flex items-center justify-between">
      <span className={`${big ? 'text-base' : 'text-sm'} text-zinc-600`}>{label}</span>
      <span className={`font-mono ${bold ? 'font-bold' : ''} ${big ? 'text-2xl tracking-[-0.04em]' : ''} ${color}`}>{value}</span>
    </div>
  );
}
