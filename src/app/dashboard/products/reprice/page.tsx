'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { PageHeader, Card, Field, Input, Select, Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { fmtEur } from '@/lib/utils';

type P = { id: string; name: string; sku: string | null; selling_price: number; purchase_price: number | null; category: string | null };

export default function RepricePage() {
  const router = useRouter();
  const toast = useToast();
  const [products, setProducts] = useState<P[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<'pct' | 'eur' | 'margin'>('pct');
  const [value, setValue] = useState(10);
  const [filterCat, setFilterCat] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('products').select('id, name, sku, selling_price, purchase_price, category').is('deleted_at', null).order('name').limit(500);
      setProducts((data as P[]) || []);
    })();
  }, []);

  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[];
  const filtered = filterCat ? products.filter((p) => p.category === filterCat) : products;

  function computeNewPrice(p: P): number {
    const cur = Number(p.selling_price || 0);
    if (mode === 'pct') return +(cur * (1 + value / 100)).toFixed(2);
    if (mode === 'eur') return +(cur + value).toFixed(2);
    // margin: set selling = purchase * (1 + value/100)
    const buy = Number(p.purchase_price || 0);
    if (buy <= 0) return cur;
    return +(buy * (1 + value / 100)).toFixed(2);
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }
  function selectAll() {
    setSelected(new Set(filtered.map((p) => p.id)));
  }

  async function apply() {
    if (selected.size === 0) { toast('Označ produkty', 'error'); return; }
    if (!confirm(`Zmeniť cenu pre ${selected.size} produktov?`)) return;
    setSaving(true);
    const sb = createClient();
    let ok = 0;
    for (const p of products) {
      if (!selected.has(p.id)) continue;
      const newPrice = computeNewPrice(p);
      const { error } = await sb.from('products').update({ selling_price: newPrice, updated_at: new Date().toISOString() }).eq('id', p.id);
      if (!error) ok++;
    }
    setSaving(false);
    toast(`${ok} / ${selected.size} produktov preceneno`, ok === selected.size ? 'success' : 'error');
    router.push('/dashboard/products');
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <Link href="/dashboard/products" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-3">
        <ArrowLeft size={14} /> Späť
      </Link>
      <PageHeader title="Hromadné preceňovanie" subtitle="Označ produkty a aplikuj pravidlo na všetky naraz" />

      <Card className="mb-4">
        <div className="p-5 grid sm:grid-cols-3 gap-3 items-end">
          <Field label="Spôsob">
            <Select value={mode} onChange={(e) => setMode(e.target.value as 'pct' | 'eur' | 'margin')}>
              <option value="pct">Zmena o %</option>
              <option value="eur">Zmena o €</option>
              <option value="margin">Nastav maržu z nákupnej</option>
            </Select>
          </Field>
          <Field label={mode === 'pct' ? 'Percento (napr. 10 = +10 %)' : mode === 'eur' ? 'Suma v € (môže byť záporná)' : 'Marža v % nad nákupnú'}>
            <Input type="number" step="0.01" value={value} onChange={(e) => setValue(Number(e.target.value))} />
          </Field>
          <Field label="Filtrovať kategória">
            <Select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
              <option value="">— všetky —</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
          <div className="text-sm font-semibold">{filtered.length} produktov · {selected.size} označených</div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={selectAll}>Označiť všetky</Button>
            <Button variant="ghost" onClick={() => setSelected(new Set())}><RotateCcw size={14} /> Reset</Button>
            <Button variant="primary" onClick={apply} disabled={saving || selected.size === 0}>
              {saving ? 'Ukladám…' : `Aplikovať (${selected.size})`}
            </Button>
          </div>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 sticky top-0">
              <tr className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                <th className="text-center px-3 py-3 w-8"></th>
                <th className="text-left px-3 py-3">Názov</th>
                <th className="text-left px-3 py-3">SKU</th>
                <th className="text-right px-3 py-3">Súčasná</th>
                <th className="text-right px-3 py-3">Nová</th>
                <th className="text-right px-3 py-3">Zmena</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((p) => {
                const newP = computeNewPrice(p);
                const diff = newP - Number(p.selling_price || 0);
                return (
                  <tr key={p.id} className={selected.has(p.id) ? 'bg-zinc-50/50' : ''}>
                    <td className="text-center px-3 py-2"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} /></td>
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p.sku || '—'}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtEur(Number(p.selling_price || 0))}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">{fmtEur(newP)}</td>
                    <td className={`px-3 py-2 text-right font-mono text-xs ${diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-red-700' : 'text-zinc-400'}`}>
                      {diff > 0 ? '+' : ''}{fmtEur(diff)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
