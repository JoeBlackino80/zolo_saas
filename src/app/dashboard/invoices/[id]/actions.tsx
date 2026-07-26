'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Check, Mail, FileText, Eye, Loader2, X, Send, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';

export default function InvoiceActions({ invoice }: { invoice: { id: string; type?: string; total: number; paid_amount: number | null; customer_name?: string | null; number: string } }) {
  const isUnpaid = Number(invoice.paid_amount || 0) < Number(invoice.total);
  const type = invoice.type || 'invoice';
  const toast = useToast();
  const router = useRouter();
  const [showSend, setShowSend] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState(`Faktúra ${invoice.number}`);
  const [emailBody, setEmailBody] = useState(`Dobrý deň,\n\nv prílohe Vám posielam faktúru ${invoice.number}.\n\nĎakujem,`);
  const [sending, setSending] = useState(false);

  async function markPaid() {
    const sb = createClient();
    const remaining = Number(invoice.total) - Number(invoice.paid_amount || 0);
    const { error } = await sb.rpc('mark_invoice_paid', {
      p_invoice_id: invoice.id,
      p_amount: remaining,
      p_method: 'bank',
      p_notes: 'Manuálne označené ako zaplatené',
    });
    if (error) { toast(error.message, 'error'); return; }
    const { data: inv } = await sb.from('invoices').select('company_id').eq('id', invoice.id).single();
    if (inv?.company_id) {
      fetch('/api/webhook-fire', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: inv.company_id, event: 'invoice.paid', data: { id: invoice.id, number: invoice.number, amount: remaining } }),
      }).catch(() => undefined);
    }
    toast('Zaplatené · denníkový zápis vytvorený', 'success');
    router.refresh();
  }

  async function sendEmail() {
    if (!emailTo.trim() || !emailTo.includes('@')) { toast('Zadaj platný email', 'error'); return; }
    setSending(true);
    try {
      const r = await fetch('/api/send-invoice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id, to: emailTo, subject: emailSubject, body: emailBody }),
      });
      const j = await r.json();
      if (!r.ok) {
        if (r.status === 429) {
          const retryAfter = r.headers.get('Retry-After');
          const msg = retryAfter ? `Skús znova o ${retryAfter} s` : 'Príliš veľa pokusov. Skús neskôr.';
          toast(msg, 'error');
        } else {
          toast(j.error || 'Odoslanie zlyhalo', 'error');
        }
        setSending(false); return;
      }
      toast('Faktúra odoslaná na ' + emailTo, 'success');
      setShowSend(false);
      router.refresh();
    } catch (e) {
      toast('Chyba: ' + (e as Error).message, 'error');
    } finally {
      setSending(false);
    }
  }

  // Vytvor kategorizovaný zoznam sekundárnych akcií (v dropdown menu).
  type MenuItem = { label: string; href?: string; onClick?: () => void; external?: boolean };
  type MenuSection = { title: string; items: MenuItem[] };
  const sections: MenuSection[] = [];

  // 1) Konverzia dokladu (type-špecifické)
  const convert: MenuItem[] = [];
  if (type === 'proforma') {
    convert.push({ label: '→ Vystaviť ostrú FA', href: `/dashboard/invoices/new?parent=${invoice.id}&type=invoice` });
    if (Number(invoice.paid_amount || 0) > 0) {
      convert.push({ label: '→ Preddavková FA (daňový doklad)', href: `/dashboard/invoices/new?parent=${invoice.id}&type=advance_invoice` });
    }
  }
  if (type === 'invoice') {
    convert.push(
      { label: 'Vystaviť dobropis', href: `/dashboard/invoices/new?from=${invoice.id}&type=credit_note&parent=${invoice.id}` },
      { label: 'Vystaviť storno', href: `/dashboard/invoices/new?from=${invoice.id}&type=storno&parent=${invoice.id}` },
      { label: 'Vystaviť ťarchopis', href: `/dashboard/invoices/new?from=${invoice.id}&type=debit_note&parent=${invoice.id}` },
      { label: 'Vystaviť dodací list', href: `/dashboard/invoices/new?from=${invoice.id}&type=delivery_note&parent=${invoice.id}` },
    );
  }
  if (convert.length) sections.push({ title: 'Konvertovať', items: convert });

  // 2) Úhrada
  const payment: MenuItem[] = [];
  if (isUnpaid && ['invoice', 'advance_invoice', 'debit_note'].includes(type)) {
    payment.push({ label: '💵 PPD ku FA (hotovostná úhrada)', href: `/dashboard/cash-book/quick?type=cash_receipt&parent=${invoice.id}` });
  }
  if (isUnpaid && ['received_invoice', 'received_credit_note'].includes(type)) {
    payment.push({ label: '💵 VPD ku PFA (hotovostná úhrada)', href: `/dashboard/cash-book/quick?type=cash_payout&parent=${invoice.id}` });
  }
  if (type === 'proforma' && isUnpaid) {
    payment.push({ label: '💵 Prijať zálohu v hotovosti (PPD)', href: `/dashboard/cash-book/quick?type=cash_receipt&parent=${invoice.id}` });
  }
  if (type === 'received_proforma' && isUnpaid) {
    payment.push({ label: '💵 Zaplatiť zálohu v hotovosti (VPD)', href: `/dashboard/cash-book/quick?type=cash_payout&parent=${invoice.id}` });
  }
  if (payment.length) sections.push({ title: 'Úhrada', items: payment });

  // 3) Stiahnuť / export
  sections.push({
    title: 'Stiahnuť',
    items: [
      { label: '📄 PDF (Slovenčina)', href: `/api/invoice-pdf?id=${invoice.id}`, external: true },
      { label: '📄 PDF (English)', href: `/api/invoice-pdf?id=${invoice.id}&lang=en`, external: true },
      { label: '📄 PDF (Deutsch)', href: `/api/invoice-pdf?id=${invoice.id}&lang=de`, external: true },
      { label: '📎 ISDOC (XML)', href: `/api/invoice-isdoc?id=${invoice.id}`, external: true },
    ],
  });

  const hasMore = sections.some((s) => s.items.length > 0);

  return (
    <>
      {/* PRIMARY — vždy visible */}
      {isUnpaid && (
        <Button variant="secondary" onClick={markPaid}><Check size={14} /> Zaplatené</Button>
      )}
      <a href={`/api/invoice-pdf?id=${invoice.id}&inline=1`} target="_blank" rel="noopener noreferrer">
        <Button variant="secondary"><Eye size={14} /> Náhľad PDF</Button>
      </a>
      <Button variant="primary" onClick={() => setShowSend(true)}><Mail size={14} /> Poslať mailom</Button>

      {/* SECONDARY — v dropdown menu "Ďalšie akcie" */}
      {hasMore && (
        <div className="relative">
          <Button variant="secondary" onClick={() => setShowMore((v) => !v)}>
            <MoreHorizontal size={14} /> Ďalšie akcie
          </Button>
          {showMore && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)} />
              <div className="absolute right-0 top-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 min-w-[260px] overflow-hidden">
                {sections.map((section, si) => (
                  <div key={section.title}>
                    {si > 0 && <div className="border-t border-zinc-100" />}
                    <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">{section.title}</div>
                    {section.items.map((item, ii) => (
                      item.href ? (
                        item.external ? (
                          <a
                            key={ii}
                            href={item.href}
                            className="block px-4 py-2 text-[13px] text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
                            onClick={() => setShowMore(false)}
                          >
                            {item.label}
                          </a>
                        ) : (
                          <Link
                            key={ii}
                            href={item.href}
                            className="block px-4 py-2 text-[13px] text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
                            onClick={() => setShowMore(false)}
                          >
                            {item.label}
                          </Link>
                        )
                      ) : (
                        <button
                          key={ii}
                          onClick={() => { item.onClick?.(); setShowMore(false); }}
                          className="block w-full text-left px-4 py-2 text-[13px] text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
                        >
                          {item.label}
                        </button>
                      )
                    ))}
                  </div>
                ))}
                <div className="border-t border-zinc-100 h-1" />
              </div>
            </>
          )}
        </div>
      )}

      {showSend && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSend(false)}>
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Odoslať faktúru emailom</h2>
                <p className="text-xs text-zinc-500 mt-0.5">PDF sa pripojí ako príloha</p>
              </div>
              <button onClick={() => setShowSend(false)} className="text-zinc-400 hover:text-zinc-700"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Komu</label>
                <input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="zakaznik@firma.sk" className="mt-1 w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-zinc-900" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Predmet</label>
                <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="mt-1 w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-zinc-900" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Správa</label>
                <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={5} className="mt-1 w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-zinc-900" />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <Button variant="ghost" onClick={() => setShowSend(false)}>Zrušiť</Button>
              <Button variant="primary" onClick={sendEmail} disabled={sending}>
                {sending ? <><Loader2 size={14} className="animate-spin" /> Posielam…</> : <><Send size={14} /> Odoslať</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
