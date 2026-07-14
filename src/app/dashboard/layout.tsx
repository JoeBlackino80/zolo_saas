import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import CommandPalette from '@/components/CommandPalette';
import MobileTopbar from '@/components/MobileTopbar';
import MfaBanner from '@/components/MfaBanner';
import IdleTimeout from '@/components/IdleTimeout';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login');

  // Load companies user has access to (RLS-scoped) + module flags
  const { data: companies } = await sb
    .from('companies')
    .select('id, name, ico, dic, ic_dph, is_vat_payer, plan, enabled_modules')
    .is('deleted_at', null)
    .order('name');

  let mfaEnabled = false;
  try {
    const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    mfaEnabled = aal?.nextLevel === 'aal2';
  } catch {
    // ignore; banner just won't show
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="md:grid md:grid-cols-[256px_1fr] min-h-screen">
        <div className="bg-zinc-950 md:min-h-screen">
          <Sidebar companies={companies || []} userEmail={user.email || ''} />
        </div>
        <div className="flex flex-col">
          <MobileTopbar />
          <main className="overflow-auto flex-1">
            <MfaBanner mfaEnabled={mfaEnabled} />
            {children}
          </main>
        </div>
      </div>
      <CommandPalette />
      <IdleTimeout />
    </div>
  );
}
