'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, Card, CardHeader, Button, Field, Select } from '@/components/ui';
import { Download, FileCode } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { aggregateVat, generateDpDphXml, generateKvDphXml, generateSvDphXml } from '@/lib/vat';

type Company = { id: string; name: string; dic: string | null; ic_dph: string | null };

export default function VatReturnClient({ companies, kind, title }: { companies: Company[]; kind: 'dp' | 'kv' | 'sv'; title: string }) {
  const toast = useToast();
  const [firmId, setFirmId] = useState(companies[0]?.id || '');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [xml, setXml] = useState<string>('');
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!firmId) { toast('Vyber firmu', 'error'); return; }
    const firm = companies.find((c) => c.id === firmId);
    if (!firm) return;
    setLoading(true);
    try {
      const sb = createClient();
      const [y, m] = period.split('-').map(Number);
      const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
      const nextMonth = new Date(y, m, 1).toISOString().slice(0, 10);

      const { data: outRaw } = await sb
        .from('invoices')
        .select('id, number, issue_date, customer_name, customer_ic_dph, invoice_items(vat_rate, subtotal, vat_amount)')
        .eq('company_id', firmId)
        .in('type', ['invoice', 'credit_note'])
        .gte('issue_date', monthStart)
        .lt('issue_date', nextMonth);
      const { data: inRaw } = await sb
        .from('invoices')
        .select('id, number, issue_date, supplier_name, supplier_ic_dph, invoice_items(vat_rate, subtotal, vat_amount)')
        .eq('company_id', firmId)
        .in('type', ['received_invoice'])
        .gte('issue_date', monthStart)
        .lt('issue_date', nextMonth);

      type RawItem = { vat_rate: number; subtotal: number; vat_amount: number };
      const outInvoices = (outRaw || []).map((i) => ({
        number: (i.number as string) || '',
        issue_date: (i.issue_date as string) || '',
        customer_name: (i.customer_name as string | null) || null,
        customer_ic_dph: (i.customer_ic_dph as string | null) || null,
        items: ((i.invoice_items as RawItem[]) || []),
      }));
      const inInvoices = (inRaw || []).map((i) => ({
        number: (i.number as string) || '',
        issue_date: (i.issue_date as string) || '',
        supplier_name: (i.supplier_name as string | null) || null,
        supplier_ic_dph: (i.supplier_ic_dph as string | null) || null,
        items: ((i.invoice_items as RawItem[]) || []),
      }));

      let result = '';
      if (kind === 'dp') {
        const allOutItems = outInvoices.flatMap((i) => i.items);
        const allInItems = inInvoices.flatMap((i) => i.items);
        const t = aggregateVat(allOutItems, allInItems);
        result = generateDpDphXml({ dic: firm.dic, ic_dph: firm.ic_dph, name: firm.name }, period, t);
      } else if (kind === 'kv') {
        result = generateKvDphXml({ dic: firm.dic, ic_dph: firm.ic_dph, name: firm.name }, period, outInvoices, inInvoices);
      } else {
        // SV — EU deliveries (vat_rate=0 and customer outside SK)
        const euOutInvoices = outInvoices
          .filter((i) => !(i.customer_ic_dph || '').toUpperCase().startsWith('SK'))
          .map((i) => ({
            customer_ic_dph: i.customer_ic_dph,
            baseEu: i.items.filter((it) => Number(it.vat_rate) === 0).reduce((s, it) => s + Number(it.subtotal || 0), 0),
          }))
          .filter((i) => i.baseEu > 0);
        result = generateSvDphXml({ dic: firm.dic, ic_dph: firm.ic_dph, name: firm.name }, period, euOutInvoices);
      }
      setXml(result);
      toast('XML vygenerované', 'success');
    } catch (e) {
      toast('Chyba: ' + (e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!xml) return;
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${kind.toUpperCase()}DPH_${period.replace('-', '_')}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader title={title} subtitle="Generuje XML pre podanie na Finančnú správu SR" />

      <Card>
        <CardHeader title="Parametre výkazu" />
        <div className="p-5 grid grid-cols-3 gap-4">
          <Field label="Firma">
            <Select value={firmId} onChange={(e) => setFirmId(e.target.value)}>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}{c.ic_dph ? ` (${c.ic_dph})` : ''}</option>)}
            </Select>
          </Field>
          <Field label="Obdobie">
            <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <div className="flex items-end gap-2">
            <Button variant="primary" onClick={generate} disabled={loading}>
              <FileCode size={14} /> {loading ? 'Generujem…' : 'Generovať XML'}
            </Button>
            {xml && (
              <Button variant="secondary" onClick={download}>
                <Download size={14} /> Stiahnuť
              </Button>
            )}
          </div>
        </div>
      </Card>

      {xml && (
        <Card className="mt-4">
          <CardHeader title="Náhľad XML" subtitle="Skontroluj pred podaním cez eDane" />
          <pre className="p-4 text-[11px] font-mono text-slate-700 bg-slate-50 max-h-[60vh] overflow-auto whitespace-pre-wrap">
            {xml}
          </pre>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader title="Ako podať" />
        <div className="p-5 text-sm text-slate-600 space-y-2">
          <p>1. <strong>Stiahni XML</strong> tlačidlom hore.</p>
          <p>2. Otvor <a href="https://www.financnasprava.sk" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">portál Finančnej správy SR</a>.</p>
          <p>3. Prihlás sa eID kartou alebo občianskym preukazom s čipom.</p>
          <p>4. <strong>Elektronické podanie → Daň z pridanej hodnoty</strong> → nahraj XML súbor.</p>
          <p>5. Skontroluj a podaj. Potvrdenie ti príde na adresu uvedenú v profile FS.</p>
        </div>
      </Card>
    </div>
  );
}
