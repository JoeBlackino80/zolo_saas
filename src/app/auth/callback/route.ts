import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const type = url.searchParams.get('type');
  const next = url.searchParams.get('next') || (type === 'recovery' ? '/auth/reset' : '/dashboard');

  if (!code) {
    return NextResponse.redirect(new URL('/login?err=missing_code', url.origin));
  }

  const sb = await createClient();
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL('/login?err=' + encodeURIComponent(error.message), url.origin));
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
