import { createClient } from '@/lib/supabase/server';
import { PageHeader, Button } from '@/components/ui';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import InvoicesListClient from './list-client';

export default async function InvoicesPage() {
  const sb = await createClient();
  const { data: invoices } = await sb
    .from('invoices')
    .select('id, type, number, customer_name, issue_date, delivery_date, due_date, total, paid_amount, status, currency')
    .is('deleted_at', null)
    .order('issue_date', { ascending: false })
    .limit(500);

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      <PageHeader
        title="Fakturácia"
        subtitle="Faktúry · Zálohové · Dobropisy · Dodacie listy · PPD · Cenové ponuky"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/invoices/bulk-send">
              <Button variant="secondary">Hromadne poslať</Button>
            </Link>
            <Link href="/dashboard/invoices/export">
              <Button variant="secondary">Export CSV / ZIP</Button>
            </Link>
            <Link href="/dashboard/invoices/new">
              <Button variant="primary"><Plus size={14} /> Nový doklad</Button>
            </Link>
          </div>
        }
      />
      <InvoicesListClient invoices={invoices || []} />
    </div>
  );
}
