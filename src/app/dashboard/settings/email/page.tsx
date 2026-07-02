'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, Card, CardHeader, Button, Input, Field, Select, Badge } from '@/components/ui';
import { ArrowLeft, Save, Plus } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

type Template = {
  id?: string;
  company_id: string;
  template_type: string;
  subject: string;
  body_html: string;
  is_default: boolean;
};

const TYPES = [
  { key: 'invoice_new', label: 'Nová faktúra' },
  { key: 'invoice_reminder', label: 'Upomienka' },
  { key: 'invoice_overdue', label: 'Po splatnosti' },
  { key: 'invoice_paid', label: 'Potvrdenie platby' },
  { key: 'invoice_quote', label: 'Cenová ponuka' },
];

export default function EmailTemplatesPage() {
  const toast = useToast();
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [firmId, setFirmId] = useState('');
  const [type, setType] = useState('invoice_new');
  const [template, setTemplate] = useState<Template | null>(null);

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
      const { data } = await sb.from('email_templates').select('*').eq('company_id', firmId).eq('template_type', type).maybeSingle();
      if (data) {
        setTemplate(data);
      } else {
        setTemplate({
          company_id: firmId,
          template_type: type,
          subject: defaultSubject(type),
          body_html: defaultBody(type),
          is_default: true,
        });
      }
    })();
  }, [firmId, type]);

  async function save() {
    if (!template) return;
    const sb = createClient();
    if (template.id) {
      const { error } = await sb.from('email_templates').update({
        subject: template.subject,
        body_html: template.body_html,
        is_default: template.is_default,
      }).eq('id', template.id);
      if (error) { toast(error.message, 'error'); return; }
    } else {
      const { error } = await sb.from('email_templates').insert([template]);
      if (error) { toast(error.message, 'error'); return; }
    }
    toast('Šablóna uložená', 'success');
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <PageHeader back={{ href: "/dashboard/settings" }} title="Email šablóny" subtitle="Texty emailov pre faktúry, upomienky, potvrdenia" />

      <Card className="mb-4">
        <div className="p-5 grid grid-cols-2 gap-4">
          <Field label="Firma">
            <Select value={firmId} onChange={(e) => setFirmId(e.target.value)}>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Typ šablóny">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      {template && (
        <Card>
          <CardHeader
            title={TYPES.find((t) => t.key === type)?.label || 'Šablóna'}
            action={template.id ? <Badge variant="green">Vlastná</Badge> : <Badge variant="gray">Predvolená</Badge>}
          />
          <div className="p-5 space-y-4">
            <Field label="Predmet emailu" hint="Premenné: {invoice_number}, {customer_name}, {amount}, {company_name}, {due_date}">
              <Input value={template.subject} onChange={(e) => setTemplate({ ...template, subject: e.target.value })} />
            </Field>
            <Field label="Telo emailu (HTML)" hint="HTML s premennými v zložených zátvorkách">
              <textarea
                value={template.body_html}
                onChange={(e) => setTemplate({ ...template, body_html: e.target.value })}
                rows={12}
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-zinc-900"
              />
            </Field>
            <div className="flex gap-2">
              <Button variant="primary" onClick={save}><Save size={14} /> Uložiť šablónu</Button>
              <Button variant="ghost" onClick={() => {
                setTemplate({ ...template, subject: defaultSubject(type), body_html: defaultBody(type) });
              }}>Reset na predvolenú</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function defaultSubject(type: string): string {
  return ({
    invoice_new: 'Faktúra {invoice_number} od {company_name}',
    invoice_reminder: 'Pripomenutie: Faktúra {invoice_number} sa blíži k splatnosti',
    invoice_overdue: 'Upomienka: Faktúra {invoice_number} je po splatnosti',
    invoice_paid: 'Potvrdenie platby pre faktúru {invoice_number}',
    invoice_quote: 'Cenová ponuka {invoice_number}',
  })[type] || 'Email';
}

function defaultBody(type: string): string {
  if (type === 'invoice_new') return `<p>Dobrý deň {customer_name},</p>
<p>posielame Vám faktúru <strong>{invoice_number}</strong> na sumu <strong>{amount}</strong>.</p>
<p>Splatnosť: <strong>{due_date}</strong></p>
<p>S pozdravom<br>{company_name}</p>`;
  if (type === 'invoice_reminder') return `<p>Dobrý deň {customer_name},</p>
<p>pripomíname Vám faktúru <strong>{invoice_number}</strong> v sume <strong>{amount}</strong>, ktorá je splatná <strong>{due_date}</strong>.</p>
<p>S pozdravom<br>{company_name}</p>`;
  if (type === 'invoice_overdue') return `<p>Dobrý deň {customer_name},</p>
<p>upozorňujeme, že faktúra <strong>{invoice_number}</strong> v sume <strong>{amount}</strong> je po splatnosti.</p>
<p>Prosíme o úhradu v najbližšom termíne.</p>
<p>S pozdravom<br>{company_name}</p>`;
  if (type === 'invoice_paid') return `<p>Dobrý deň {customer_name},</p>
<p>ďakujeme za úhradu faktúry <strong>{invoice_number}</strong> v sume <strong>{amount}</strong>.</p>
<p>S pozdravom<br>{company_name}</p>`;
  return '<p>Dobrý deň,</p><p>...</p><p>S pozdravom</p>';
}
