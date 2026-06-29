'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageHeader, Card, Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';

type Row = { name?: string; sku?: string; unit?: string; vat_rate?: number; selling_price?: number; purchase_price?: number; category?: string; error?: string };

export default function ProductImportPage() {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [importing, setImporting] = useState(false);

  function parseCsv(text: string): Row[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) return [];
    const delim = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].toLowerCase().split(delim).map((h) => h.replace(/"/g, '').trim());
    const find = (...kw: string[]) => headers.findIndex((h) => kw.some((k) => h === k || h.includes(k)));
    const idx = {
      name: find('name', 'názov', 'nazov'),
      sku: find('sku', 'kód', 'kod'),
      unit: find('unit', 'mj', 'jednotka'),
      vat: find('vat', 'dph', 'sadzba'),
      sell: find('selling', 'predajn', 'predaj', 'cena'),
      buy: find('purchase', 'nákupn', 'naku'),
      cat: find('category', 'kategória', 'kategoria'),
    };
    return lines.slice(1).map((l) => {
      const c = l.split(delim).map((x) => x.replace(/^"|"$/g, '').trim());
      const name = idx.name >= 0 ? c[idx.name] : '';
      if (!name) return { error: 'Chýba názov' };
      return {
        name,
        sku: idx.sku >= 0 ? c[idx.sku] : '',
        unit: idx.unit >= 0 ? c[idx.unit] : 'ks',
        vat_rate: idx.vat >= 0 ? Number(c[idx.vat]?.replace(',', '.')) || 23 : 23,
        selling_price: idx.sell >= 0 ? Number(c[idx.sell]?.replace(',', '.')) || 0 : 0,
        purchase_price: idx.buy >= 0 ? Number(c[idx.buy]?.replace(',', '.')) || 0 : 0,
        category: idx.cat >= 0 ? c[idx.cat] : '',
      };
    });
  }

  async function handleFile(file: File) {
    const text = await file.text();
    const parsed = parseCsv(text);
    setRows(parsed);
    toast(`Načítaných ${parsed.filter((r) => !r.error).length} z ${parsed.length} riadkov`, 'success');
  }

  async function doImport() {
    const valid = rows.filter((r) => !r.error && r.name);
    if (valid.length === 0) { toast('Žiadne validné riadky', 'error'); return; }
    setImporting(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setImporting(false); return; }
    const cid = typeof window !== 'undefined' ? localStorage.getItem('zolo_firm') : null;
    if (!cid) { toast('Vyber firmu v sidebare', 'error'); setImporting(false); return; }

    const payload = valid.map((r) => ({
      company_id: cid,
      name: r.name!,
      sku: r.sku || null,
      unit: r.unit || 'ks',
      vat_rate: r.vat_rate || 23,
      selling_price: r.selling_price || 0,
      purchase_price: r.purchase_price || 0,
      category: r.category || null,
      is_active: true,
    }));
    const { error } = await sb.from('products').insert(payload);
    setImporting(false);
    if (error) { toast(error.message, 'error'); return; }
    toast(`${valid.length} produktov importovaných`, 'success');
    router.push('/dashboard/products');
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <Link href="/dashboard/products" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-3">
        <ArrowLeft size={14} /> Späť
      </Link>
      <PageHeader title="Import cenníka z CSV / Excelu" subtitle="Hlavičky: name, sku, unit, vat_rate, selling_price, purchase_price, category (SK ekvivalenty fungujú tiež)" />

      <Card className="mb-4">
        <div className="p-6">
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 hover:border-zinc-400 rounded-xl p-10 cursor-pointer transition">
            <Upload size={32} className="text-zinc-400 mb-3" />
            <div className="text-sm font-semibold text-zinc-700">Klikni alebo pretiahni CSV súbor</div>
            <div className="text-xs text-zinc-500 mt-1">Oddeľovač: čiarka alebo bodkočiarka. Excel exportuj ako CSV.</div>
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>
        </div>
      </Card>

      {rows.length > 0 && (
        <Card>
          <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
            <div className="text-sm font-semibold">Náhľad ({rows.length} riadkov)</div>
            <Button variant="primary" onClick={doImport} disabled={importing}>
              {importing ? 'Importujem…' : `Importovať ${rows.filter((r) => !r.error).length} produktov`}
            </Button>
          </div>
          <div className="overflow-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 sticky top-0">
                <tr className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                  <th className="text-center px-3 py-3 w-8"></th>
                  <th className="text-left px-3 py-3">Názov</th>
                  <th className="text-left px-3 py-3">SKU</th>
                  <th className="text-left px-3 py-3">MJ</th>
                  <th className="text-right px-3 py-3">DPH %</th>
                  <th className="text-right px-3 py-3">Predaj</th>
                  <th className="text-right px-3 py-3">Nákup</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((r, i) => (
                  <tr key={i} className={r.error ? 'bg-red-50' : 'hover:bg-zinc-50'}>
                    <td className="text-center px-3 py-2">
                      {r.error ? <AlertCircle size={14} className="text-red-500" /> : <CheckCircle2 size={14} className="text-emerald-500" />}
                    </td>
                    <td className="px-3 py-2 font-medium">{r.name || <span className="text-red-600 text-xs">{r.error}</span>}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.sku || '—'}</td>
                    <td className="px-3 py-2 text-xs">{r.unit || '—'}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{r.vat_rate}%</td>
                    <td className="px-3 py-2 text-right font-mono">{Number(r.selling_price || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono">{Number(r.purchase_price || 0).toFixed(2)}</td>
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
