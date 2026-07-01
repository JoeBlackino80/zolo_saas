import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardHeader, Badge } from '@/components/ui';
import { fmtDate } from '@/lib/utils';
import TeamInviteForm from './form';

export default async function TeamPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: companies } = await sb.from('companies').select('id, name').is('deleted_at', null).order('name');
  const { data: invitations } = await sb
    .from('team_invitations')
    .select('id, invited_email, role, status, created_at, expires_at, companies(name)')
    .eq('invited_by', user.id)
    .order('created_at', { ascending: false });
  const { data: members } = await sb
    .from('user_company_roles')
    .select('id, user_id, role, created_at, companies(name)')
    .neq('user_id', user.id);

  type Inv = { id: string; invited_email: string; role: string; status: string; created_at: string; expires_at: string; companies: { name: string } | { name: string }[] | null };
  type Mem = { id: string; user_id: string; role: string; created_at: string; companies: { name: string } | { name: string }[] | null };
  const inv = (invitations || []) as Inv[];
  const mem = (members || []) as Mem[];

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <PageHeader title="Tím & pozvánky" subtitle="Pozvi účtovníčku alebo kolegu na prácu s tvojimi firmami" />

      <Card className="mb-4">
        <CardHeader title="Pozvať nového člena" />
        <div className="p-5">
          <TeamInviteForm companies={companies || []} />
        </div>
      </Card>

      <Card className="mb-4">
        <CardHeader title="Aktívni členovia tímu" subtitle={`${mem.length} ľudí má prístup k tvojim firmám`} />
        {mem.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">Zatiaľ žiadni členovia. Pošli pozvánku hore.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {mem.map((m) => {
              const co = Array.isArray(m.companies) ? m.companies[0] : m.companies;
              return (
                <div key={m.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <div className="font-mono text-xs text-zinc-500">{m.user_id.slice(0, 8)}…</div>
                    <div className="text-sm font-medium text-zinc-900">{co?.name || '?'}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={m.role === 'admin' ? 'red' : m.role === 'accountant' ? 'amber' : 'gray'}>{m.role}</Badge>
                    <div className="text-xs text-zinc-500">{fmtDate(m.created_at)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Čakajúce pozvánky" subtitle={`${inv.filter((i) => i.status === 'pending').length} čaká na prijatie`} />
        {inv.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">Žiadne odoslané pozvánky.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {inv.map((i) => {
              const co = Array.isArray(i.companies) ? i.companies[0] : i.companies;
              return (
                <div key={i.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <div className="text-sm font-medium text-zinc-900">{i.invited_email}</div>
                    <div className="text-xs text-zinc-500">{co?.name || '?'} · expirácia {fmtDate(i.expires_at)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={i.role === 'admin' ? 'red' : i.role === 'accountant' ? 'amber' : 'gray'}>{i.role}</Badge>
                    <Badge variant={i.status === 'pending' ? 'amber' : i.status === 'accepted' ? 'green' : 'gray'}>{i.status}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
