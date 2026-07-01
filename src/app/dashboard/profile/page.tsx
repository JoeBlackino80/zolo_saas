import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardHeader, Badge } from '@/components/ui';
import { fmtDate } from '@/lib/utils';
import ProfileActions from './actions';

export default async function ProfilePage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: { session } } = await sb.auth.getSession();
  const { data: roles } = await sb
    .from('user_company_roles')
    .select('role, company_id, companies(name)')
    .eq('user_id', user.id);
  type RoleRow = { role: string; company_id: string; companies: { name: string } | { name: string }[] | null };
  const rows = (roles || []) as RoleRow[];

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <PageHeader title="Môj profil" subtitle="Účet, MFA, prístupy" />

      <Card className="mb-4 bg-gradient-to-br from-zinc-900 to-zinc-800 text-white border-none">
        <div className="p-6 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Prihlásený účet</div>
            <div className="text-2xl font-bold mt-1">{user.email}</div>
            <div className="text-xs text-zinc-400 font-mono mt-1">User ID: {user.id}</div>
            <div className="flex gap-6 mt-4 text-sm">
              <div>
                <div className="text-xs text-zinc-400">Vytvorený</div>
                <div className="font-medium">{fmtDate(user.created_at)}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">Posledné prihlásenie</div>
                <div className="font-medium">{fmtDate(user.last_sign_in_at || '')}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">AAL</div>
                <div className="font-medium">{session?.user?.aud || 'authenticated'}</div>
              </div>
            </div>
          </div>
          <ProfileActions />
        </div>
      </Card>

      <Card className="mb-4">
        <CardHeader title="Moje firmy" subtitle={`${rows.length} firiem · multi-tenant cez RLS`} />
        <div className="divide-y divide-zinc-100">
          {rows.map((r) => {
            const company = Array.isArray(r.companies) ? r.companies[0] : r.companies;
            return (
              <div key={r.company_id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white font-bold flex items-center justify-center text-sm tracking-tight">
                    {(company?.name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-900 text-sm">{company?.name || '?'}</div>
                  </div>
                </div>
                <Badge variant={r.role === 'admin' ? 'red' : r.role === 'accountant' ? 'amber' : 'gray'}>
                  {r.role}
                </Badge>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
