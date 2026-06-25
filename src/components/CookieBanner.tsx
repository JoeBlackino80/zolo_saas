'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

type Choice = 'accepted' | 'essential';

const STORAGE_KEY = 'zolo_cookies';

export function getCookieConsent(): Choice | null {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'accepted' || v === 'essential' ? v : null;
}

export default function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!getCookieConsent()) setOpen(true);
  }, []);

  function decide(choice: Choice) {
    localStorage.setItem(STORAGE_KEY, choice);
    setOpen(false);
    window.dispatchEvent(new CustomEvent('zolo:cookie-consent', { detail: choice }));
  }

  if (!open) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-sm z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-5">
      <button
        onClick={() => decide('essential')}
        className="absolute top-3 right-3 text-slate-400 hover:text-slate-700"
        aria-label="Zavrieť"
      >
        <X size={16} />
      </button>
      <h3 className="font-semibold text-slate-900 mb-1.5">Cookies</h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        Používame iba nevyhnutné cookies pre prihlásenie. V budúcnosti môžeme pridať analytiku — vtedy si vyžiadame tvoj súhlas znova. Detaily v{' '}
        <Link href="/cookies" className="text-blue-600 hover:underline">Cookies politike</Link>.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => decide('accepted')}
          className="flex-1 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-md hover:bg-slate-800"
        >
          Akceptovať
        </button>
        <button
          onClick={() => decide('essential')}
          className="flex-1 px-4 py-2 bg-slate-100 text-slate-900 text-sm font-semibold rounded-md hover:bg-slate-200"
        >
          Iba nevyhnutné
        </button>
      </div>
    </div>
  );
}
