import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login');

  // Load companies user has access to (RLS-scoped)
  const { data: companies } = await sb
    .from('companies')
    .select('id, name, ico, dic, ic_dph, is_vat_payer')
    .order('name');

  return (
    <div className="grid grid-cols-[256px_1fr] min-h-screen bg-slate-50 text-slate-900">
      <Sidebar companies={companies || []} userEmail={user.email || ''} />
      <main className="overflow-auto">{children}</main>
    </div>
  );
}
