'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<{ msg: string; kind: 'error' | 'success' | 'muted' } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setStatus({ msg: 'Heslo aspoň 8 znakov', kind: 'error' }); return; }
    if (password !== confirm) { setStatus({ msg: 'Heslá sa nezhodujú', kind: 'error' }); return; }
    setLoading(true);
    setStatus({ msg: 'Ukladám…', kind: 'muted' });
    const sb = createClient();
    const { error } = await sb.auth.updateUser({ password });
    if (error) {
      setStatus({ msg: 'Chyba: ' + error.message, kind: 'error' });
      setLoading(false);
      return;
    }
    setStatus({ msg: '✓ Heslo zmenené, presmerovávam…', kind: 'success' });
    setTimeout(() => { router.push('/dashboard'); router.refresh(); }, 800);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-200">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_30%,rgba(59,130,246,0.15)_0%,transparent_50%),radial-gradient(circle_at_80%_70%,rgba(139,92,246,0.12)_0%,transparent_50%)]" />
      <div className="relative w-full max-w-md bg-zinc-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-9 shadow-2xl">
        <div className="flex items-center gap-3 mb-7">
          <div className="w-11 h-11 rounded-xl bg-white text-zinc-900 flex items-center justify-center font-black text-2xl tracking-tighter">Z</div>
          <div>
            <div className="text-xl font-bold text-white tracking-tight">Nové heslo</div>
            <div className="text-xs text-zinc-400">Nastav si nové prihlasovacie heslo</div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Nové heslo (min. 8 znakov)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required
              className="bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-zinc-500" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Zopakuj nové heslo</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required
              className="bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-zinc-500" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-white text-zinc-900 font-medium rounded-full hover:bg-zinc-100 transition-colors disabled:opacity-50">
            Uložiť heslo
          </button>
        </form>
        {status && (
          <div className={`mt-4 text-sm text-center ${status.kind === 'error' ? 'text-red-300' : status.kind === 'success' ? 'text-green-300' : 'text-zinc-400'}`}>
            {status.msg}
          </div>
        )}
      </div>
    </div>
  );
}
