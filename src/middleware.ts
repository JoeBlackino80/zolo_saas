import { NextRequest, NextResponse } from 'next/server';

const APP_PATHS = ['/dashboard', '/onboarding', '/auth', '/login', '/register', '/reset'];

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const path = req.nextUrl.pathname;

  const isMarketingHost = host === 'zolo.sk' || host === 'www.zolo.sk';
  const isAppPath = APP_PATHS.some((p) => path === p || path.startsWith(p + '/'));

  if (isMarketingHost && isAppPath) {
    const url = req.nextUrl.clone();
    url.host = 'app.zolo.sk';
    url.protocol = 'https:';
    url.port = '';
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|_vercel|api|.*\\..*).*)'],
};
