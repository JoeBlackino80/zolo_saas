'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button, Input, Field, Select } from '@/components/ui';
import { X, Search, UserPlus } from 'lucide-react';
import { useToast } from '@/components/Toast';

export type NewContact = {
  id: string;
  name: string;
  ico: string | null;
  dic: string | null;
  ic_dph: string | null;
  street: string | null;
  city: string | null;
  zip: string | null;
  email: string | null;
};

export default function AddContactModal({
  companyId,
  onClose,
  onCreated,
  initialType = 'customer',
  editContact,
}: {
  companyId: string;
  onClose: () => void;
  onCreated: (contact: NewContact) => void;
  initialType?: 'customer' | 'supplier' | 'both';
  editContact?: { id: string; type?: string; name?: string; ico?: string | null; dic?: string | null; ic_dph?: string | null; street?: string | null; city?: string | null; zip?: string | null; email?: string | null; phone?: string | null };
}) {
  const toast = useToast();
  const isEdit = !!editContact;
  const [form, setForm] = useState({
    type: (editContact?.type as 'customer' | 'supplier' | 'both') || initialType,
    name: editContact?.name || '',
    ico: editContact?.ico || '',
    dic: editContact?.dic || '',
    ic_dph: editContact?.ic_dph || '',
    street: editContact?.street || '',
    city: editContact?.city || '',
    zip: editContact?.zip || '',
    country: 'Slovensko',
    email: editContact?.email || '',
    phone: editContact?.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  async function lookupIco() {
    if (!/^\d{8}$/.test(form.ico)) { toast('IČO musí mať 8 číslic', 'error'); return; }
    setLookingUp(true);
    try {
      const r = await fetch('https://orsr-lookup.joeblackino.workers.dev?ico=' + form.ico);
      if (!r.ok) throw new Error('Worker HTTP ' + r.status);
      const payload = await r.json();
      const data = payload.data || payload;
      if (!data.name) { toast('IČO sa nenašlo', 'error'); return; }
      let street = '', city = '', zip = '';
      if (data.address) {
        const parts = String(data.address).split(',').map((s: string) => s.trim());
        if (parts.length >= 2) {
          street = parts[0];
          const zipMatch = parts[1].match(/(\d{3}\s?\d{2})/);
          zip = zipMatch ? zipMatch[1] : '';
          city = parts[1].replace(/\d{3}\s?\d{2}/, '').replace(/-\s.*/, '').trim();
        } else street = String(data.address);
      }
      // Platca DPH: IČ DPH = SK + DIČ. Ak ORSR vrátil icDph ale nie dic,
      // odvodíme DIČ zo SK-prefixnutého IČ DPH.
      const derivedDic = data.dic || (data.icDph ? String(data.icDph).replace(/^SK/i, '') : '');
      setForm((f) => ({
        ...f,
        name: data.name || f.name,
        dic: derivedDic || f.dic,
        ic_dph: data.icDph || f.ic_dph,
        street: street || f.street,
        city: city || f.city,
        zip: zip || f.zip,
      }));
      if (!derivedDic && !data.icDph) {
        toast('ORSR nevrátil DIČ — doplň ručne ak je klient platca DPH', 'info');
      } else {
        toast('Údaje z ORSR: ' + data.name, 'success');
      }
    } catch (e) { toast((e as Error).message, 'error'); }
    finally { setLookingUp(false); }
  }

  async function save() {
    if (!form.name.trim()) { toast('Názov je povinný', 'error'); return; }
    setSaving(true);
    const sb = createClient();
    let data, error;
    if (isEdit && editContact) {
      ({ data, error } = await sb.from('contacts').update({ ...form }).eq('id', editContact.id).select('id, name, ico, dic, ic_dph, street, city, zip, email').single());
    } else {
      ({ data, error } = await sb.from('contacts').insert([{ ...form, company_id: companyId }]).select('id, name, ico, dic, ic_dph, street, city, zip, email').single());
    }
    if (error || !data) { toast(error?.message || 'Chyba', 'error'); setSaving(false); return; }
    toast(isEdit ? 'Zákazník upravený' : 'Zákazník pridaný', 'success');
    setSaving(false);
    onCreated(data as NewContact);
  }

  return (
    <div
      className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-zinc-100 px-6 py-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <UserPlus size={18} /> {isEdit ? 'Upraviť zákazníka' : 'Nový zákazník'}
            </h2>
            <p className="text-[12px] text-zinc-500 mt-0.5">{isEdit ? 'Uprav údaje a klikni Uložiť' : 'Zadaj IČO — zvyšok sa doplní z ORSR'}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 p-1"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Typ">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'customer' | 'supplier' | 'both' })}>
                <option value="customer">Zákazník (odberateľ)</option>
                <option value="supplier">Dodávateľ</option>
                <option value="both">Oboje</option>
              </Select>
            </Field>
            <Field label="IČO">
              <div className="flex gap-2">
                <Input value={form.ico} onChange={(e) => setForm({ ...form, ico: e.target.value.trim() })} maxLength={8} placeholder="47518309" />
                <Button type="button" variant="secondary" onClick={lookupIco} disabled={lookingUp || form.ico.length !== 8}>
                  <Search size={14} /> {lookingUp ? '…' : 'ORSR'}
                </Button>
              </div>
            </Field>
            <Field label="Názov *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="DIČ"><Input value={form.dic} onChange={(e) => setForm({ ...form, dic: e.target.value.trim() })} /></Field>
            <Field label="IČ DPH"><Input value={form.ic_dph} onChange={(e) => setForm({ ...form, ic_dph: e.target.value.trim() })} placeholder="SK…" /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Telefón"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Ulica"><Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} /></Field>
            <Field label="Mesto"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
            <Field label="PSČ"><Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></Field>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-zinc-100 px-6 py-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Zrušiť</Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? 'Ukladám…' : (isEdit ? 'Uložiť zmeny' : 'Pridať a použiť')}
          </Button>
        </div>
      </div>
    </div>
  );
}
