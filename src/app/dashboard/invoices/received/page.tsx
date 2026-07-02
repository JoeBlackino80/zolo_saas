'use client';

import { useState, useEffect, useRef } from 'react';
import { PageHeader, Card, CardHeader, Button, Badge, EmptyState, Field, Input, Select } from '@/components/ui';
import { Upload, FileText, Sparkles, Check, AlertCircle, Trash2, Save, Loader2, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { fmtEur, fmtDate } from '@/lib/utils';
import Link from 'next/link';

type Extracted = {
  number?: string;
  date?: string;
  dueDate?: string;
  variableSymbol?: string;
  partnerName?: string;
  partnerIco?: string;
  partnerDic?: string;
  partnerIcDph?: string;
  partnerStreet?: string;
  partnerCity?: string;
  partnerZip?: string;
  iban?: string;
  subtotal?: number;
  vatAmount?: number;
  total?: number;
  currency?: string;
  vatRate?: number;
  confidence?: 'high' | 'medium' | 'low';
};

type ResultRow = { file: string; data?: Extracted; error?: string; edited?: Extracted; saved?: boolean };

type Pfa = { id: string; number: string; supplier_name: string | null; issue_date: string; due_date: string; total: number; paid_amount: number | null; status: string; currency: string };

export default function ReceivedInvoicesPage() {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [pfas, setPfas] = useState<Pfa[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => { loadPfas(); }, []);

  async function loadPfas() {
    setLoadingList(true);
    const sb = createClient();
    const { data } = await sb
      .from('invoices')
      .select('id, number, supplier_name, issue_date, due_date, total, paid_amount, status, currency')
      .eq('type', 'received_invoice')
      .is('deleted_at', null)
      .order('issue_date', { ascending: false })
      .limit(50);
    setPfas((data as Pfa[]) || []);
    setLoadingList(false);
  }

  function pickFiles(fileList: FileList | File[]) {
    const arr = Array.from(fileList);
    const valid = arr.filter((f) => {
      const ok = f.type.startsWith('image/') || f.type === 'application/pdf';
      if (!ok) toast(`${f.name}: nepodporovaný typ (${f.type || '?'})`, 'error');
      return ok;
    });
    setFiles((prev) => [...prev, ...valid]);
  }

  async function processFiles() {
    if (files.length === 0) return;
    setProcessing(true);
    setResults([]);
    // Convert to base64
    const payload: { name: string; base64: string; mediaType: string }[] = [];
    for (const f of files) {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve((r.result as string).split(',')[1]);
        r.onerror = () => reject(new Error('read fail'));
        r.readAsDataURL(f);
      });
      payload.push({ name: f.name, base64, mediaType: f.type });
    }

    try {
      const res = await fetch('/api/ai-extract-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: payload }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'API error');
      const parsed: ResultRow[] = (j.results || []).map((r: ResultRow) => ({
        ...r,
        edited: r.data ? { ...r.data } : undefined,
      }));
      setResults(parsed);
      const ok = parsed.filter((r) => r.data).length;
      toast(`Extrahované ${ok}/${parsed.length}`, ok === parsed.length ? 'success' : 'error');
    } catch (e) {
      toast('Chyba: ' + (e as Error).message, 'error');
    } finally {
      setProcessing(false);
    }
  }

  function updateEdit(idx: number, patch: Partial<Extracted>) {
    setResults((prev) => prev.map((r, i) => i !== idx ? r : { ...r, edited: { ...(r.edited || {}), ...patch } }));
  }

  async function saveAll() {
    const toSave = results.filter((r) => r.edited && !r.saved);
    if (toSave.length === 0) { toast('Žiadne nové PFA na uloženie', 'error'); return; }
    setSaving(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    const firmId = typeof window !== 'undefined' ? localStorage.getItem('zolo_firm') : null;
    if (!user || !firmId) { toast('Vyber firmu v sidebar', 'error'); setSaving(false); return; }

    let ok = 0;
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (!r.edited || r.saved) continue;
      const d = r.edited;
      const today = new Date().toISOString().slice(0, 10);
      const issueDate = d.date || today;
      const dueDate = d.dueDate || issueDate;
      const total = Number(d.total || 0);
      const subtotal = Number(d.subtotal || (total / (1 + (d.vatRate ?? 23) / 100)));
      const vatAmount = Number(d.vatAmount || (total - subtotal));

      const { data: inv, error } = await sb.from('invoices').insert({
        company_id: firmId,
        type: 'received_invoice',
        number: d.number || `PFA-${Date.now()}-${i}`,
        supplier_name: d.partnerName || null,
        supplier_ico: d.partnerIco || null,
        supplier_dic: d.partnerDic || null,
        supplier_ic_dph: d.partnerIcDph || null,
        issue_date: issueDate,
        delivery_date: issueDate,
        due_date: dueDate,
        variable_symbol: d.variableSymbol || null,
        subtotal: +subtotal.toFixed(2),
        vat_amount: +vatAmount.toFixed(2),
        total: +total.toFixed(2),
        paid_amount: 0,
        status: 'issued',
        currency: d.currency || 'EUR',
        exchange_rate: 1,
        created_by: user.id,
      }).select('id').single();

      if (error) {
        setResults((prev) => prev.map((rr, j) => j !== i ? rr : { ...rr, error: error.message }));
        continue;
      }

      // Auto-post JE (silently — ambiguity fix už v batch 41)
      try { await sb.rpc('post_invoice_journal', { p_invoice_id: inv.id, p_event: 'issue' }); } catch {}

      setResults((prev) => prev.map((rr, j) => j !== i ? rr : { ...rr, saved: true }));
      ok++;
    }
    setSaving(false);
    toast(`${ok}/${toSave.length} PFA uložených`, 'success');
    setFiles([]);
    loadPfas();
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <PageHeader
        back={{ href: '/dashboard/invoices' }}
        title="Prijaté faktúry"
        subtitle="Nahraj PDF alebo foto — AI automaticky vyplní všetky údaje a zaeviduje PFA. Bez ručného prepisovania."
      />

      {/* Upload zóna */}
      <Card className="mb-6">
        <CardHeader
          title="Nahrať PFA"
          subtitle="Podporujeme PDF · JPG · PNG · WebP · HEIC (foto). Multi-file. Aj sken papierových faktúr."
          action={files.length > 0 && (
            <Button variant="primary" onClick={processFiles} disabled={processing}>
              {processing ? <><Loader2 size={14} className="animate-spin" /> Extrahujem…</> : <><Sparkles size={14} /> Extrahovať ({files.length})</>}
            </Button>
          )}
        />
        <div className="p-5">
          <label
            className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 hover:border-zinc-900 rounded-xl p-10 cursor-pointer transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); pickFiles(e.dataTransfer.files); }}
          >
            <Upload size={32} className="text-zinc-400 mb-3" />
            <div className="text-[15px] font-semibold text-zinc-900 tracking-tight">Klikni alebo pretiahni PFA</div>
            <div className="text-[12px] text-zinc-500 mt-1">PDF · JPG · PNG · WebP · HEIC — až 10 súborov naraz</div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,image/*,application/pdf"
              className="hidden"
              onChange={(e) => e.target.files && pickFiles(e.target.files)}
            />
          </label>

          {files.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">Vybrané súbory ({files.length})</div>
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-zinc-50 rounded-lg px-3 py-2">
                  <FileText size={14} className="text-zinc-400" />
                  <span className="flex-1 truncate font-medium text-zinc-900">{f.name}</span>
                  <span className="text-[11px] text-zinc-500">{(f.size / 1024).toFixed(0)} kB</span>
                  <button onClick={() => setFiles((arr) => arr.filter((_, j) => j !== i))} className="text-zinc-400 hover:text-red-600 p-1"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Výsledky extrakcie — inline editing */}
      {results.length > 0 && (
        <Card className="mb-6">
          <CardHeader
            title={`Extrahované PFA (${results.filter((r) => r.data).length})`}
            subtitle="Skontroluj údaje. Uprav pred uložením ak treba."
            action={
              <Button variant="primary" onClick={saveAll} disabled={saving || results.every((r) => !r.data || r.saved)}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> Ukladám…</> : <><Save size={14} /> Uložiť všetky</>}
              </Button>
            }
          />
          <div className="divide-y divide-zinc-100">
            {results.map((r, i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  {r.saved ? <Check size={16} className="text-emerald-500" />
                    : r.error ? <AlertCircle size={16} className="text-red-500" />
                    : r.data ? <Sparkles size={16} className="text-zinc-500" />
                    : <Loader2 size={16} className="animate-spin text-zinc-400" />}
                  <span className="text-[13px] font-medium text-zinc-900">{r.file}</span>
                  {r.data?.confidence && (
                    <Badge variant={r.data.confidence === 'high' ? 'green' : r.data.confidence === 'medium' ? 'amber' : 'red'}>
                      {r.data.confidence}
                    </Badge>
                  )}
                  {r.saved && <Badge variant="green">Uložené</Badge>}
                </div>

                {r.error && <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{r.error}</div>}

                {r.edited && !r.saved && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <Field label="Číslo faktúry">
                      <Input value={r.edited.number || ''} onChange={(e) => updateEdit(i, { number: e.target.value })} />
                    </Field>
                    <Field label="Dátum vystavenia">
                      <Input type="date" value={r.edited.date || ''} onChange={(e) => updateEdit(i, { date: e.target.value })} />
                    </Field>
                    <Field label="Splatná">
                      <Input type="date" value={r.edited.dueDate || ''} onChange={(e) => updateEdit(i, { dueDate: e.target.value })} />
                    </Field>
                    <Field label="Var. symbol">
                      <Input value={r.edited.variableSymbol || ''} onChange={(e) => updateEdit(i, { variableSymbol: e.target.value })} />
                    </Field>

                    <div className="sm:col-span-2"><Field label="Dodávateľ">
                      <Input value={r.edited.partnerName || ''} onChange={(e) => updateEdit(i, { partnerName: e.target.value })} />
                    </Field></div>
                    <Field label="IČO">
                      <Input value={r.edited.partnerIco || ''} onChange={(e) => updateEdit(i, { partnerIco: e.target.value })} />
                    </Field>
                    <Field label="IČ DPH">
                      <Input value={r.edited.partnerIcDph || ''} onChange={(e) => updateEdit(i, { partnerIcDph: e.target.value })} />
                    </Field>

                    <Field label="Základ (€)">
                      <Input type="number" step="0.01" value={r.edited.subtotal ?? ''} onChange={(e) => updateEdit(i, { subtotal: +e.target.value })} />
                    </Field>
                    <Field label="DPH (€)">
                      <Input type="number" step="0.01" value={r.edited.vatAmount ?? ''} onChange={(e) => updateEdit(i, { vatAmount: +e.target.value })} />
                    </Field>
                    <Field label="DPH sadzba">
                      <Select value={r.edited.vatRate ?? 23} onChange={(e) => updateEdit(i, { vatRate: +e.target.value })}>
                        <option value={23}>23%</option>
                        <option value={19}>19%</option>
                        <option value={10}>10%</option>
                        <option value={0}>0%</option>
                      </Select>
                    </Field>
                    <Field label="Spolu (€)">
                      <Input type="number" step="0.01" value={r.edited.total ?? ''} onChange={(e) => updateEdit(i, { total: +e.target.value })} className="font-bold" />
                    </Field>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Zoznam existujúcich PFA */}
      <Card>
        <CardHeader
          title={`Prijaté faktúry (${pfas.length})`}
          subtitle="Evidencia dodávateľských faktúr — auto-zaúčtované MD 132/518 + MD 34301 / D 321"
        />
        {loadingList ? (
          <div className="p-10 text-center text-zinc-500 text-sm">Načítavam…</div>
        ) : pfas.length === 0 ? (
          <EmptyState
            icon={<Package size={24} />}
            title="Žiadne prijaté faktúry"
            description="Nahraj prvú PFA vyššie — AI ju spracuje a zaúčtuje za pár sekúnd."
          />
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                  <th className="text-left px-5 py-3">Číslo</th>
                  <th className="text-left px-3 py-3">Dodávateľ</th>
                  <th className="text-center px-3 py-3">Vystavená</th>
                  <th className="text-center px-3 py-3">Splatná</th>
                  <th className="text-right px-3 py-3">Suma</th>
                  <th className="text-center px-3 py-3">Stav</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {pfas.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50">
                    <td className="px-5 py-3"><Link href={`/dashboard/invoices/${p.id}`} className="font-mono text-xs font-medium text-zinc-900 hover:underline">{p.number}</Link></td>
                    <td className="px-3 py-3 text-zinc-700">{p.supplier_name || '—'}</td>
                    <td className="px-3 py-3 text-center font-mono text-xs text-zinc-600">{fmtDate(p.issue_date)}</td>
                    <td className="px-3 py-3 text-center font-mono text-xs text-zinc-600">{fmtDate(p.due_date)}</td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums font-medium">{fmtEur(Number(p.total))}</td>
                    <td className="px-3 py-3 text-center">
                      <Badge variant={p.status === 'paid' ? 'green' : 'amber'}>{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
