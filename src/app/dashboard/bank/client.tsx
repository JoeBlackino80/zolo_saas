'use client';

import { useState } from 'react';
import { PageHeader, Card, CardHeader, Button, Badge } from '@/components/ui';
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabase/client';
import { fmtEur, fmtDate } from '@/lib/utils';

type Tx = { date: string; amount: number; vs: string; ks: string; ss: string; description: string };
type Match = { tx: Tx; invoice?: { id: string; number: string; total: number; customer_name: string | null } | null };

export default function BankImportClient() {
  const toast = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ matched: number; unmatched: number; total: number } | null>(null);

  async function handleFile(file: File) {
    setLoading(true);
    try {
      const text = await file.text();
      const isXml = file.name.toLowerCase().endsWith('.xml') || text.trimStart().startsWith('<');
      const txs = isXml ? parseCamt(text) : parseCsv(text);
      if (txs.length === 0) { toast('Žiadne transakcie v súbore', 'error'); setLoading(false); return; }
      const sb = createClient();
      const { data: invoices } = await sb
        .from('invoices')
        .select('id, number, variable_symbol, total, paid_amount, customer_name, status')
        .eq('type', 'invoice')
        .neq('status', 'paid')
        .is('deleted_at', null);
      const invs = invoices || [];
      const m: Match[] = txs.map((tx) => {
        const inv = invs.find((i) => {
          const vs = (i.variable_symbol || '').trim();
          if (vs && vs === tx.vs.trim()) return true;
          const remaining = Number(i.total) - Number(i.paid_amount || 0);
          if (Math.abs(Math.abs(tx.amount) - remaining) < 0.01) return true;
          return false;
        });
        return { tx, invoice: inv ? { id: inv.id, number: inv.number, total: Number(inv.total), customer_name: inv.customer_name } : null };
      });
      setMatches(m);
      setStats({ matched: m.filter((x) => x.invoice).length, unmatched: m.filter((x) => !x.invoice).length, total: m.length });
      toast(`${m.filter((x) => x.invoice).length} / ${m.length} spárované`, 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function applyMatches() {
    const toApply = matches.filter((m) => m.invoice);
    if (toApply.length === 0) return;
    const sb = createClient();
    let ok = 0;
    for (const m of toApply) {
      const { error } = await sb.rpc('mark_invoice_paid', {
        p_invoice_id: m.invoice!.id,
        p_amount: Math.abs(m.tx.amount),
        p_method: 'bank',
        p_notes: `Bankový výpis · ${fmtDate(m.tx.date)} · VS ${m.tx.vs || '—'}`,
      });
      if (!error) ok++;
    }
    toast(`${ok} faktúr zaplatených · denníkové zápisy vytvorené`, 'success');
    setMatches([]);
    setStats(null);
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      <PageHeader title="Bankový výpis" subtitle="Import CSV výpisu + automatické párovanie k faktúram cez VS" />

      <Card className="mb-4">
        <div className="p-6">
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-10 cursor-pointer transition">
            <Upload size={32} className="text-slate-400 mb-3" />
            <div className="text-sm font-semibold text-slate-700">{loading ? 'Spracovávam…' : 'Klikni alebo pretiahni CSV výpis'}</div>
            <div className="text-xs text-slate-500 mt-1">CSV alebo CAMT.053 XML · Tatra · SLSP · VÚB · iné</div>
            <input
              type="file"
              accept=".csv,.xml,text/csv,application/xml"
              className="hidden"
              disabled={loading}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        </div>
      </Card>

      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Card><div className="p-5"><div className="text-xs text-slate-500 font-semibold uppercase">Spolu transakcií</div><div className="text-2xl font-bold mt-2">{stats.total}</div></div></Card>
          <Card><div className="p-5"><div className="text-xs text-slate-500 font-semibold uppercase">Spárované</div><div className="text-2xl font-bold mt-2 text-emerald-600">{stats.matched}</div></div></Card>
          <Card><div className="p-5"><div className="text-xs text-slate-500 font-semibold uppercase">Nespárované</div><div className="text-2xl font-bold mt-2 text-amber-600">{stats.unmatched}</div></div></Card>
        </div>
      )}

      {matches.length > 0 && (
        <Card>
          <CardHeader
            title="Spárované transakcie"
            action={<Button variant="primary" onClick={applyMatches}>Označiť zaplatené</Button>}
          />
          <div className="overflow-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="text-center px-3 py-3 w-8"></th>
                  <th className="text-center px-3 py-3">Dátum</th>
                  <th className="text-left px-3 py-3">VS</th>
                  <th className="text-right px-3 py-3">Suma</th>
                  <th className="text-left px-3 py-3">Popis</th>
                  <th className="text-left px-3 py-3">Faktúra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matches.map((m, i) => (
                  <tr key={i} className={m.invoice ? 'bg-emerald-50/30' : ''}>
                    <td className="text-center px-3 py-2">
                      {m.invoice ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-amber-500" />}
                    </td>
                    <td className="text-center px-3 py-2 font-mono text-xs">{fmtDate(m.tx.date)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{m.tx.vs}</td>
                    <td className="text-right px-3 py-2 font-mono">{fmtEur(m.tx.amount)}</td>
                    <td className="px-3 py-2 text-xs text-slate-600 truncate max-w-xs">{m.tx.description}</td>
                    <td className="px-3 py-2">
                      {m.invoice ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="green">{m.invoice.number}</Badge>
                          <span className="text-xs text-slate-600">{m.invoice.customer_name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// Simple CSV parser supporting common SK bank formats
function parseCsv(text: string): Tx[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  // Detect delimiter
  const delim = lines[0].includes(';') ? ';' : ',';
  const rows = lines.slice(1).map((l) => l.split(delim).map((c) => c.replace(/^"|"$/g, '').trim()));
  // Heuristic: find columns by header keywords
  const headers = lines[0].toLowerCase().split(delim).map((h) => h.replace(/"/g, '').trim());
  const find = (...kw: string[]) => headers.findIndex((h) => kw.some((k) => h.includes(k)));
  const dateIdx = find('dátum', 'datum', 'date');
  const amountIdx = find('suma', 'amount', 'částka');
  const vsIdx = find('vs', 'variabil', 'symbol');
  const descIdx = find('popis', 'description', 'note', 'message');
  return rows
    .map((r): Tx | null => {
      const date = parseDate(r[dateIdx] || '');
      const amount = parseAmount(r[amountIdx] || '0');
      if (!date || amount === 0) return null;
      return {
        date,
        amount,
        vs: r[vsIdx] || '',
        ks: '',
        ss: '',
        description: r[descIdx] || '',
      };
    })
    .filter((x): x is Tx => x !== null);
}

function parseDate(s: string): string {
  // try DD.MM.YYYY then ISO
  const sk = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (sk) return `${sk[3]}-${sk[2].padStart(2, '0')}-${sk[1].padStart(2, '0')}`;
  const iso = s.match(/\d{4}-\d{2}-\d{2}/);
  return iso ? iso[0] : '';
}

function parseAmount(s: string): number {
  return parseFloat(s.replace(/\s/g, '').replace(',', '.')) || 0;
}

// CAMT.053 (SEPA bank statement XML) parser — works for SLSP, Tatra, VÚB internet banking exports
function parseCamt(xml: string): Tx[] {
  if (typeof DOMParser === 'undefined') return [];
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const txs: Tx[] = [];
  const entries = Array.from(doc.getElementsByTagName('Ntry'));
  for (const e of entries) {
    const amtEl = e.getElementsByTagName('Amt')[0];
    const cdtDbt = e.getElementsByTagName('CdtDbtInd')[0]?.textContent || 'CRDT';
    const dateEl = e.getElementsByTagName('BookgDt')[0]?.getElementsByTagName('Dt')[0]
              || e.getElementsByTagName('ValDt')[0]?.getElementsByTagName('Dt')[0];
    const amount = parseFloat(amtEl?.textContent || '0') * (cdtDbt === 'DBIT' ? -1 : 1);
    const date = dateEl?.textContent || '';
    if (!date || amount === 0) continue;
    // VS / KS / SS sit under RmtInf/Strd/CdtrRefInf or under <Prtry> or as structured Refs
    const refs = Array.from(e.getElementsByTagName('Strd'));
    let vs = '', ks = '', ss = '';
    for (const r of refs) {
      const t = r.textContent || '';
      const mVS = t.match(/VS[:/=]?\s*(\d{1,10})/i);
      const mKS = t.match(/KS[:/=]?\s*(\d{1,10})/i);
      const mSS = t.match(/SS[:/=]?\s*(\d{1,10})/i);
      if (mVS) vs = mVS[1];
      if (mKS) ks = mKS[1];
      if (mSS) ss = mSS[1];
    }
    // Slovak banks often put symbols in AddtlNtryInf or Prtry tags
    if (!vs) {
      const addl = e.getElementsByTagName('AddtlNtryInf')[0]?.textContent || '';
      const m = addl.match(/VS[:/= ]\s*(\d{1,10})/i);
      if (m) vs = m[1];
    }
    const description = e.getElementsByTagName('AddtlNtryInf')[0]?.textContent
      || Array.from(e.getElementsByTagName('Ustrd')).map((u) => u.textContent).join(' ') || '';
    txs.push({ date, amount, vs, ks, ss, description: description.trim().slice(0, 200) });
  }
  return txs;
}
