'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Check, Mail, FileText, Eye, Loader2, X, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';

export default function InvoiceActions({ invoice }: { invoice: { id: string; total: number; paid_amount: number | null; customer_name?: string | null; number: string } }) {
  const toast = useToast();
  const router = useRouter();
  const [showSend, setShowSend] = useState(false);
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

  return (
    <>
      {Number(invoice.paid_amount || 0) < Number(invoice.total) && (
        <Button variant="secondary" onClick={markPaid}><Check size={14} /> Zaplatené</Button>
      )}
      <a href={`/api/invoice-pdf?id=${invoice.id}&inline=1`} target="_blank" rel="noopener noreferrer">
        <Button variant="secondary"><Eye size={14} /> Náhľad PDF</Button>
      </a>
      <a href={`/api/invoice-pdf?id=${invoice.id}`}>
        <Button variant="secondary"><FileText size={14} /> Stiahnuť PDF</Button>
      </a>
      <a href={`/api/invoice-isdoc?id=${invoice.id}`}>
        <Button variant="secondary"><FileText size={14} /> ISDOC</Button>
      </a>
      <Button variant="primary" onClick={() => setShowSend(true)}><Mail size={14} /> Poslať mailom</Button>

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
