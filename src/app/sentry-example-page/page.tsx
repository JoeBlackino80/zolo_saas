'use client';

import { useState } from 'react';

export default function SentryExamplePage() {
  const [status, setStatus] = useState<string | null>(null);

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Sentry test</h1>
      <p className="mb-6 text-slate-600">
        Klikni a chybu uvidíš v Sentry Issues do ~30 sekúnd. Po overení túto stránku zmaž.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          onClick={() => {
            throw new Error('ZOLO Sentry frontend test');
          }}
        >
          Frontend error
        </button>
        <button
          type="button"
          className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
          onClick={async () => {
            setStatus('Volám...');
            const r = await fetch('/sentry-example-api');
            setStatus(`HTTP ${r.status}`);
          }}
        >
          Backend error
        </button>
      </div>
      {status && <p className="mt-4 text-sm text-slate-500">{status}</p>}
    </div>
  );
}
