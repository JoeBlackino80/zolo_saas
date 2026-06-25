'use client';

import { useState, useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function SentryExamplePage() {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const client = Sentry.getClient();
    console.log('[Sentry test] client:', client ? 'initialized' : 'NOT INITIALIZED', client?.getOptions());
  }, []);

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Sentry test</h1>
      <p className="mb-6 text-slate-600">
        Klikni a chybu uvidíš v Sentry Issues do ~30 sekúnd. Po overení túto stránku zmaž.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          onClick={() => {
            try {
              throw new Error('ZOLO Sentry frontend test (explicit capture)');
            } catch (e) {
              const id = Sentry.captureException(e);
              setStatus(`captureException → event id: ${id}`);
            }
          }}
        >
          Frontend error (explicit)
        </button>
        <button
          type="button"
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          onClick={() => {
            const id = Sentry.captureMessage('ZOLO Sentry test message', 'info');
            setStatus(`captureMessage → event id: ${id}`);
          }}
        >
          Send test message
        </button>
        <button
          type="button"
          className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
          onClick={async () => {
            setStatus('Volám /sentry-example-api...');
            const r = await fetch('/sentry-example-api');
            setStatus(`HTTP ${r.status}`);
          }}
        >
          Backend error
        </button>
      </div>
      {status && <p className="mt-4 text-sm font-mono text-slate-700 break-all">{status}</p>}
    </div>
  );
}
