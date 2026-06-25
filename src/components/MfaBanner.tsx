'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, X } from 'lucide-react';

const KEY = 'zolo_mfa_banner_until';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export default function MfaBanner({ mfaEnabled }: { mfaEnabled: boolean }) {
  const [hide, setHide] = useState(true);

  useEffect(() => {
    if (mfaEnabled) return;
    const until = Number(localStorage.getItem(KEY) || 0);
    if (Date.now() < until) return;
    setHide(false);
  }, [mfaEnabled]);

  if (mfaEnabled || hide) return null;

  function snooze() {
    localStorage.setItem(KEY, String(Date.now() + SNOOZE_MS));
    setHide(true);
  }

  return (
    <div className="mx-4 sm:mx-8 mt-4 mb-2 p-3 sm:p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start sm:items-center gap-3 text-amber-900">
      <ShieldAlert size={18} className="shrink-0 mt-0.5 sm:mt-0" />
      <div className="flex-1 text-sm">
        <strong>Účet nemá MFA.</strong>{' '}
        Pre prácu s citlivými finančnými údajmi odporúčame aktivovať dvojfaktorové overenie.
      </div>
      <div className="flex gap-2 shrink-0">
        <Link
          href="/dashboard/profile"
          className="px-3 py-1.5 bg-amber-600 text-white text-sm font-semibold rounded-md hover:bg-amber-700"
        >
          Aktivovať
        </Link>
        <button
          onClick={snooze}
          className="px-2 py-1.5 text-amber-700 hover:bg-amber-100 rounded-md"
          aria-label="Odložiť na 7 dní"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
