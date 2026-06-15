import VatReturnClient from '../vat-return/client';
import { createClient } from '@/lib/supabase/server';

export default async function SummaryStatementPage() {
  const sb = await createClient();
  const { data: companies } = await sb.from('companies').select('id, name, dic, ic_dph').is('deleted_at', null).order('name');
  return <VatReturnClient companies={companies || []} kind="sv" title="Súhrnný výkaz DPH (SV) — EÚ dodania" />;
}
