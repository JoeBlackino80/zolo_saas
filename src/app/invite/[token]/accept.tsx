'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function AcceptButton({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ msg: string; kind: 'error' | 'success' } | null>(null);

  async function accept() {
    setLoading(true);
    setStatus(null);
    const sb = createClient();
    const { data, error } = await sb.rpc('accept_team_invitation', { p_token: token });
    if (error) {
      setStatus({ msg: 'Nepodarilo sa: ' + error.message, kind: 'error' });
      setLoading(false);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.out_company_id && typeof window !== 'undefined') localStorage.setItem('zolo_firm', row.out_company_id);
    setStatus({ msg: `✓ Si v tíme firmy ${row?.out_company_name || ''}. Presmerovávam…`, kind: 'success' });
    setTimeout(() => { router.push('/dashboard'); router.refresh(); }, 800);
  }

  return (
    <>
      <button
        onClick={accept}
        disabled={loading}
        className="w-full mt-5 py-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-semibold rounded-lg disabled:opacity-50"
      >
        {loading ? 'Prijímam…' : 'Prijať pozvánku'}
      </button>
      {status && (
        <div className={`mt-3 text-sm text-center ${status.kind === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{status.msg}</div>
      )}
    </>
  );
}
