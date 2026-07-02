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
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
      <div className="max-w-md text-center bg-white rounded-2xl border border-zinc-200 shadow-lg p-8">
        <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} />
        </div>
        <h1 className="text-xl font-bold text-zinc-900">Niečo sa pokazilo</h1>
        <p className="text-sm text-zinc-600 mt-2">{error.message || 'Neznáma chyba'}</p>
        {error.digest && <p className="text-xs text-zinc-400 mt-2 font-mono">Chybový kód: {error.digest}</p>}
        <div className="mt-6 flex gap-2 justify-center">
          <button onClick={reset} className="px-4 py-2 bg-zinc-500 text-white rounded-lg text-sm font-semibold hover:bg-zinc-800">
            Skúsiť znova
          </button>
          <Link href="/dashboard" className="px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg text-sm font-semibold hover:bg-zinc-200">
            Späť na dashboard
          </Link>
        </div>
        <p className="text-xs text-zinc-500 mt-6">
          Ak chyba pretrváva, napíš nám na <a href="mailto:support@zolo.sk" className="text-zinc-900 hover:underline">support@zolo.sk</a>
        </p>
      </div>
    </div>
  );
}
