'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

// Detects stale/broken auth state (Invalid Refresh Token, wiped user, etc.)
// and self-heals by clearing local session artefacts + redirecting to /login.
// Runs on every page as part of the root layout.

function purgeLocalAuth() {
  if (typeof window === 'undefined') return;
  try {
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('sb-') || k === 'zolo_firm') localStorage.removeItem(k);
    });
    document.cookie.split(';').forEach((c) => {
      const eq = c.indexOf('=');
      const name = (eq > -1 ? c.substring(0, eq) : c).trim();
      if (name.startsWith('sb-')) {
        const expire = `${name}=; Max-Age=0; path=/`;
        document.cookie = expire;
        document.cookie = `${expire}; domain=.zolo.sk`;
        document.cookie = `${expire}; domain=${location.hostname}`;
      }
    });
  } catch {
    // best-effort — ignore
  }
}

async function forceReauth(reason: string) {
  purgeLocalAuth();
  const path = window.location.pathname;
  const isPublic = path === '/' || path.startsWith('/login') || path.startsWith('/register') || path.startsWith('/pricing') || path.startsWith('/contact') || path.startsWith('/docs') || path.startsWith('/help') || path.startsWith('/dpa') || path.startsWith('/portal');
  if (!isPublic) {
    window.location.href = `/login?reason=${encodeURIComponent(reason)}`;
  }
}

export default function AuthResilience() {
  useEffect(() => {
    const sb = createClient();

    // 1) On mount — probe session. If Supabase returns an error (stale refresh
    //    token) or a refresh silently fails, clean up.
    (async () => {
      try {
        const { error } = await sb.auth.getSession();
        if (error && /refresh.*token|jwt|invalid/i.test(error.message)) {
          await forceReauth('stale_session');
        }
      } catch {
        // ignore
      }
    })();

    // 2) Global fetch wrapper — catch any Supabase auth call returning
    //    stale-session signals mid-session and clean up.
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      try {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
        if (!url || !/\/auth\/v1\//.test(url)) return res;
        // 400 on /token = refresh token gone
        if (res.status === 400 && /\/auth\/v1\/token/.test(url)) {
          const text = await res.clone().text();
          if (/refresh.*token.*not.*found|invalid.*refresh/i.test(text)) {
            await forceReauth('refresh_expired');
          }
        }
        // 403 on /user = access token references a session that no longer exists
        // (typical after signOut then a stale in-memory client keeps polling).
        if (res.status === 403 && /\/auth\/v1\/user/.test(url)) {
          const text = await res.clone().text();
          if (/session.*doesn.*t?.*exist|session.*not.*found/i.test(text)) {
            await forceReauth('session_gone');
          }
        }
      } catch {
        // ignore parse errors
      }
      return res;
    };

    // 3) Auth state listener — TOKEN_REFRESHED without a session = refresh failed
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && !session) {
        forceReauth('refresh_failed');
      }
    });

    return () => {
      sub.subscription.unsubscribe();
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
