import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import EditCompanyClient from './client';

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { data: company } = await sb.from('companies').select('*').eq('id', id).is('deleted_at', null).single();
  if (!company) notFound();
  return <EditCompanyClient company={company} />;
}
