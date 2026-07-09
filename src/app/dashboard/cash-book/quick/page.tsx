'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input, Field, Card, PageHeader, Select } from '@/components/ui';
import { ArrowRight } from 'lucide-react';
import { useToast } from '@/components/Toast';

function QuickCashDocInner() {
  const router = useRouter();
  const search = useSearchParams();
  const toast = useToast();
  const initialType = (search.get('type') === 'cash_payout' ? 'cash_payout' : 'cash_receipt') as 'cash_receipt' | 'cash_payout';

  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [firmId, setFirmId] = useState('');
  const [type, setType] = useState<'cash_receipt' | 'cash_payout'>(initialType);
  const [form, setForm] = useState({
    partner: '',
    partnerIco: '',
    amount: 0,
    vatRate: 23,
    purpose: '',
    date: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [peekedNumber, setPeekedNumber] = useState('');

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('companies').select('id, name').is('deleted_at', null).order('name');
      setCompanies(data || []);
      const cid = (typeof window !== 'undefined' && localStorage.getItem('zolo_firm')) || data?.[0]?.id || '';
      setFirmId(cid);
    })();
  }, []);

  useEffect(() => {
    if (!firmId) return;
    (async () => {
      const sb = createClient();
      const { data } = await sb.rpc('peek_next_document_number', { p_company_id: firmId, p_type: type });
      if (typeof data === 'string') setPeekedNumber(data);
    })();
  }, [firmId, type]);

  async function save() {
    if (!form.partner) { toast(type === 'cash_receipt' ? 'Zadaj od koho' : 'Zadaj komu', 'error'); return; }
    if (form.amount <= 0) { toast('Suma musí byť > 0', 'error'); return; }
    if (!form.purpose) { toast('Zadaj účel', 'error'); return; }

    setSaving(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { data: number } = await sb.rpc('assign_document_number', { p_company_id: firmId, p_type: type });
    if (typeof number !== 'string') { toast('Nepodarilo sa priradiť číslo', 'error'); setSaving(false); return; }

    const subtotal = +(form.amount / (1 + form.vatRate / 100)).toFixed(2);
    const vatAmount = +(form.amount - subtotal).toFixed(2);

    const invoice = type === 'cash_receipt' ? {
      company_id: firmId,
      type,
      number,
      customer_name: form.partner,
      customer_ico: form.partnerIco || null,
      issue_date: form.date,
      delivery_date: form.date,
      due_date: form.date,
      subtotal, vat_amount: vatAmount, total: form.amount,
      paid_amount: form.amount, // hotovosť = zaplatené hneď
      status: 'paid',
      currency: 'EUR',
      exchange_rate: 1,
      notes: form.purpose,
      created_by: user.id,
    } : {
      company_id: firmId,
      type,
      number,
      supplier_name: form.partner,
      supplier_ico: form.partnerIco || null,
      issue_date: form.date,
      delivery_date: form.date,
      due_date: form.date,
      subtotal, vat_amount: vatAmount, total: form.amount,
      paid_amount: form.amount,
      status: 'paid',
      currency: 'EUR',
      exchange_rate: 1,
      notes: form.purpose,
      created_by: user.id,
    };

    const { data: inv, error } = await sb.from('invoices').insert(invoice as Record<string, unknown>).select('id').single();
    if (error || !inv) { toast(error?.message || 'Chyba', 'error'); setSaving(false); return; }

    // Auto-JE (batch 56 rozšíril post_invoice_journal pre PPD/VPD)
    await sb.rpc('post_invoice_journal', { p_invoice_id: inv.id, p_event: 'issue' });

    toast(`${type === 'cash_receipt' ? 'PPD' : 'VPD'} ${number} uložený a zaúčtovaný`, 'success');
    router.push(`/dashboard/invoices/${inv.id}`);
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <PageHeader
        back={{ href: '/dashboard/invoices' }}
        title={type === 'cash_receipt' ? 'Príjmový pokladničný doklad' : 'Výdavkový pokladničný doklad'}
        subtitle="Rýchly formulár pre hotovostné platby — 4 polia"
      />

      <Card>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Firma">
              <Select value={firmId} onChange={(e) => setFirmId(e.target.value)}>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Typ">
              <Select value={type} onChange={(e) => setType(e.target.value as 'cash_receipt' | 'cash_payout')}>
                <option value="cash_receipt">Príjmový PPD (prijímame)</option>
                <option value="cash_payout">Výdavkový VPD (vydávame)</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label={`Číslo ${type === 'cash_receipt' ? 'PPD' : 'VPD'}`}>
              <Input value={peekedNumber} disabled />
            </Field>
            <Field label="Dátum">
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
          </div>

          <Field label={type === 'cash_receipt' ? 'Od koho (názov/meno)' : 'Komu (názov/meno)'}>
            <Input value={form.partner} onChange={(e) => setForm({ ...form, partner: e.target.value })} placeholder="napr. Ján Novák" />
          </Field>

          <Field label="IČO (voliteľné)">
            <Input value={form.partnerIco} onChange={(e) => setForm({ ...form, partnerIco: e.target.value })} maxLength={8} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Suma (€) — vrátane DPH">
              <Input
                type="text"
                inputMode="decimal"
                value={form.amount === 0 ? '' : String(form.amount)}
                onChange={(e) => {
                  const raw = e.target.value.replace(',', '.').replace(/[^\d.]/g, '');
                  setForm({ ...form, amount: raw === '' ? 0 : parseFloat(raw) || 0 });
                }}
                placeholder="0.00"
              />
            </Field>
            <Field label="DPH sadzba">
              <Select value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: +e.target.value })}>
                <option value={23}>23%</option>
                <option value={19}>19%</option>
                <option value={10}>10%</option>
                <option value={0}>0% (bez DPH)</option>
              </Select>
            </Field>
          </div>

          <Field label="Účel platby">
            <Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="napr. Tržba za tovar / Kávové zásoby" />
          </Field>

          <div className="pt-2 flex gap-2">
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving ? 'Ukladám…' : `Vystaviť a zaúčtovať`} <ArrowRight size={14} />
            </Button>
            <Button variant="ghost" onClick={() => router.push('/dashboard/invoices/new?type=' + type)}>
              Rozšírený formulár
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-4 text-[12px] text-zinc-500 leading-relaxed">
        Zjednodušený formulár — 4 polia. Doklad sa automaticky zaúčtuje: <strong>PPD:</strong> MD 211 / D 602 (+34302 DPH) · <strong>VPD:</strong> MD 518 (+34301 DPH) / D 211. Ak potrebuješ položkovú faktúru (viac produktov), použi rozšírený formulár.
      </div>
    </div>
  );
}

export default function QuickCashDocPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-500 text-sm">Načítavam…</div>}>
      <QuickCashDocInner />
    </Suspense>
  );
}
