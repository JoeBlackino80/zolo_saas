'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input, Field, Card, CardHeader, PageHeader, Select } from '@/components/ui';
import { ArrowLeft, Plus, Trash2, RotateCcw, UserPlus, Search, Package } from 'lucide-react';
import Link from 'next/link';
import { fmtEur } from '@/lib/utils';
import AddContactModal, { type NewContact } from '@/components/AddContactModal';
import ProductPickerModal, { type PickedProduct } from '@/components/ProductPickerModal';

type Item = {
  product_id?: string | null;
  product_sku?: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
};

type Company = { id: string; name: string };
type Contact = { id: string; name: string; ico: string | null; dic: string | null; ic_dph: string | null; street: string | null; city: string | null; zip: string | null; email: string | null };

const DUE_PRESETS = [0, 3, 7, 14, 30, 60];

function addDays(base: string, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const DRAFT_KEY = 'zolo_draft_invoice_v1';

export default function NewInvoicePage() {
  const router = useRouter();
  const search = useSearchParams();
  const cloneFromId = search.get('from');
  const presetType = search.get('type');
  const newContactId = search.get('new_contact_id');
  const [draftAvailable, setDraftAvailable] = useState<{ form: unknown; items: unknown } | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState({
    company_id: '',
    type: presetType || 'invoice',
    number: '',
    contact_id: null as string | null,
    customer_name: '',
    customer_ico: '',
    customer_ic_dph: '',
    customer_email: '',
    reminders_enabled: true,
    issue_date: new Date().toISOString().slice(0, 10),
    delivery_date: new Date().toISOString().slice(0, 10),
    due_date: (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10); })(),
    currency: 'EUR',
    notes: '',
    parent_invoice_id: search.get('parent') || null as string | null,
  });
  const [items, setItems] = useState<Item[]>([{ description: '', quantity: 1, unit: 'ks', unit_price: 0, vat_rate: 23 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoNumber, setAutoNumber] = useState(true); // true = use peeked, false = user typed their own
  const [peekedNumber, setPeekedNumber] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactQuery, setContactQuery] = useState('');
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [productPickerRow, setProductPickerRow] = useState<number | null>(null);

  // Fetch contacts when company changes
  useEffect(() => {
    if (!form.company_id) return;
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('contacts')
        .select('id, name, ico, dic, ic_dph, street, city, zip, email')
        .eq('company_id', form.company_id)
        .in('type', ['customer', 'both'])
        .is('deleted_at', null)
        .order('name')
        .limit(500);
      setContacts((data as Contact[]) || []);
    })();
  }, [form.company_id]);

  const filteredContacts = contactQuery.trim()
    ? contacts.filter((c) => {
        const q = contactQuery.toLowerCase();
        return c.name.toLowerCase().includes(q) || (c.ico || '').includes(q) || (c.ic_dph || '').toLowerCase().includes(q);
      }).slice(0, 8)
    : contacts.slice(0, 8);

  function pickContact(c: Contact) {
    setForm((f) => ({
      ...f,
      contact_id: c.id,
      customer_name: c.name,
      customer_ico: c.ico || '',
      customer_ic_dph: c.ic_dph || '',
      customer_email: c.email || f.customer_email,
    }));
    setContactQuery(c.name);
    setShowContactDropdown(false);
  }

  // Fetch next number from RPC for current company + type
  const peekNumber = useCallback(async (company_id: string, type: string) => {
    if (!company_id) return;
    const sb = createClient();
    const { data } = await sb.rpc('peek_next_document_number', { p_company_id: company_id, p_type: type });
    if (typeof data === 'string') {
      setPeekedNumber(data);
      setForm((f) => (f.number === '' || autoNumber ? { ...f, number: data } : f));
    }
  }, [autoNumber]);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('companies').select('id, name').is('deleted_at', null).order('name');
      setCompanies(data || []);
      const firmFromStorage = typeof window !== 'undefined' ? localStorage.getItem('zolo_firm') : '';
      const cid = firmFromStorage && data?.some((c) => c.id === firmFromStorage) ? firmFromStorage : (data?.[0]?.id ?? '');
      if (cid) {
        // Optionally clone from existing invoice
        if (cloneFromId) {
          const { data: parent } = await sb.from('invoices').select('*, invoice_items(*)').eq('id', cloneFromId).single();
          if (parent) {
            const signFlip = presetType === 'credit_note' || presetType === 'storno' ? -1 : 1;
            setForm((f) => ({
              ...f,
              company_id: parent.company_id || cid,
              type: presetType || f.type,
              customer_name: parent.customer_name || '',
              customer_ico: parent.customer_ico || '',
              customer_ic_dph: parent.customer_ic_dph || '',
              currency: parent.currency || 'EUR',
              customer_email: parent.customer_email || f.customer_email,
              notes: presetType === 'credit_note' ? `Dobropis k ${parent.number}`
                : presetType === 'storno' ? `Storno ${parent.number}`
                : presetType === 'proforma' ? `Zálohová k ${parent.number}`
                : (parent.type === 'proforma' && presetType === 'invoice' && Number(parent.paid_amount || 0) > 0)
                  ? `Vystavené na základe ZF ${parent.number}. Odpočítaná záloha: ${Number(parent.paid_amount).toFixed(2)} €`
                  : parent.notes || f.notes,
              // parent_invoice_id only when this is a derivative doc, NOT plain duplicate
              parent_invoice_id: search.get('parent') ? parent.id : null,
            }));
            if (Array.isArray(parent.invoice_items) && parent.invoice_items.length) {
              const clonedItems: Item[] = parent.invoice_items.map((it: { description: string; quantity: number; unit: string; unit_price: number; vat_rate: number }) => ({
                description: it.description,
                quantity: it.quantity * signFlip,
                unit: it.unit,
                unit_price: it.unit_price,
                vat_rate: it.vat_rate,
              }));

              // ZF → FA: pridaj "Odpočet zálohy" ako mínusový riadok ak
              // zálohovka bola aspoň čiastočne uhradená.
              const isProformaToInvoice = parent.type === 'proforma' && presetType === 'invoice';
              const advancePaid = Number(parent.paid_amount || 0);
              if (isProformaToInvoice && advancePaid > 0) {
                // Zvoľ dominantnú VAT rate z originálnych položiek pre správne
                // rozdelenie základu a DPH pri odpočte.
                const dominantVat = clonedItems[0]?.vat_rate ?? 23;
                const advanceBase = +(advancePaid / (1 + dominantVat / 100)).toFixed(2);
                clonedItems.push({
                  description: `Odpočet zálohy z ${parent.number} (uhradená ${(parent.paid_amount ? (Number(advancePaid).toFixed(2) + ' €') : '')})`,
                  quantity: 1,
                  unit: 'ks',
                  unit_price: -advanceBase,
                  vat_rate: dominantVat,
                });
              }

              setItems(clonedItems);
            }
            await peekNumber(parent.company_id || cid, presetType || 'invoice');
            return;
          }
        }
        setForm((f) => ({ ...f, company_id: cid }));
        await peekNumber(cid, presetType || 'invoice');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloneFromId, presetType]);

  // Re-peek when type or company changes
  useEffect(() => {
    if (form.company_id) peekNumber(form.company_id, form.type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.company_id, form.type]);

  // Auto-save draft — safety net proti strate rozpracovanej FA
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = setTimeout(() => {
      const hasContent = form.customer_name.trim() || items.some((i) => i.description.trim() || i.unit_price > 0);
      if (hasContent) {
        try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, items, savedAt: Date.now() })); } catch {}
      }
    }, 500);
    return () => clearTimeout(t);
  }, [form, items]);

  // On mount: check existujúci draft (nie pri clone alebo return z /customers/new)
  useEffect(() => {
    if (cloneFromId || newContactId) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Date.now() - (parsed.savedAt || 0) > 86_400_000) { localStorage.removeItem(DRAFT_KEY); return; }
      setDraftAvailable({ form: parsed.form, items: parsed.items });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Po návrate z /customers/new?return=... s new_contact_id → auto-select nového kontaktu
  useEffect(() => {
    if (!newContactId || !form.company_id) return;
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('contacts').select('id, name, ico, dic, ic_dph, street, city, zip, email').eq('id', newContactId).maybeSingle();
      if (data) {
        setForm((f) => ({
          ...f,
          contact_id: data.id,
          customer_name: data.name,
          customer_ico: data.ico || '',
          customer_ic_dph: data.ic_dph || '',
          customer_email: data.email || f.customer_email,
        }));
        setContacts((prev) => prev.some((c) => c.id === data.id) ? prev : [data as unknown as Contact, ...prev]);
        router.replace('/dashboard/invoices/new');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newContactId, form.company_id]);

  function restoreDraft() {
    if (!draftAvailable) return;
    const d = draftAvailable as { form: typeof form; items: typeof items };
    setForm(d.form);
    setItems(d.items);
    setDraftAvailable(null);
  }
  function discardDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setDraftAvailable(null);
  }

  function setItem(i: number, key: keyof Item, val: string | number) {
    const next = [...items];
    // @ts-expect-error generic
    next[i][key] = val;
    setItems(next);
  }

  const totals = items.reduce(
    (acc, it) => {
      const sub = (+it.quantity || 0) * (+it.unit_price || 0);
      const vat = sub * (+it.vat_rate || 0) / 100;
      return { subtotal: acc.subtotal + sub, vat: acc.vat + vat, total: acc.total + sub + vat };
    },
    { subtotal: 0, vat: 0, total: 0 }
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_id) { setError('Vyber firmu'); return; }
    setSaving(true);
    setError(null);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setError('Nie si prihlásený'); setSaving(false); return; }

    // Determine final number: either RPC-assigned (auto) or user override (validated/bumped)
    let finalNumber = form.number.trim();
    if (autoNumber || !finalNumber || finalNumber === peekedNumber) {
      const { data: assigned, error: rpcErr } = await sb.rpc('assign_document_number', { p_company_id: form.company_id, p_type: form.type });
      if (rpcErr || typeof assigned !== 'string') { setError(rpcErr?.message || 'Nepodarilo sa získať číslo dokladu'); setSaving(false); return; }
      finalNumber = assigned;
    } else {
      // User typed their own — bump sequence if it's a numeric format like "PREFIX-YYYY-NNNN"
      const m = finalNumber.match(/(\d+)\s*$/);
      if (m) await sb.rpc('bump_document_number', { p_company_id: form.company_id, p_type: form.type, p_used_number: parseInt(m[1], 10) });
    }

    // Pre PFA (received_invoice) mapuj customer_* fieldy → supplier_* aby
    // KV DPH generátor našiel dodávateľa. Odberateľ = naša firma.
    const isPfa = form.type === 'received_invoice';
    const invoice = isPfa ? {
      ...form,
      customer_name: null, customer_ico: null, customer_ic_dph: null, customer_email: null,
      supplier_name: form.customer_name,
      supplier_ico: form.customer_ico,
      supplier_ic_dph: form.customer_ic_dph,
      number: finalNumber,
      subtotal: +totals.subtotal.toFixed(2),
      vat_amount: +totals.vat.toFixed(2),
      total: +totals.total.toFixed(2),
      paid_amount: 0,
      status: 'issued',
      created_by: user.id,
    } : {
      ...form,
      number: finalNumber,
      subtotal: +totals.subtotal.toFixed(2),
      vat_amount: +totals.vat.toFixed(2),
      total: +totals.total.toFixed(2),
      paid_amount: 0,
      status: 'issued',
      created_by: user.id,
    };

    const { data: inv, error: invErr } = await sb.from('invoices').insert([invoice]).select().single();
    if (invErr) { setError(invErr.message); setSaving(false); return; }

    // ZF → FA konverzia: prenieß paid_amount zo zálohy do novej FA
    // aby FA hneď ukazovala čiastočnú platbu, a označ ZF ako converted.
    if (form.type === 'invoice' && form.parent_invoice_id) {
      const { data: parent } = await sb.from('invoices').select('type, paid_amount, status').eq('id', form.parent_invoice_id).maybeSingle();
      if (parent?.type === 'proforma' && Number(parent.paid_amount || 0) > 0) {
        // Prenes advance ako paid_amount na novú FA
        await sb.from('invoices').update({ paid_amount: Number(parent.paid_amount) }).eq('id', inv.id);
        // ZF sa označí ako converted (status) — už sa z nej nedá vystaviť ďalšia FA
        await sb.from('invoices').update({ status: 'converted', paid_amount: Number(parent.paid_amount) }).eq('id', form.parent_invoice_id);
      }
    }

    const itemRows = items.map((it, idx) => ({
      company_id: form.company_id,
      invoice_id: inv.id,
      position: idx + 1,
      product_id: it.product_id ?? null,
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
      unit_price: it.unit_price,
      vat_rate: it.vat_rate,
      subtotal: it.quantity * it.unit_price,
      vat_amount: it.quantity * it.unit_price * (it.vat_rate / 100),
      total: it.quantity * it.unit_price * (1 + it.vat_rate / 100),
    }));
    await sb.from('invoice_items').insert(itemRows);

    // Auto-post journal entry + stock movement
    // invoice / received_invoice / credit_note / storno → journal entry
    // invoice / received_invoice / credit_note / storno / delivery_note → stock movement (DL no journal)
    const journalTypes = ['invoice', 'credit_note', 'storno', 'received_invoice', 'debit_note'];
    const stockTypes = [...journalTypes, 'delivery_note'];
    if (journalTypes.includes(form.type)) {
      const { error: jeErr } = await sb.rpc('post_invoice_journal', { p_invoice_id: inv.id, p_event: 'issue' });
      if (jeErr) console.warn('Journal posting skipped:', jeErr.message);
    }
    if (stockTypes.includes(form.type)) {
      const { error: stErr } = await sb.rpc('post_invoice_stock', { p_invoice_id: inv.id });
      if (stErr) console.warn('Stock movement skipped:', stErr.message);
    }

    // Successful save — clear draft
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    router.push('/dashboard/invoices');
    router.refresh();
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <PageHeader back={{ href: "/dashboard/invoices" }} title="Nový doklad" subtitle="Vystaviť FA, ZF, DO, DL, PPD alebo CP" />

      {draftAvailable && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-[13px] text-amber-900">
            <strong>Rozpracovaný doklad nájdený.</strong> Chceš pokračovať tam kde si prestal?
          </div>
          <div className="flex gap-2 shrink-0">
            <Button type="button" variant="primary" onClick={restoreDraft}>Obnoviť</Button>
            <Button type="button" variant="ghost" onClick={discardDraft}>Zahodiť</Button>
          </div>
        </div>
      )}

      <form onSubmit={save} className="space-y-4">
        <Card>
          <CardHeader title="Doklad" />
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Firma (dodávateľ)">
              <Select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Typ dokladu">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="invoice">Faktúra (FA)</option>
                <option value="received_invoice">Prijatá FA (PFA)</option>
                <option value="proforma">Zálohová (ZF)</option>
                <option value="credit_note">Dobropis (DOB)</option>
                <option value="debit_note">Ťarchopis (TCH)</option>
                <option value="storno">Storno (STO)</option>
                <option value="delivery_note">Dodací list (DL)</option>
                <option value="cash_receipt">Príjmový PPD</option>
                <option value="cash_payout">Výdavkový VPD</option>
                <option value="quote">Cenová ponuka (CP)</option>
              </Select>
            </Field>
            <Field label="Číslo dokladu *">
              <div className="flex gap-1">
                <Input
                  value={form.number}
                  onChange={(e) => { setForm({ ...form, number: e.target.value }); setAutoNumber(false); }}
                  placeholder={peekedNumber || 'FA-2026-0001'}
                  required
                />
                {!autoNumber && peekedNumber && (
                  <button
                    type="button"
                    onClick={() => { setForm({ ...form, number: peekedNumber }); setAutoNumber(true); }}
                    className="px-2.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg border border-zinc-200"
                    title={`Obnoviť na navrhované: ${peekedNumber}`}
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                {autoNumber ? `Auto: ${peekedNumber || '…'} — pridelí sa pri uložení` : 'Manuálne — sekvencia sa upraví podľa tvojho čísla'}
              </div>
            </Field>
            <Field label="Dátum vystavenia">
              <Input type="date" value={form.issue_date} onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({ ...f, issue_date: v, delivery_date: f.delivery_date === f.issue_date ? v : f.delivery_date }));
              }} />
            </Field>
            <Field label="DZP (dátum dodania)">
              <Input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} />
            </Field>
            <Field label="Dátum splatnosti">
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {DUE_PRESETS.map((d) => {
                  const target = addDays(form.issue_date, d);
                  const active = form.due_date === target;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, due_date: target }))}
                      className={`text-[11px] px-2 py-0.5 rounded border transition ${active ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'}`}
                    >
                      {d === 0 ? 'Hneď' : `+${d}d`}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Mena">
              <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                <option value="EUR">EUR</option>
                <option value="CZK">CZK</option>
                <option value="USD">USD</option>
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title={form.type === 'received_invoice' ? 'Dodávateľ' : 'Odberateľ'}
            subtitle={form.type === 'received_invoice' ? 'Kto ti vystavil FA' : undefined}
            action={
              <Button type="button" variant="ghost" onClick={() => setShowAddContactModal(true)} disabled={!form.company_id}>
                <UserPlus size={14} /> Pridať nového
              </Button>
            }
          />
          <div className="p-5 space-y-4">
            <Field label={`Vybrať z existujúcich (${contacts.length})`}>
              <div className="relative">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    value={contactQuery}
                    onChange={(e) => { setContactQuery(e.target.value); setShowContactDropdown(true); }}
                    onFocus={() => setShowContactDropdown(true)}
                    onBlur={() => setTimeout(() => setShowContactDropdown(false), 200)}
                    placeholder="Hľadaj podľa názvu, IČO alebo IČ DPH…"
                    className="w-full bg-white border border-zinc-200 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                </div>
                {showContactDropdown && filteredContacts.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                    {filteredContacts.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => pickContact(c)}
                        className="w-full text-left px-3 py-2 hover:bg-zinc-50 border-b border-zinc-100 last:border-0"
                      >
                        <div className="text-sm font-medium text-zinc-900">{c.name}</div>
                        <div className="text-xs text-zinc-500 flex gap-3">
                          {c.ico && <span>IČO: {c.ico}</span>}
                          {c.ic_dph && <span>IČ DPH: {c.ic_dph}</span>}
                          {c.city && <span>{c.city}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showContactDropdown && filteredContacts.length === 0 && contactQuery && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg p-3 text-sm text-zinc-500">
                    Žiadny zákazník &quot;{contactQuery}&quot;.{' '}
                    <button type="button" onClick={() => setShowAddContactModal(true)} className="text-zinc-900 hover:underline">
                      Pridať nového →
                    </button>
                  </div>
                )}
              </div>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label={form.type === 'received_invoice' ? 'Názov dodávateľa' : 'Názov zákazníka'}>
                <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
              </Field>
              <Field label="IČO">
                <Input value={form.customer_ico} onChange={(e) => setForm({ ...form, customer_ico: e.target.value })} />
              </Field>
              <Field label="IČ DPH">
                <Input value={form.customer_ic_dph} onChange={(e) => setForm({ ...form, customer_ic_dph: e.target.value })} placeholder="SK1234567890" />
              </Field>
              {form.type !== 'received_invoice' && (
                <>
                  <Field label="Email zákazníka" hint="Sem chodia pripomienky platby">
                    <Input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} placeholder="zakaznik@firma.sk" />
                  </Field>
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="flex items-center gap-2 text-sm pt-7">
                      <input type="checkbox" checked={form.reminders_enabled} onChange={(e) => setForm({ ...form, reminders_enabled: e.target.checked })} />
                      <span>Automatické pripomienky platby <span className="text-zinc-500">(3 dni pred splatnosťou · v deň splatnosti · +7 dní · +30 dní)</span></span>
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Položky"
            action={
              <Button
                type="button"
                variant="secondary"
                onClick={() => setItems([...items, { description: '', quantity: 1, unit: 'ks', unit_price: 0, vat_rate: 23 }])}
              >
                <Plus size={14} /> Pridať položku
              </Button>
            }
          />
          <div className="p-5 space-y-3">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_90px_80px_120px_90px_60px_auto] gap-2 items-end">
                <Field label={i === 0 ? 'Popis' : ''}>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setProductPickerRow(i)}
                      className={`shrink-0 flex items-center gap-1 px-2.5 rounded-lg text-[11px] font-mono tracking-tight border transition-colors ${
                        it.product_id
                          ? 'bg-zinc-900 border-zinc-900 text-white hover:bg-zinc-800'
                          : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-900'
                      }`}
                      title={it.product_id ? `Prepojené: ${it.product_sku || '—'}` : 'Vybrať z cenníka'}
                    >
                      <Package size={11} />
                      {it.product_sku || 'Kód'}
                    </button>
                    <Input value={it.description} onChange={(e) => setItem(i, 'description', e.target.value)} placeholder="Tovar / služba" />
                  </div>
                </Field>
                <Field label={i === 0 ? 'Množstvo' : ''}>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={it.quantity === 0 ? '' : String(it.quantity)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(',', '.').replace(/[^\d.]/g, '');
                      setItem(i, 'quantity', raw === '' ? 0 : parseFloat(raw) || 0);
                    }}
                    placeholder="1"
                  />
                </Field>
                <Field label={i === 0 ? 'MJ' : ''}>
                  <Input
                    list="mj-options"
                    value={it.unit}
                    onChange={(e) => setItem(i, 'unit', e.target.value)}
                    placeholder="ks"
                  />
                </Field>
                <Field label={i === 0 ? `Cena za ${it.unit || 'MJ'}` : ''}>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={it.unit_price === 0 ? '' : String(it.unit_price)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(',', '.').replace(/[^\d.]/g, '');
                      setItem(i, 'unit_price', raw === '' ? 0 : parseFloat(raw) || 0);
                    }}
                    placeholder="0.00"
                  />
                </Field>
                <Field label={i === 0 ? 'DPH%' : ''}>
                  <Select value={it.vat_rate} onChange={(e) => setItem(i, 'vat_rate', +e.target.value)}>
                    <option value={23}>23</option>
                    <option value={19}>19</option>
                    <option value={10}>10</option>
                    <option value={0}>0</option>
                  </Select>
                </Field>
                <Field label={i === 0 ? 'Spolu' : ''}>
                  <div className="text-sm font-mono py-2 text-zinc-900 text-right">
                    {fmtEur(it.quantity * it.unit_price * (1 + it.vat_rate / 100))}
                  </div>
                </Field>
                <button
                  type="button"
                  onClick={() => setItems(items.filter((_, j) => j !== i))}
                  className="text-red-500 hover:bg-red-50 p-2 rounded mb-1"
                  disabled={items.length === 1}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-zinc-100 px-5 py-4 bg-zinc-50 flex justify-end gap-8 text-sm">
            <div>
              <div className="text-xs text-zinc-500">Základ</div>
              <div className="font-mono font-medium">{fmtEur(totals.subtotal)}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">DPH</div>
              <div className="font-mono font-medium">{fmtEur(totals.vat)}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Spolu</div>
              <div className="font-mono font-bold text-lg text-zinc-900">{fmtEur(totals.total)}</div>
            </div>
          </div>
        </Card>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-lg">{error}</div>
        )}

        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Ukladám…' : 'Vystaviť doklad'}
          </Button>
          <Link href="/dashboard/invoices"><Button type="button" variant="ghost">Zrušiť</Button></Link>
        </div>
      </form>

      {/* Globálny datalist pre MJ — používaný cez list="mj-options" */}
      <datalist id="mj-options">
        <option value="ks" />
        <option value="hod" />
        <option value="mes" />
        <option value="deň" />
        <option value="rok" />
        <option value="kg" />
        <option value="g" />
        <option value="tona" />
        <option value="l" />
        <option value="ml" />
        <option value="m" />
        <option value="m²" />
        <option value="m³" />
        <option value="km" />
        <option value="bal" />
        <option value="paleta" />
        <option value="sada" />
        <option value="pár" />
      </datalist>

      {productPickerRow !== null && form.company_id && (
        <ProductPickerModal
          companyId={form.company_id}
          onClose={() => setProductPickerRow(null)}
          onPicked={(p: PickedProduct) => {
            const idx = productPickerRow;
            setItems((prev) => prev.map((it, i) => i !== idx ? it : {
              ...it,
              product_id: p.id,
              product_sku: p.sku,
              description: p.name,
              unit: p.unit,
              unit_price: p.selling_price,
              vat_rate: p.vat_rate,
              quantity: it.quantity || 1,
            }));
            setProductPickerRow(null);
          }}
        />
      )}

      {showAddContactModal && form.company_id && (
        <AddContactModal
          companyId={form.company_id}
          initialType={form.type === 'received_invoice' ? 'supplier' : 'customer'}
          onClose={() => setShowAddContactModal(false)}
          onCreated={(contact: NewContact) => {
            // Auto-populate + auto-select the new contact
            setForm((f) => ({
              ...f,
              contact_id: contact.id,
              customer_name: contact.name,
              customer_ico: contact.ico || '',
              customer_ic_dph: contact.ic_dph || '',
              customer_email: contact.email || f.customer_email,
            }));
            setContacts((prev) => [...prev, contact as unknown as Contact]);
            setContactQuery(contact.name);
            setShowAddContactModal(false);
          }}
        />
      )}
    </div>
  );
}
