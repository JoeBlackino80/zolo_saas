'use client';

import { useState, useRef } from 'react';
import { PageHeader, Card, CardHeader, Button, Field, Input, Select, Badge } from '@/components/ui';
import { Upload, Sparkles, FileText, AlertCircle, Check } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabase/client';
import { fmtEur } from '@/lib/utils';

type ExtractedInvoice = {
  number: string;
  date: string;
  partnerName: string;
  partnerIco: string;
  partnerIcDph: string;
  total: number;
  vatAmount: number;
  subtotal: number;
  kind: 'in' | 'out';
};

export default function ImportPage() {
  const toast = useToast();
  const [apiKey, setApiKey] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<{ file: string; data?: ExtractedInvoice; error?: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function setSavedKey() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zolo_anthropic_key');
      if (saved && !apiKey) setApiKey(saved);
    }
  }
  if (typeof window !== 'undefined' && !apiKey) setSavedKey();

  function saveKey(k: string) {
    setApiKey(k);
    localStorage.setItem('zolo_anthropic_key', k);
  }

  async function processFiles() {
    if (!apiKey) { toast('Najprv zadaj Anthropic API kľúč', 'error'); return; }
    if (files.length === 0) { toast('Pretiahni súbory', 'error'); return; }
    setProcessing(true);
    setResults([]);
    const out: typeof results = [];
    for (const file of files) {
      try {
        let blob: Blob = file;
        let mediaType = file.type || 'image/jpeg';
        if (mediaType === 'application/pdf') {
          // PDF: ask Claude to handle PDF directly via media_type
        } else if (mediaType === 'image/heic' || mediaType === 'image/heif') {
          toast('HEIC zatiaľ nepodporované, konvertuj na JPG', 'error');
          continue;
        }
        const base64 = await blobToBase64(blob);
        const prompt = `Si DPH asistent pre slovenské firmy. Analyzuj túto faktúru a vráť IBA JSON (bez markdown):
{
  "number": "...", "date": "YYYY-MM-DD", "partnerName": "...",
  "partnerIco": "...", "partnerIcDph": "SK...", "subtotal": 0,
  "vatAmount": 0, "total": 0, "kind": "in" alebo "out"
}
kind="out" ak my sme dodávateľ, "in" ak my sme odberateľ.`;

        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1200,
            messages: [{
              role: 'user',
              content: [
                { type: file.type === 'application/pdf' ? 'document' : 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
                { type: 'text', text: prompt },
              ],
            }],
          }),
        });
        if (!res.ok) throw new Error('API ' + res.status);
        const j = await res.json();
        const content = (j.content?.[0]?.text || '').replace(/```json|```/g, '').trim();
        const match = content.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('Claude nevrátil JSON');
        const data: ExtractedInvoice = JSON.parse(match[0]);
        out.push({ file: file.name, data });
      } catch (e) {
        out.push({ file: file.name, error: (e as Error).message });
      }
      setResults([...out]);
    }
    setProcessing(false);
    toast(`${out.filter((x) => x.data).length} / ${files.length} úspešných`, 'success');
  }

  async function applyToCloud() {
    const ok = results.filter((r) => r.data);
    if (ok.length === 0) return;
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    const firmId = localStorage.getItem('zolo_firm');
    if (!user || !firmId) { toast('Vyber firmu v sidebare', 'error'); return; }
    let added = 0;
    for (const r of ok) {
      if (!r.data) continue;
      const { error } = await sb.from('invoices').insert([{
        company_id: firmId,
        type: r.data.kind === 'in' ? 'received_invoice' : 'invoice',
        number: r.data.number || 'AI-' + Date.now(),
        issue_date: r.data.date || new Date().toISOString().slice(0, 10),
        due_date: r.data.date || new Date().toISOString().slice(0, 10),
        customer_name: r.data.kind === 'out' ? r.data.partnerName : null,
        customer_ico: r.data.kind === 'out' ? r.data.partnerIco : null,
        customer_ic_dph: r.data.kind === 'out' ? r.data.partnerIcDph : null,
        supplier_name: r.data.kind === 'in' ? r.data.partnerName : null,
        supplier_ico: r.data.kind === 'in' ? r.data.partnerIco : null,
        supplier_ic_dph: r.data.kind === 'in' ? r.data.partnerIcDph : null,
        subtotal: r.data.subtotal,
        vat_amount: r.data.vatAmount,
        total: r.data.total,
        paid_amount: 0,
        status: 'issued',
        created_by: user.id,
      }]);
      if (!error) added++;
    }
    toast(`${added} faktúr uložených`, 'success');
    setResults([]);
    setFiles([]);
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <PageHeader title="AI Vision import" subtitle="Foto / PDF faktúry → Claude Sonnet → automaticky extrahované údaje" />

      <Card className="mb-4">
        <CardHeader title="Anthropic API kľúč" subtitle="Uloží sa lokálne v prehliadači" />
        <div className="p-5">
          <Field label="API kľúč (sk-ant-...)">
            <Input type="password" value={apiKey} onChange={(e) => saveKey(e.target.value)} placeholder="sk-ant-api03-..." />
          </Field>
        </div>
      </Card>

      <Card className="mb-4">
        <CardHeader title="Pretiahni faktúry" subtitle="PDF, JPG, PNG, WebP — multi-select" />
        <div className="p-5">
          <label
            className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 hover:border-zinc-500 rounded-xl p-10 cursor-pointer transition"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const dropped = Array.from(e.dataTransfer.files);
              setFiles((f) => [...f, ...dropped]);
            }}
          >
            <Upload size={32} className="text-zinc-400 mb-3" />
            <div className="text-sm font-semibold text-zinc-700">Klikni alebo pretiahni súbory</div>
            <div className="text-xs text-zinc-500 mt-1">PDF · JPG · PNG · WebP (~$0.01/súbor cez Claude Vision)</div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf"
              className="hidden"
              onChange={(e) => setFiles((f) => [...f, ...Array.from(e.target.files || [])])}
            />
          </label>

          {files.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <FileText size={14} className="text-zinc-400" />
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-xs text-zinc-500">{(f.size / 1024).toFixed(0)} kB</span>
                  <button onClick={() => setFiles((arr) => arr.filter((_, j) => j !== i))} className="text-red-500 hover:bg-red-50 p-1 rounded">×</button>
                </div>
              ))}
              <div className="flex gap-2 mt-3">
                <Button variant="primary" onClick={processFiles} disabled={processing || !apiKey}>
                  <Sparkles size={14} /> {processing ? 'Spracovávam…' : `Extrahovať (${files.length})`}
                </Button>
                <Button variant="ghost" onClick={() => setFiles([])}>Vymazať zoznam</Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader
            title="Výsledky extrakcie"
            action={results.some((r) => r.data) && <Button variant="primary" onClick={applyToCloud}>Uložiť všetky</Button>}
          />
          <div className="divide-y divide-zinc-100">
            {results.map((r, i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  {r.data ? <Check size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-red-500" />}
                  <span className="font-medium text-sm">{r.file}</span>
                  {r.data && <Badge variant={r.data.kind === 'in' ? 'amber' : 'blue'}>{r.data.kind === 'in' ? 'Prijatá' : 'Vydaná'}</Badge>}
                </div>
                {r.data ? (
                  <div className="grid grid-cols-4 gap-3 text-xs text-zinc-600">
                    <div><div className="text-zinc-400 uppercase tracking-wider text-[10px]">Číslo</div><div className="font-mono">{r.data.number}</div></div>
                    <div><div className="text-zinc-400 uppercase tracking-wider text-[10px]">Dátum</div><div className="font-mono">{r.data.date}</div></div>
                    <div><div className="text-zinc-400 uppercase tracking-wider text-[10px]">Partner</div><div className="font-medium truncate">{r.data.partnerName}</div></div>
                    <div><div className="text-zinc-400 uppercase tracking-wider text-[10px]">Suma</div><div className="font-mono font-semibold">{fmtEur(r.data.total)}</div></div>
                  </div>
                ) : (
                  <div className="text-xs text-red-600">{r.error}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(',')[1]);
    r.onerror = () => reject(new Error('FileReader fail'));
    r.readAsDataURL(blob);
  });
}
