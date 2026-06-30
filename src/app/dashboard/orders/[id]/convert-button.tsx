'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { Loader2, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';

type ItemLine = { description?: string; quantity?: number; unit?: string; unit_price?: number; vat_rate?: number };

export default function ConvertButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function convert() {
    if (!confirm('Konvertovať objednávku na faktúru? Položky sa skopírujú a FA sa zaúčtuje.')) return;
    setLoading(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: order, error: oErr } = await sb.from('orders').select('*, contacts(name, ico, ic_dph, street, city, zip, email)').eq('id', orderId).single();
    if (oErr || !order) { toast(oErr?.message || 'Objednávka nenájdená', 'error'); setLoading(false); return; }
    const c = Array.isArray(order.contacts) ? order.contacts[0] : order.contacts;

    const { data: number, error: nErr } = await sb.rpc('assign_document_number', { p_company_id: order.company_id, p_type: 'invoice' });
    if (nErr) { toast(nErr.message, 'error'); setLoading(false); return; }

    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(); due.setDate(due.getDate() + 14);
    const { data: inv, error: iErr } = await sb.from('invoices').insert({
      company_id: order.company_id,
      type: 'invoice',
      number: number,
      contact_id: order.contact_id,
      customer_name: c?.name || null,
      customer_ico: c?.ico || null,
      customer_ic_dph: c?.ic_dph || null,
      customer_street: c?.street || null,
      customer_city: c?.city || null,
      customer_zip: c?.zip || null,
      customer_email: c?.email || null,
      issue_date: today,
      delivery_date: today,
      due_date: due.toISOString().slice(0, 10),
      subtotal: order.subtotal,
      vat_amount: order.vat_amount,
      total: order.total,
      paid_amount: 0,
      status: 'issued',
      currency: order.currency || 'EUR',
      exchange_rate: 1,
      notes: `Z objednávky ${order.number}`,
      reminders_enabled: true,
      created_by: user.id,
    }).select('id').single();
    if (iErr || !inv) { toast(iErr?.message || 'Chyba pri vytvorení FA', 'error'); setLoading(false); return; }

    const lines = ((order.items as ItemLine[]) || []).map((it, i) => ({
      company_id: order.company_id,
      invoice_id: inv.id,
      position: i + 1,
      description: it.description || '',
      quantity: it.quantity || 0,
      unit: it.unit || 'ks',
      unit_price: it.unit_price || 0,
      vat_rate: it.vat_rate || 0,
      subtotal: (it.quantity || 0) * (it.unit_price || 0),
      vat_amount: (it.quantity || 0) * (it.unit_price || 0) * ((it.vat_rate || 0) / 100),
      total: (it.quantity || 0) * (it.unit_price || 0) * (1 + (it.vat_rate || 0) / 100),
    }));
    if (lines.length) await sb.from('invoice_items').insert(lines);

    await sb.rpc('post_invoice_journal', { p_invoice_id: inv.id, p_event: 'issue' });
    await sb.rpc('post_invoice_stock', { p_invoice_id: inv.id });

    await sb.from('orders').update({ converted_invoice_id: inv.id, status: 'completed', updated_at: new Date().toISOString() }).eq('id', orderId);

    toast('FA vytvorená a zaúčtovaná', 'success');
    router.push(`/dashboard/invoices/${inv.id}`);
  }

  return (
    <Button variant="primary" onClick={convert} disabled={loading}>
      {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
      Vystaviť FA
    </Button>
  );
}
