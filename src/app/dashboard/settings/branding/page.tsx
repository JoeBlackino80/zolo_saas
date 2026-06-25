'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, Card, CardHeader, Button, Input, Field, Select } from '@/components/ui';
import { ArrowLeft, Upload } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

export default function BrandingPage() {
  const toast = useToast();
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [firmId, setFirmId] = useState('');
  const [form, setForm] = useState({
    logo_url: '',
    primary_color: '#3b82f6',
    accent_color: '#8b5cf6',
    footer_text: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('companies').select('id, name').is('deleted_at', null).order('name');
      setCompanies(data || []);
      const fid = localStorage.getItem('zolo_firm') || data?.[0]?.id || '';
      setFirmId(fid);
    })();
  }, []);

  useEffect(() => {
    if (!firmId) return;
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('company_settings').select('logo_url, primary_color, accent_color, footer_text').eq('company_id', firmId).maybeSingle();
      if (data) setForm({
        logo_url: data.logo_url || '',
        primary_color: data.primary_color || '#3b82f6',
        accent_color: data.accent_color || '#8b5cf6',
        footer_text: data.footer_text || '',
      });
    })();
  }, [firmId]);

  async function uploadLogo(file: File) {
    if (file.size > 200 * 1024) { toast('Logo max 200KB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setForm({ ...form, logo_url: reader.result as string });
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    const sb = createClient();
    const { error } = await sb
      .from('company_settings')
      .upsert({ company_id: firmId, ...form }, { onConflict: 'company_id' });
    if (error) { toast(error.message, 'error'); setSaving(false); return; }
    toast('Branding uložený', 'success');
    setSaving(false);
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <Link href="/dashboard/settings" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-3">
        <ArrowLeft size={14} /> Späť na nastavenia
      </Link>
      <PageHeader title="Branding faktúr" subtitle="Logo · farby · pätička. Per firma." />

      <Card>
        <CardHeader title="Vyber firmu" />
        <div className="p-5">
          <Select value={firmId} onChange={(e) => setFirmId(e.target.value)}>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </Card>

      {firmId && (
        <Card className="mt-4">
          <CardHeader title="Vizuál" />
          <div className="p-5 space-y-4">
            <Field label="Logo (PNG/JPG, max 200KB)">
              <label className="flex items-center gap-3 cursor-pointer">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="logo" className="h-16 border border-slate-200 rounded p-1 bg-white" />
                ) : (
                  <div className="h-16 w-32 border-2 border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400 text-xs">Bez loga</div>
                )}
                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} className="hidden" />
                <Button type="button" variant="secondary"><Upload size={14} /> Nahrať</Button>
              </label>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Hlavná farba">
                <div className="flex gap-2">
                  <input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="w-12 h-10 rounded border border-slate-200" />
                  <Input value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="font-mono" />
                </div>
              </Field>
              <Field label="Akcentová farba">
                <div className="flex gap-2">
                  <input type="color" value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} className="w-12 h-10 rounded border border-slate-200" />
                  <Input value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} className="font-mono" />
                </div>
              </Field>
            </div>
            <Field label="Pätička faktúry">
              <textarea
                value={form.footer_text}
                onChange={(e) => setForm({ ...form, footer_text: e.target.value })}
                rows={3}
                placeholder="napr. Ďakujeme za spoluprácu. Číslo účtu: SK..."
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </Field>
            <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Ukladám…' : 'Uložiť branding'}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
