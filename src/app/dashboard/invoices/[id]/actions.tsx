'use client';

import { Button } from '@/components/ui';
import { Check, Mail, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';

export default function InvoiceActions({ invoice }: { invoice: { id: string; total: number; paid_amount: number | null; customer_name?: string | null; number: string } }) {
  const toast = useToast();
  const router = useRouter();

  async function markPaid() {
    const sb = createClient();
    const { error } = await sb
      .from('invoices')
      .update({ paid_amount: invoice.total, status: 'paid' })
      .eq('id', invoice.id);
    if (error) { toast(error.message, 'error'); return; }
    toast('Označené ako zaplatené', 'success');
    router.refresh();
  }

  function mailto() {
    const subj = encodeURIComponent(`Faktúra ${invoice.number}`);
    const body = encodeURIComponent(`Dobrý deň,\n\nposielam Vám faktúru ${invoice.number} na sumu ${invoice.total} €.\n\nĎakujem,\n`);
    window.open(`mailto:?subject=${subj}&body=${body}`);
  }

  return (
    <>
      {Number(invoice.paid_amount || 0) < Number(invoice.total) && (
        <Button variant="secondary" onClick={markPaid}>
          <Check size={14} /> Označiť zaplatené
        </Button>
      )}
      <Button variant="secondary" onClick={mailto}>
        <Mail size={14} /> Email
      </Button>
      <Button variant="primary" onClick={() => window.print()}>
        <FileText size={14} /> PDF
      </Button>
    </>
  );
}
