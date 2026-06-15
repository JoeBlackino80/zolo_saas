import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import EditInvoiceClient from './client';

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { data: invoice } = await sb.from('invoices').select('*').eq('id', id).single();
  const { data: items } = await sb.from('invoice_items').select('*').eq('invoice_id', id).order('position');
  const { data: companies } = await sb.from('companies').select('id, name').is('deleted_at', null).order('name');
  if (!invoice) notFound();
  return <EditInvoiceClient invoice={invoice} items={items || []} companies={companies || []} />;
}
