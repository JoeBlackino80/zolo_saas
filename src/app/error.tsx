'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { captureError } from '@/lib/monitoring';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureError(error, { tags: { digest: error.digest || 'unknown' } });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md text-center bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
        <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Niečo sa pokazilo</h1>
        <p className="text-sm text-slate-600 mt-2">{error.message || 'Neznáma chyba'}</p>
        {error.digest && <p className="text-xs text-slate-400 mt-2 font-mono">Chybový kód: {error.digest}</p>}
        <div className="mt-6 flex gap-2 justify-center">
          <button onClick={reset} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600">
            Skúsiť znova
          </button>
          <Link href="/dashboard" className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200">
            Späť na dashboard
          </Link>
        </div>
        <p className="text-xs text-slate-500 mt-6">
          Ak chyba pretrváva, napíš nám na <a href="mailto:support@zolo.sk" className="text-blue-600 hover:underline">support@zolo.sk</a>
        </p>
      </div>
    </div>
  );
}
