import VatReturnClient from './client';
import { createClient } from '@/lib/supabase/server';

export default async function VatReturnPage() {
  const sb = await createClient();
  const { data: companies } = await sb.from('companies').select('id, name, dic, ic_dph').is('deleted_at', null).order('name');
  return <VatReturnClient companies={companies || []} kind="dp" title="DP DPH — Daňové priznanie" />;
}
