import VatReturnClient from '../vat-return/client';
import { createClient } from '@/lib/supabase/server';

export default async function ControlStatementPage() {
  const sb = await createClient();
  const { data: companies } = await sb.from('companies').select('id, name, dic, ic_dph').is('deleted_at', null).order('name');
  return <VatReturnClient companies={companies || []} kind="kv" title="Kontrolný výkaz DPH (KV)" />;
}
