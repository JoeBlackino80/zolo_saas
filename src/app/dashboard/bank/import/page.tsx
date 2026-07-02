'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, Card, CardHeader, Button, Field, Select, Badge, EmptyState } from '@/components/ui';
import { Upload, FileText, Check, AlertCircle, ArrowRight, X, Loader2 } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { fmtEur, fmtDate } from '@/lib/utils';

type BankTx = {
  date: string;
  amount: number;
  currency: string;
  vs: string | null;
  message: string | null;
  counterparty: string;
  rawLine: string;
};

type MatchResult = {
  tx: BankTx;
  invoice?: { id: string; number: string; customer_name: string | null; total: number; paid_amount: number; type: string };
  status: 'matched' | 'no_match' | 'multiple' | 'already_paid' | 'confirmed';
  candidates?: { id: string; number: string; customer_name: string | null; total: number; paid_amount: number }[];
};

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const firstLine = text.split('\n')[0] || '';
  const delim = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const parse = (line: string): string[] => {
    const out: string[] = [];
    let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = false;
        else cur += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === delim) { out.push(cur); cur = ''; }
        else cur += c;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  return { headers: parse(lines[0]), rows: lines.slice(1).map(parse) };
}

function parseAmount(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/[^\d,.-]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : 0;
}

const FIELD_KEYS = ['date', 'amount', 'vs', 'message', 'counterparty'] as const;
type FieldKey = typeof FIELD_KEYS[number];

export default function BankImportPage() {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'mapping' | 'match'>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, string>>({ date: '', amount: '', vs: '', message: '', counterparty: '' });
  const [transactions, setTransactions] = useState<BankTx[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [applying, setApplying] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [firmId, setFirmId] = useState('');

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('companies').select('id, name').is('deleted_at', null).order('name');
      setCompanies(data || []);
      const cid = typeof window !== 'undefined' ? localStorage.getItem('zolo_firm') : '';
      setFirmId(cid || data?.[0]?.id || '');
    })();
  }, []);

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { headers, rows } = parseCsv(String(reader.result));
        setHeaders(headers);
        setRows(rows);
        // Auto-mapping heuristic
        const auto: Record<FieldKey, string> = { date: '', amount: '', vs: '', message: '', counterparty: '' };
        for (const h of headers) {
          const l = h.toLowerCase();
          if (!auto.date && (l.includes('dátum') || l.includes('datum') || l.includes('date') || l.includes('booking'))) auto.date = h;
          if (!auto.amount && (l.includes('suma') || l.includes('amount') || l.includes('kredit') || l.includes('credit'))) auto.amount = h;
          if (!auto.vs && (l.includes('vs') || l.includes('variabil'))) auto.vs = h;
          if (!auto.message && (l.includes('správa') || l.includes('sprava') || l.includes('message') || l.includes('poznám') || l.includes('narrat'))) auto.message = h;
          if (!auto.counterparty && (l.includes('protistrana') || l.includes('counter') || l.includes('partner') || l.includes('príkazca') || l.includes('meno'))) auto.counterparty = h;
        }
        setMapping(auto);
        setStep('mapping');
      } catch (e) {
        toast('Chyba parsovania CSV: ' + (e as Error).message, 'error');
      }
    };
    reader.readAsText(file);
  }

  function proceedToMatch() {
    if (!mapping.date || !mapping.amount) { toast('Priraď aspoň Dátum a Sumu', 'error'); return; }
    const headerIdx: Record<string, number> = {};
    headers.forEach((h, i) => { headerIdx[h] = i; });

    const txs: BankTx[] = rows.map((row) => {
      const get = (key: FieldKey) => (mapping[key] ? row[headerIdx[mapping[key]]] || '' : '');
      const dateRaw = get('date');
      // Normalize dates (support "23.05.2026", "2026-05-23", "23/05/2026")
      let dateNorm = dateRaw.trim();
      const m1 = dateNorm.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
      if (m1) dateNorm = `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`;
      const amount = parseAmount(get('amount'));
      return {
        date: dateNorm,
        amount,
        currency: 'EUR',
        vs: get('vs') || null,
        message: get('message') || null,
        counterparty: get('counterparty') || '',
        rawLine: row.join(' | '),
      };
    }).filter((t) => t.amount !== 0);

    setTransactions(txs);
    matchTransactions(txs);
    setStep('match');
  }

  async function matchTransactions(txs: BankTx[]) {
    const sb = createClient();
    // Načítaj všetky otvorené FA firmy
    const { data: invoices } = await sb
      .from('invoices')
      .select('id, number, customer_name, total, paid_amount, type, variable_symbol')
      .eq('company_id', firmId)
      .in('type', ['invoice', 'received_invoice'])
      .is('deleted_at', null)
      .limit(500);

    type Inv = { id: string; number: string; customer_name: string | null; total: number; paid_amount: number; type: string; variable_symbol: string | null };
    const invs = (invoices || []) as Inv[];

    // Build index by VS (both from variable_symbol column and from number digits)
    const byVs: Record<string, Inv[]> = {};
    for (const inv of invs) {
      const remaining = Number(inv.total) - Number(inv.paid_amount || 0);
      if (remaining <= 0.01) continue;
      const keys = [inv.variable_symbol, inv.number.replace(/\D/g, '')].filter((k): k is string => !!k);
      for (const k of keys) (byVs[k] ||= []).push(inv);
    }

    const results: MatchResult[] = txs.map((tx) => {
      // Positive amount = incoming payment for FA, negative = outgoing payment for PFA
      const isPositive = tx.amount > 0;
      const targetType = isPositive ? 'invoice' : 'received_invoice';
      const absAmount = Math.abs(tx.amount);
      const vsKey = (tx.vs || '').replace(/\D/g, '');

      if (vsKey && byVs[vsKey]) {
        const candidates = byVs[vsKey].filter((i) => i.type === targetType);
        if (candidates.length === 1) {
          const c = candidates[0];
          const remaining = Number(c.total) - Number(c.paid_amount || 0);
          // Match if amount is within 1 cent of remaining or total
          if (Math.abs(remaining - absAmount) < 0.02 || Math.abs(Number(c.total) - absAmount) < 0.02) {
            return { tx, invoice: c, status: 'matched' };
          }
          return { tx, invoice: c, status: 'matched', candidates: [c] }; // partial match
        }
        if (candidates.length > 1) return { tx, status: 'multiple', candidates };
      }
      return { tx, status: 'no_match' };
    });
    setMatches(results);
  }

  async function applyMatches() {
    const toApply = matches.filter((m) => m.status === 'matched' && m.invoice);
    if (toApply.length === 0) { toast('Nič na aplikovanie', 'error'); return; }
    if (!confirm(`Označiť ${toApply.length} faktúr ako zaplatené?`)) return;
    setApplying(true);
    const sb = createClient();
    let ok = 0;
    for (const m of toApply) {
      if (!m.invoice) continue;
      const remaining = Number(m.invoice.total) - Number(m.invoice.paid_amount || 0);
      const payAmount = Math.min(Math.abs(m.tx.amount), remaining);
      const { error } = await sb.rpc('mark_invoice_paid', {
        p_invoice_id: m.invoice.id,
        p_amount: payAmount,
        p_method: 'bank',
        p_notes: `Bank import: ${m.tx.rawLine.slice(0, 100)}`,
      });
      if (!error) {
        ok++;
        setMatches((prev) => prev.map((mm) => mm === m ? { ...mm, status: 'confirmed' as const } : mm));
      }
    }
    setApplying(false);
    toast(`${ok}/${toApply.length} platieb aplikovaných`, ok === toApply.length ? 'success' : 'error');
  }

  const matchedCount = matches.filter((m) => m.status === 'matched').length;
  const noMatchCount = matches.filter((m) => m.status === 'no_match').length;
  const multipleCount = matches.filter((m) => m.status === 'multiple').length;

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <PageHeader back={{ href: '/dashboard/bank' }} title="Import bankového výpisu" subtitle="CSV z internetbankingu → auto-match FA cez variabilný symbol" />

      <Card className="mb-4">
        <div className="p-5">
          <Field label="Firma (majiteľ účtu)">
            <Select value={firmId} onChange={(e) => setFirmId(e.target.value)}>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      {/* Progress rail */}
      <div className="flex items-center gap-2 mb-6 px-1">
        {(['upload', 'mapping', 'match'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
              s === step ? 'bg-zinc-900 text-white' : (['upload', 'mapping', 'match'] as const).indexOf(step) > i ? 'bg-zinc-200 text-zinc-500' : 'bg-transparent border border-zinc-200 text-zinc-300'
            }`}>{i + 1}</div>
            <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${s === step ? 'text-zinc-900' : 'text-zinc-400'}`}>
              {s === 'upload' ? 'Nahrať CSV' : s === 'mapping' ? 'Priradiť polia' : 'Auto-match'}
            </span>
            {i < 2 && <div className="flex-1 h-px bg-zinc-200" />}
          </div>
        ))}
      </div>

      {step === 'upload' && (
        <Card>
          <div className="p-8">
            <label
              className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 hover:border-zinc-900 rounded-xl p-10 cursor-pointer transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
            >
              <Upload size={32} className="text-zinc-400 mb-3" />
              <div className="text-sm font-semibold text-zinc-700">Klikni alebo pretiahni CSV výpis</div>
              <div className="text-xs text-zinc-500 mt-1">SLSP · Tatra Banka · VÚB · ČSOB · Fio · Revolut Business</div>
              <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
            </label>
          </div>
        </Card>
      )}

      {step === 'mapping' && (
        <>
          <Card className="mb-4">
            <CardHeader title="Priraď polia" subtitle={`${rows.length} transakcií v CSV`} />
            <div className="p-5 space-y-3">
              {(['date', 'amount', 'vs', 'message', 'counterparty'] as const).map((f) => (
                <div key={f} className="grid grid-cols-2 gap-3 items-center">
                  <div className="text-[13px] text-zinc-700">
                    {f === 'date' ? 'Dátum *' : f === 'amount' ? 'Suma *' : f === 'vs' ? 'Variabilný symbol' : f === 'message' ? 'Správa / poznámka' : 'Protistrana'}
                  </div>
                  <Select value={mapping[f]} onChange={(e) => setMapping({ ...mapping, [f]: e.target.value })}>
                    <option value="">— nepriraď —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </Select>
                </div>
              ))}
            </div>
          </Card>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep('upload')}>Späť</Button>
            <Button variant="primary" onClick={proceedToMatch}>Spracovať a spárovať <ArrowRight size={14} /></Button>
          </div>
        </>
      )}

      {step === 'match' && (
        <>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <StatBox label="Transakcií" value={String(matches.length)} />
            <StatBox label="Auto-match" value={String(matchedCount)} variant="green" />
            <StatBox label="Nespárované" value={String(noMatchCount)} variant="amber" />
            <StatBox label="Viac možností" value={String(multipleCount)} variant="amber" />
          </div>

          <Card>
            <CardHeader
              title="Výsledok párovania"
              action={matchedCount > 0 && (
                <Button variant="primary" onClick={applyMatches} disabled={applying}>
                  {applying ? <><Loader2 size={14} className="animate-spin" /> Aplikujem…</> : <><Check size={14} /> Označiť {matchedCount} FA ako zaplatené</>}
                </Button>
              )}
            />
            {matches.length === 0 ? (
              <EmptyState icon={<AlertCircle size={24} />} title="Žiadne transakcie" description="CSV neobsahuje žiadne pohyby." />
            ) : (
              <div className="divide-y divide-zinc-100">
                {matches.map((m, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-6">
                      {m.status === 'matched' ? <Check size={16} className="text-emerald-500" /> :
                       m.status === 'confirmed' ? <Check size={16} className="text-emerald-700" /> :
                       m.status === 'multiple' ? <AlertCircle size={16} className="text-amber-500" /> :
                       <X size={16} className="text-zinc-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-zinc-900">{m.tx.counterparty || '—'}</div>
                      <div className="text-[11px] text-zinc-500 truncate">
                        {fmtDate(m.tx.date)} · VS: {m.tx.vs || '—'} · {m.tx.message?.slice(0, 60) || '—'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-mono font-semibold text-[13px] tabular-nums ${m.tx.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {m.tx.amount > 0 ? '+' : ''}{fmtEur(m.tx.amount)}
                      </div>
                    </div>
                    <div className="w-52 text-right">
                      {m.invoice ? (
                        <>
                          <div className="text-[11px] font-mono text-zinc-900">{m.invoice.number}</div>
                          <div className="text-[10px] text-zinc-500 truncate">{m.invoice.customer_name || '—'}</div>
                        </>
                      ) : m.status === 'multiple' ? (
                        <Badge variant="amber">{m.candidates?.length || 0} možností</Badge>
                      ) : m.status === 'no_match' ? (
                        <Badge variant="gray">Nespárované</Badge>
                      ) : m.status === 'confirmed' ? (
                        <Badge variant="green">Zaplatené</Badge>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function StatBox({ label, value, variant }: { label: string; value: string; variant?: 'green' | 'amber' | 'red' }) {
  const color = variant === 'green' ? 'text-emerald-600' : variant === 'amber' ? 'text-amber-600' : 'text-zinc-900';
  return (
    <div className="bg-white border border-zinc-100 rounded-2xl p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">{label}</div>
      <div className={`text-[24px] font-bold tracking-[-0.02em] tabular-nums mt-1 ${color}`}>{value}</div>
    </div>
  );
}
