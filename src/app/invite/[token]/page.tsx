import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import AcceptButton from './accept';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sb = await createClient();
  const { data: invite } = await sb
    .from('team_invitations')
    .select('id, invited_email, role, status, expires_at, companies(name, ico)')
    .eq('invitation_token', token)
    .maybeSingle();

  const { data: { user } } = await sb.auth.getUser();
  const expired = invite && new Date(invite.expires_at) < new Date();
  const co = invite ? (Array.isArray(invite.companies) ? invite.companies[0] : invite.companies) : null;
  const roleLabel: Record<string, string> = { admin: 'Admin (plný prístup)', accountant: 'Účtovník', viewer: 'Iba čítanie' };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
      <div className="w-full max-w-md bg-white rounded-2xl border border-zinc-100 p-8">
        <div className="w-11 h-11 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-black text-xl tracking-tight mb-5">Z</div>

        {!invite && (
          <>
            <h1 className="text-xl font-bold text-slate-900">Pozvánka neplatí</h1>
            <p className="text-sm text-slate-500 mt-2">Odkaz je nesprávny alebo už bol použitý. Požiadaj o novú pozvánku.</p>
            <Link href="/login" className="inline-block mt-5 text-sm text-blue-600 hover:underline">Prejsť na prihlásenie →</Link>
          </>
        )}

        {invite && invite.status === 'accepted' && (
          <>
            <h1 className="text-xl font-bold text-slate-900">Pozvánka už bola prijatá</h1>
            <p className="text-sm text-slate-500 mt-2">Stačí sa prihlásiť ako <strong>{invite.invited_email}</strong>.</p>
            <Link href="/login" className="inline-block mt-5 text-sm text-blue-600 hover:underline">Prejsť na prihlásenie →</Link>
          </>
        )}

        {invite && invite.status === 'pending' && expired && (
          <>
            <h1 className="text-xl font-bold text-slate-900">Pozvánka exspirovala</h1>
            <p className="text-sm text-slate-500 mt-2">Odkaz platil do {new Date(invite.expires_at).toLocaleDateString('sk-SK')}. Požiadaj o novú.</p>
          </>
        )}

        {invite && invite.status === 'pending' && !expired && (
          <>
            <h1 className="text-xl font-bold text-slate-900">Pozvánka do {co?.name || 'firmy'}</h1>
            <p className="text-sm text-slate-600 mt-3">Boli si pozvaný(á) ako <strong>{roleLabel[invite.role] || invite.role}</strong>.</p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-4 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Firma</span><span className="font-medium text-slate-900">{co?.name || '?'}</span></div>
              {co?.ico && <div className="flex justify-between"><span className="text-slate-500">IČO</span><span className="font-mono text-xs text-slate-700">{co.ico}</span></div>}
              <div className="flex justify-between"><span className="text-slate-500">Pozvaný email</span><span className="text-xs text-slate-700">{invite.invited_email}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Platí do</span><span className="text-xs text-slate-700">{new Date(invite.expires_at).toLocaleDateString('sk-SK')}</span></div>
            </div>
            {user ? (
              user.email?.toLowerCase() === invite.invited_email.toLowerCase()
                ? <AcceptButton token={token} />
                : <div className="mt-5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    Si prihlásený(á) ako <strong>{user.email}</strong>, no pozvánka je pre <strong>{invite.invited_email}</strong>. Odhlás sa a prihlás správnym účtom, alebo si ho vytvor.
                  </div>
            ) : (
              <Link href={`/login?next=${encodeURIComponent('/invite/' + token)}`} className="block w-full text-center mt-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-full text-[14px] transition-colors">
                Prihlásiť alebo registrovať
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
