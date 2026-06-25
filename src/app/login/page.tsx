'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [status, setStatus] = useState<{ msg: string; kind: 'error' | 'success' | 'muted' } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get('reason');
    if (reason === 'idle') {
      setStatus({ msg: 'Odhlásili sme ťa kvôli neaktivite. Prihlás sa znova.', kind: 'muted' });
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus({ msg: 'Prihlasujem…', kind: 'muted' });
    const sb = createClient();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus({ msg: 'Chyba: ' + error.message, kind: 'error' });
      setLoading(false);
      return;
    }
    const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === 'aal2' && aal.currentLevel === 'aal1') {
      const { data: factors } = await sb.auth.mfa.listFactors();
      const factor = factors?.totp?.find((f) => f.status === 'verified') || factors?.totp?.[0];
      if (factor) {
        setMfaFactorId(factor.id);
        setRequiresMfa(true);
        setStatus(null);
        setLoading(false);
        return;
      }
    }
    setStatus({ msg: '✓ Prihlásený', kind: 'success' });
    router.push('/dashboard');
    router.refresh();
  }

  async function handleMfa(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const sb = createClient();
    try {
      const { data: ch, error: chErr } = await sb.auth.mfa.challenge({ factorId: mfaFactorId });
      if (chErr) throw chErr;
      const { error } = await sb.auth.mfa.verify({ factorId: mfaFactorId, challengeId: ch.id, code: mfaCode });
      if (error) throw error;
      router.push('/dashboard');
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus({ msg: 'Nesprávny kód: ' + msg, kind: 'error' });
      setLoading(false);
    }
  }

  async function handleForgot() {
    if (!email) { setStatus({ msg: 'Zadaj svoj email a klikni znova', kind: 'error' }); return; }
    setLoading(true);
    setStatus({ msg: 'Posielam email na obnovu hesla…', kind: 'muted' });
    const sb = createClient();
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
    });
    setLoading(false);
    if (error) { setStatus({ msg: 'Chyba: ' + error.message, kind: 'error' }); return; }
    setStatus({ msg: '✓ Ak účet existuje, poslali sme email s odkazom na obnovu hesla.', kind: 'success' });
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setStatus({ msg: 'Heslo aspoň 8 znakov', kind: 'error' });
      return;
    }
    setLoading(true);
    setStatus({ msg: 'Vytváram účet…', kind: 'muted' });
    const sb = createClient();
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });
    if (error) {
      setStatus({ msg: 'Chyba: ' + error.message, kind: 'error' });
      setLoading(false);
      return;
    }
    // Email confirmation OFF in Supabase → session is created immediately. Go straight to onboarding.
    if (data.session) {
      setStatus({ msg: '✓ Účet vytvorený, presmerovávam…', kind: 'success' });
      router.push('/onboarding');
      router.refresh();
      return;
    }
    // Email confirmation ON → wait for user to click link in mail
    setStatus({ msg: '✓ Účet vytvorený. Skontroluj email pre potvrdenie a potom sa prihlás.', kind: 'success' });
    setMode('login');
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-200">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_30%,rgba(59,130,246,0.15)_0%,transparent_50%),radial-gradient(circle_at_80%_70%,rgba(139,92,246,0.12)_0%,transparent_50%)]" />
      <div className="relative w-full max-w-md bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-9 shadow-2xl">
        <div className="flex items-center gap-3 mb-7">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-extrabold text-2xl tracking-tighter shadow-lg shadow-blue-500/30">
            Z
          </div>
          <div>
            <div className="text-xl font-bold text-white tracking-tight">ZOLO</div>
            <div className="text-xs text-slate-400">Slovak Tax & Accounting Platform</div>
          </div>
        </div>

        <div className="bg-black/25 p-1 rounded-lg flex gap-1 mb-5">
          <button
            type="button"
            onClick={() => { setMode('login'); setRequiresMfa(false); setStatus(null); }}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${mode === 'login' ? 'bg-white/10 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Prihlásiť
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setRequiresMfa(false); setStatus(null); }}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${mode === 'signup' ? 'bg-white/10 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Registrácia
          </button>
        </div>

        {requiresMfa ? (
          <form onSubmit={handleMfa} className="space-y-3">
            <div className="text-center mb-4">
              <div className="text-base font-semibold text-white">Dvojfaktorová autentifikácia</div>
              <div className="text-xs text-slate-400 mt-1">Zadaj 6-ciferný kód z autentikátora</div>
            </div>
            <input
              type="text"
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-center text-2xl tracking-[0.5em] font-mono text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={loading || mfaCode.length !== 6}
              className="w-full py-3 bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/25 hover:translate-y-[-1px] transition disabled:opacity-50"
            >
              Overiť kód
            </button>
          </form>
        ) : mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-3">
            <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
            <Field label="Heslo" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/25 hover:translate-y-[-1px] transition disabled:opacity-50"
            >
              Prihlásiť sa
            </button>
            <div className="text-center">
              <button type="button" onClick={handleForgot} className="text-xs text-slate-400 hover:text-blue-300 underline">
                Zabudol som heslo
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-3">
            <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
            <Field label="Heslo (min. 8 znakov)" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/25 hover:translate-y-[-1px] transition disabled:opacity-50"
            >
              Vytvoriť účet
            </button>
          </form>
        )}

        {status && (
          <div
            className={`mt-4 text-sm text-center ${
              status.kind === 'error' ? 'text-red-300' : status.kind === 'success' ? 'text-green-300' : 'text-slate-400'
            }`}
          >
            {status.msg}
          </div>
        )}

        <div className="text-center text-xs text-slate-500 mt-6">
          Šifrované cez Supabase · GDPR compliant · Hostované v EÚ
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className="bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-blue-500 focus:bg-black/40 transition"
      />
    </div>
  );
}
