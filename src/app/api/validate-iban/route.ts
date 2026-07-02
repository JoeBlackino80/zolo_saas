import { NextResponse, type NextRequest } from 'next/server';
import { validateIban } from '@/lib/pay-by-square';
import { rateLimit, getClientIp } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 100 validations/min per IP — public endpoint
export async function GET(request: NextRequest) {
  const rl = await rateLimit(`validate-iban:${getClientIp(request)}`, 100, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded' }, { status: 429 });
  }
  const iban = request.nextUrl.searchParams.get('iban') || '';
  const result = validateIban(iban);
  return NextResponse.json({ iban: iban.replace(/\s+/g, '').toUpperCase(), ...result });
}
