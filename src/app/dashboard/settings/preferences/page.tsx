'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, Card, CardHeader, Button, Field, Select } from '@/components/ui';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

type Prefs = {
  language: string;
  timezone: string;
  date_format: string;
  number_format: string;
  default_currency: string;
  theme: string;
  email_notifications: boolean;
};

const DEFAULTS: Prefs = {
  language: 'sk',
  timezone: 'Europe/Bratislava',
  date_format: 'DD.MM.YYYY',
  number_format: '1 234,56',
  default_currency: 'EUR',
  theme: 'system',
  email_notifications: true,
};

export default function PreferencesPage() {
  const toast = useToast();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const { data } = await sb.from('user_settings').select('*').eq('user_id', user.id).maybeSingle();
      if (data) setPrefs({ ...DEFAULTS, ...data });
    })();
  }, []);

  async function save() {
    setSaving(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await sb.from('user_settings').upsert({ user_id: user.id, ...prefs }, { onConflict: 'user_id' });
    if (error) { toast(error.message, 'error'); setSaving(false); return; }
    if (typeof window !== 'undefined') localStorage.setItem('zolo_locale', prefs.language);
    toast('Nastavenia uložené', 'success');
    setSaving(false);
  }

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/dashboard/settings" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-3">
        <ArrowLeft size={14} /> Späť na nastavenia
      </Link>
      <PageHeader title="Preferencie účtu" subtitle="Jazyk, časové zóna, formát čísla" />

      <Card>
        <CardHeader title="Lokalizácia & formátovanie" />
        <div className="p-5 grid grid-cols-2 gap-4">
          <Field label="Jazyk">
            <Select value={prefs.language} onChange={(e) => setPrefs({ ...prefs, language: e.target.value })}>
              <option value="sk">Slovenčina</option>
              <option value="cs">Čeština</option>
              <option value="en">English</option>
            </Select>
          </Field>
          <Field label="Časové pásmo">
            <Select value={prefs.timezone} onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}>
              <option value="Europe/Bratislava">Europe/Bratislava (UTC+1)</option>
              <option value="Europe/Prague">Europe/Prague (UTC+1)</option>
              <option value="Europe/Berlin">Europe/Berlin (UTC+1)</option>
              <option value="UTC">UTC</option>
            </Select>
          </Field>
          <Field label="Formát dátumu">
            <Select value={prefs.date_format} onChange={(e) => setPrefs({ ...prefs, date_format: e.target.value })}>
              <option value="DD.MM.YYYY">DD.MM.YYYY (SK)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY (EU)</option>
            </Select>
          </Field>
          <Field label="Formát čísla">
            <Select value={prefs.number_format} onChange={(e) => setPrefs({ ...prefs, number_format: e.target.value })}>
              <option value="1 234,56">1 234,56 (SK)</option>
              <option value="1,234.56">1,234.56 (US)</option>
              <option value="1.234,56">1.234,56 (DE)</option>
            </Select>
          </Field>
          <Field label="Predvolená mena">
            <Select value={prefs.default_currency} onChange={(e) => setPrefs({ ...prefs, default_currency: e.target.value })}>
              <option value="EUR">EUR</option>
              <option value="CZK">CZK</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
          <Field label="Téma">
            <Select value={prefs.theme} onChange={(e) => setPrefs({ ...prefs, theme: e.target.value })}>
              <option value="system">Systémová</option>
              <option value="light">Svetlá</option>
              <option value="dark">Tmavá</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader title="Notifikácie" />
        <div className="p-5">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={prefs.email_notifications} onChange={(e) => setPrefs({ ...prefs, email_notifications: e.target.checked })} />
            Posielať mi emailové notifikácie (DPH termíny, faktúry po splatnosti, mzdové termíny)
          </label>
        </div>
      </Card>

      <div className="mt-4 flex gap-2">
        <Button variant="primary" onClick={save} disabled={saving}><Save size={14} /> {saving ? 'Ukladám…' : 'Uložiť'}</Button>
      </div>
    </div>
  );
}
