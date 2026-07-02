'use client';

import { useState, useRef } from 'react';
import { PageHeader, Card, CardHeader, Button, Field, Select } from '@/components/ui';
import { Upload, FileText, ArrowRight, Check, Download } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabase/client';

type Entity = 'contacts' | 'invoices' | 'products';

const FIELDS: Record<Entity, { key: string; label: string; required?: boolean }[]> = {
  contacts: [
    { key: 'name', label: 'Názov', required: true },
    { key: 'ico', label: 'IČO' },
    { key: 'dic', label: 'DIČ' },
    { key: 'ic_dph', label: 'IČ DPH' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Telefón' },
    { key: 'street', label: 'Ulica' },
    { key: 'city', label: 'Mesto' },
    { key: 'zip', label: 'PSČ' },
    { key: 'country', label: 'Krajina' },
  ],
  products: [
    { key: 'name', label: 'Názov', required: true },
    { key: 'sku', label: 'SKU/Kód' },
    { key: 'ean', label: 'EAN' },
    { key: 'unit', label: 'MJ' },
    { key: 'vat_rate', label: 'DPH %' },
    { key: 'purchase_price', label: 'Nákupná cena' },
    { key: 'selling_price', label: 'Predajná cena' },
    { key: 'category', label: 'Kategória' },
  ],
  invoices: [
    { key: 'number', label: 'Číslo', required: true },
    { key: 'customer_name', label: 'Zákazník', required: true },
    { key: 'customer_ico', label: 'IČO zákazníka' },
    { key: 'customer_ic_dph', label: 'IČ DPH zákazníka' },
    { key: 'issue_date', label: 'Dátum vystavenia', required: true },
    { key: 'due_date', label: 'Dátum splatnosti' },
    { key: 'delivery_date', label: 'DZP' },
    { key: 'subtotal', label: 'Základ' },
    { key: 'vat_amount', label: 'DPH' },
    { key: 'total', label: 'Suma spolu', required: true },
    { key: 'currency', label: 'Mena' },
    { key: 'notes', label: 'Poznámka' },
  ],
};

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  // Simple CSV parser — supports , or ; delimiter, quoted values
  const firstLine = text.split('\n')[0];
  const delim = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const parse = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
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
  const headers = parse(lines[0]);
  const rows = lines.slice(1).map(parse);
  return { headers, rows };
}

export default function CsvImportPage() {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [entity, setEntity] = useState<Entity>('contacts');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [imported, setImported] = useState(0);

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { headers, rows } = parseCsv(String(reader.result));
        setHeaders(headers);
        setRows(rows);
        // Auto-mapping — pokús sa nájsť súvis medzi hlavičkou CSV a ZOLO fieldmi
        const auto: Record<string, string> = {};
        for (const f of FIELDS[entity]) {
          const match = headers.find((h) => {
            const n = h.toLowerCase().replace(/\s|_/g, '');
            return n === f.key || n.includes(f.key) || n.includes(f.label.toLowerCase());
          });
          if (match) auto[f.key] = match;
        }
        setMapping(auto);
        setStep('mapping');
      } catch (e) {
        toast('Chyba parsovania CSV: ' + (e as Error).message, 'error');
      }
    };
    reader.readAsText(file);
  }

  async function importNow() {
    setBusy(true);
    const sb = createClient();
    const firmId = localStorage.getItem('zolo_firm');
    const { data: { user } } = await sb.auth.getUser();
    if (!firmId || !user) { toast('Vyber firmu v sidebar', 'error'); setBusy(false); return; }

    const headerIndex: Record<string, number> = {};
    headers.forEach((h, i) => { headerIndex[h] = i; });

    let inserted = 0;
    let failed = 0;

    for (const row of rows) {
      const record: Record<string, string | number | null> = { company_id: firmId, created_by: user.id };
      for (const f of FIELDS[entity]) {
        const csvCol = mapping[f.key];
        if (!csvCol) continue;
        const idx = headerIndex[csvCol];
        if (idx === undefined) continue;
        let val: string | number | null = row[idx]?.trim() ?? null;
        if (val === '' || val === undefined) val = null;
        // Numeric parse
        if (['vat_rate', 'purchase_price', 'selling_price', 'subtotal', 'vat_amount', 'total'].includes(f.key) && val !== null) {
          const n = Number(String(val).replace(',', '.').replace(/\s/g, ''));
          val = Number.isFinite(n) ? n : null;
        }
        record[f.key] = val;
      }
      // Required-field check
      const missing = FIELDS[entity].filter((f) => f.required && !record[f.key]);
      if (missing.length > 0) { failed++; continue; }

      // Add entity-specific defaults
      if (entity === 'contacts') {
        (record as Record<string, unknown>).type = 'customer';
      } else if (entity === 'products') {
        (record as Record<string, unknown>).is_active = true;
        (record as Record<string, unknown>).unit = record.unit || 'ks';
        (record as Record<string, unknown>).vat_rate = record.vat_rate ?? 23;
      } else if (entity === 'invoices') {
        (record as Record<string, unknown>).type = 'invoice';
        (record as Record<string, unknown>).status = 'issued';
        (record as Record<string, unknown>).currency = record.currency || 'EUR';
        (record as Record<string, unknown>).paid_amount = 0;
      }

      const { error } = await sb.from(entity).insert(record);
      if (error) { failed++; } else { inserted++; }
      setImported(inserted);
    }

    setBusy(false);
    toast(`${inserted} importovaných · ${failed} zlyhaní`, failed === 0 ? 'success' : 'error');
    setStep('upload');
    setHeaders([]);
    setRows([]);
    setMapping({});
    setImported(0);
  }

  function downloadTemplate() {
    const cols = FIELDS[entity].map((f) => f.label).join(';');
    const blob = new Blob([cols + '\n'], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zolo-${entity}-sablona.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <PageHeader
        title="CSV import"
        subtitle="Import zákazníkov, produktov alebo faktúr z KROS, Omega alebo Excelu"
        actions={<Button variant="secondary" onClick={downloadTemplate}><Download size={14} /> Šablóna CSV</Button>}
      />

      {/* Progress rail */}
      <div className="flex items-center gap-2 mb-6 px-1">
        {(['upload', 'mapping', 'preview'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                s === step ? 'bg-zinc-900 text-white' : (['upload', 'mapping', 'preview'] as const).indexOf(step) > i ? 'bg-zinc-200 text-zinc-500' : 'bg-transparent border border-zinc-200 text-zinc-300'
              }`}>{i + 1}</div>
              <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] hidden sm:inline ${s === step ? 'text-zinc-900' : 'text-zinc-400'}`}>
                {s === 'upload' ? 'Nahrať' : s === 'mapping' ? 'Priradiť' : 'Náhľad'}
              </span>
            </div>
            {i < 2 && <div className="flex-1 h-px bg-zinc-200" />}
          </div>
        ))}
      </div>

      {step === 'upload' && (
        <Card>
          <div className="p-8">
            <Field label="Čo importuješ?">
              <Select value={entity} onChange={(e) => setEntity(e.target.value as Entity)}>
                <option value="contacts">Zákazníci</option>
                <option value="products">Produkty / Cenník</option>
                <option value="invoices">Faktúry</option>
              </Select>
            </Field>

            <label
              className="mt-6 flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 hover:border-zinc-500 rounded-xl p-10 cursor-pointer transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
            >
              <Upload size={32} className="text-zinc-400 mb-3" />
              <div className="text-sm font-semibold text-zinc-700">Klikni alebo pretiahni CSV</div>
              <div className="text-xs text-zinc-500 mt-1">UTF-8, oddeľovač , alebo ; · prvá riadka = hlavičky</div>
              <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
            </label>

            <div className="mt-4 text-[12px] text-zinc-500 text-center">
              Nemáš CSV? <button onClick={downloadTemplate} className="text-zinc-900 hover:underline">Stiahni šablónu</button> a vyplň v Exceli.
            </div>
          </div>
        </Card>
      )}

      {step === 'mapping' && (
        <>
          <Card className="mb-4">
            <CardHeader title="Priraď stĺpce" subtitle={`CSV má ${headers.length} stĺpcov · ${rows.length} riadkov`} />
            <div className="p-5 space-y-2">
              {FIELDS[entity].map((f) => (
                <div key={f.key} className="grid grid-cols-2 gap-3 items-center">
                  <div className="text-[13px] text-zinc-700">
                    {f.label}
                    {f.required && <span className="text-red-500 ml-1">*</span>}
                  </div>
                  <Select value={mapping[f.key] || ''} onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}>
                    <option value="">— nepriraď —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </Select>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep('upload')}>Späť</Button>
            <Button variant="primary" onClick={() => setStep('preview')}>
              Náhľad <ArrowRight size={14} />
            </Button>
          </div>
        </>
      )}

      {step === 'preview' && (
        <>
          <Card className="mb-4">
            <CardHeader title="Náhľad prvých 5 riadkov" subtitle={`Spolu ${rows.length} riadkov na import`} />
            <div className="overflow-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                    {FIELDS[entity].filter((f) => mapping[f.key]).map((f) => (
                      <th key={f.key} className="text-left px-3 py-2">{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rows.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {FIELDS[entity].filter((f) => mapping[f.key]).map((f) => {
                        const csvCol = mapping[f.key];
                        const idx = headers.indexOf(csvCol);
                        return <td key={f.key} className="px-3 py-2 text-zinc-700 font-mono truncate max-w-[200px]">{row[idx] || '—'}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {imported > 0 && busy && (
            <Card className="mb-4 border-emerald-200 bg-emerald-50/30">
              <div className="p-4 text-sm text-emerald-800">
                <Check size={16} className="inline mr-2" /> Importovaných: <strong>{imported}</strong> / {rows.length}…
              </div>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep('mapping')} disabled={busy}>Späť</Button>
            <Button variant="primary" onClick={importNow} disabled={busy}>
              <FileText size={14} /> {busy ? 'Importujem…' : `Importovať ${rows.length} riadkov`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
