import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const url = request.nextUrl;
  // /api/invoice-pdf and /api/payment-link allow ?token= unauthenticated; require auth only when id= used
  const isTokenisedApi =
    (path.startsWith('/api/invoice-pdf') && url.searchParams.has('token')) ||
    path.startsWith('/api/payment-link') ||
    path.startsWith('/api/send-invite');
  const isPublic = path.startsWith('/portal/') || path.startsWith('/invite/') || path.startsWith('/auth/callback') || path.startsWith('/auth/reset') || isTokenisedApi || path === '/' || path === '/terms' || path === '/privacy' || path === '/cookies' || path === '/contact' || path === '/pricing' || path === '/robots.txt' || path === '/sitemap.xml';
  const isAuthPage = path.startsWith('/login');
  const isProtectedPage = (path.startsWith('/dashboard') || path.startsWith('/api/')) && !path.startsWith('/api/portal') && !path.startsWith('/api/stripe') && !path.startsWith('/api/exchange-rates') && !path.startsWith('/api/validate-vat') && !path.startsWith('/api/validate-iban') && !path.startsWith('/api/health') && !path.startsWith('/api/csp-report') && !path.startsWith('/api/exchange-rates/sync') && !isTokenisedApi;
  if (isPublic) return supabaseResponse;

  if (!user && isProtectedPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
