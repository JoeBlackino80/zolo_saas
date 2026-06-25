'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const IDLE_MS = 30 * 60 * 1000;
const WARNING_MS = 60 * 1000;

export default function IdleTimeout() {
  const router = useRouter();
  const [warning, setWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastReset = useRef(0);
  const warningRef = useRef(false);

  function reset() {
    const now = Date.now();
    if (now - lastReset.current < 1000) return;
    lastReset.current = now;
    if (warningRef.current) return;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(triggerWarning, IDLE_MS - WARNING_MS);
  }

  function triggerWarning() {
    warningRef.current = true;
    setWarning(true);
    setCountdown(60);
    warnTimer.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (warnTimer.current) clearInterval(warnTimer.current);
          forceLogout();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function forceLogout() {
    const sb = createClient();
    await sb.auth.signOut();
    router.replace('/login?reason=idle');
  }

  function stayLoggedIn() {
    if (warnTimer.current) clearInterval(warnTimer.current);
    warningRef.current = false;
    setWarning(false);
    reset();
  }

  useEffect(() => {
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (warnTimer.current) clearInterval(warnTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!warning) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Si tu ešte?</h3>
        <p className="text-sm text-slate-600 mb-5">
          Pre tvoju bezpečnosť ťa o <strong>{countdown}s</strong> odhlásime kvôli neaktivite.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={stayLoggedIn}
            className="flex-1 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-md hover:bg-slate-800"
          >
            Zostať prihlásený
          </button>
          <button
            onClick={forceLogout}
            className="flex-1 px-4 py-2 bg-slate-100 text-slate-900 text-sm font-semibold rounded-md hover:bg-slate-200"
          >
            Odhlásiť teraz
          </button>
        </div>
      </div>
    </div>
  );
}
