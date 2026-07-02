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
    primary_color: '#18181b',
    accent_color: '#71717a',
    footer_text: '',
    pdf_template: 'modern' as 'modern' | 'classic' | 'minimal',
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
      const { data } = await sb.from('company_settings').select('logo_url, primary_color, accent_color, footer_text, pdf_template').eq('company_id', firmId).maybeSingle();
      if (data) setForm({
        logo_url: data.logo_url || '',
        primary_color: data.primary_color || '#18181b',
        accent_color: data.accent_color || '#71717a',
        footer_text: data.footer_text || '',
        pdf_template: (data.pdf_template as 'modern' | 'classic' | 'minimal') || 'modern',
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
      <Link href="/dashboard/settings" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-3">
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
                  <img src={form.logo_url} alt="logo" className="h-16 border border-zinc-200 rounded p-1 bg-white" />
                ) : (
                  <div className="h-16 w-32 border-2 border-dashed border-zinc-300 rounded flex items-center justify-center text-zinc-400 text-xs">Bez loga</div>
                )}
                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} className="hidden" />
                <Button type="button" variant="secondary"><Upload size={14} /> Nahrať</Button>
              </label>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Hlavná farba">
                <div className="flex gap-2">
                  <input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="w-12 h-10 rounded border border-zinc-200" />
                  <Input value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="font-mono" />
                </div>
              </Field>
              <Field label="Akcentová farba">
                <div className="flex gap-2">
                  <input type="color" value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} className="w-12 h-10 rounded border border-zinc-200" />
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
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-900"
              />
            </Field>

            <Field label="PDF šablóna">
              <div className="grid grid-cols-3 gap-3">
                {(['modern', 'classic', 'minimal'] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setForm({ ...form, pdf_template: t })}
                    className={`text-left p-3 rounded-xl border-2 transition-colors ${
                      form.pdf_template === t ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <TemplatePreview kind={t} primary={form.primary_color} />
                    <div className="mt-2 text-[13px] font-semibold text-zinc-900 tracking-tight capitalize">{t}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      {t === 'modern' ? 'Bold hlavička, farebný pásik' : t === 'classic' ? 'Tradičný SK layout' : 'Čisté, žiadny dizajn'}
                    </div>
                  </button>
                ))}
              </div>
            </Field>

            <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Ukladám…' : 'Uložiť branding'}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function TemplatePreview({ kind, primary }: { kind: 'modern' | 'classic' | 'minimal'; primary: string }) {
  return (
    <div className="w-full h-24 bg-white border border-zinc-200 rounded-md overflow-hidden">
      {kind === 'modern' && (
        <>
          <div className="h-6 flex items-center justify-between px-2" style={{ backgroundColor: primary }}>
            <div className="w-8 h-1.5 bg-white/70 rounded" />
            <div className="w-6 h-1 bg-white/50 rounded" />
          </div>
          <div className="p-2 space-y-1">
            <div className="w-2/3 h-1 bg-zinc-300 rounded" />
            <div className="w-1/2 h-1 bg-zinc-200 rounded" />
            <div className="w-3/4 h-1 bg-zinc-200 rounded mt-2" />
            <div className="flex justify-end mt-2">
              <div className="w-10 h-2 rounded" style={{ backgroundColor: primary }} />
            </div>
          </div>
        </>
      )}
      {kind === 'classic' && (
        <div className="p-2 h-full flex flex-col">
          <div className="text-center border-b border-zinc-300 pb-1">
            <div className="w-1/3 mx-auto h-1.5 bg-zinc-700 rounded" />
          </div>
          <div className="mt-2 space-y-1">
            <div className="w-1/2 h-1 bg-zinc-300 rounded" />
            <div className="w-2/3 h-1 bg-zinc-200 rounded" />
          </div>
          <div className="mt-auto text-right">
            <div className="w-8 h-1.5 bg-zinc-700 rounded ml-auto" />
          </div>
        </div>
      )}
      {kind === 'minimal' && (
        <div className="p-3 h-full flex flex-col">
          <div className="w-1/3 h-1 bg-zinc-800 rounded" />
          <div className="mt-3 space-y-1.5">
            <div className="w-full h-0.5 bg-zinc-100 rounded" />
            <div className="w-full h-0.5 bg-zinc-100 rounded" />
            <div className="w-full h-0.5 bg-zinc-100 rounded" />
          </div>
          <div className="mt-auto flex justify-between">
            <div className="w-6 h-1 bg-zinc-200 rounded" />
            <div className="w-8 h-1 bg-zinc-800 rounded" />
          </div>
        </div>
      )}
    </div>
  );
}
