'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button, Input, Field, Card, CardHeader, PageHeader, Select, Textarea } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

export default function NewProductPage() {
  const router = useRouter();
  const toast = useToast();
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    company_id: '', name: '', sku: '', ean: '', category: '', unit: 'ks',
    vat_rate: 23, purchase_price: 0, selling_price: 0, min_stock: 0, max_stock: 0, is_active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('companies').select('id, name').is('deleted_at', null).order('name');
      setCompanies(data || []);
      if (data?.length) setForm((f) => ({ ...f, company_id: localStorage.getItem('zolo_firm') || data[0].id }));
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) { toast('Názov povinný', 'error'); return; }
    setSaving(true);
    const sb = createClient();
    const { error } = await sb.from('products').insert([form]);
    if (error) { toast(error.message, 'error'); setSaving(false); return; }
    toast('Produkt pridaný', 'success');
    router.push('/dashboard/products');
    router.refresh();
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <Link href="/dashboard/products" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-3"><ArrowLeft size={14} /> Späť</Link>
      <PageHeader title="Nový produkt / služba" subtitle="Pridať položku do cenníka" />

      <form onSubmit={save} className="space-y-4">
        <Card>
          <CardHeader title="Základné údaje" />
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label="Firma"><Select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Kategória"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Tovar / Služby / Materiál" /></Field>
            <Field label="Názov *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="SKU"><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></Field>
            <Field label="EAN / čiarový kód"><Input value={form.ean} onChange={(e) => setForm({ ...form, ean: e.target.value })} /></Field>
            <Field label="MJ"><Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}><option>ks</option><option>kg</option><option>m</option><option>m²</option><option>m³</option><option>l</option><option>hod</option><option>bal</option></Select></Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Ceny & DPH" />
          <div className="p-5 grid grid-cols-3 gap-4">
            <Field label="Nákupná cena (bez DPH)"><Input type="number" step="0.01" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: +e.target.value || 0 })} /></Field>
            <Field label="Predajná cena (bez DPH)"><Input type="number" step="0.01" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: +e.target.value || 0 })} /></Field>
            <Field label="DPH %"><Select value={form.vat_rate} onChange={(e) => setForm({ ...form, vat_rate: +e.target.value })}><option value={23}>23%</option><option value={19}>19%</option><option value={10}>10%</option><option value={0}>0% (EU/oslobodené)</option></Select></Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Sklad" />
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label="Min. zásoba"><Input type="number" step="0.01" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: +e.target.value || 0 })} /></Field>
            <Field label="Max. zásoba"><Input type="number" step="0.01" value={form.max_stock} onChange={(e) => setForm({ ...form, max_stock: +e.target.value || 0 })} /></Field>
          </div>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Ukladám…' : 'Pridať položku'}</Button>
          <Link href="/dashboard/products"><Button type="button" variant="ghost">Zrušiť</Button></Link>
        </div>
      </form>
    </div>
  );
}
