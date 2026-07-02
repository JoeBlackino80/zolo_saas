import { NextResponse, type NextRequest } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/ratelimit';

// GET /api/validate-vat?vat=SK1234567890
// Validates EU VAT ID via VIES (VAT Information Exchange System)
// Rate limited: 60/min per IP — VIES is slow, prevent abuse.
export async function GET(request: NextRequest) {
  const rl = await rateLimit(`validate-vat:${getClientIp(request)}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ ok: false, error: 'Rate limit exceeded' }, { status: 429 });

  const vat = (request.nextUrl.searchParams.get('vat') || '').toUpperCase().replace(/\s/g, '');
  if (!vat || vat.length < 8) return NextResponse.json({ ok: false, error: 'Invalid VAT format' }, { status: 400 });

  const country = vat.slice(0, 2);
  const number = vat.slice(2);

  try {
    const resp = await fetch(`https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${country}/vat/${number}`, {
      headers: { Accept: 'application/json' },
    });
    if (!resp.ok) return NextResponse.json({ ok: false, error: 'VIES service unavailable' }, { status: 502 });
    const data = await resp.json();
    return NextResponse.json({
      ok: true,
      valid: data.isValid === true,
      country: data.countryCode,
      number: data.vatNumber,
      name: data.name,
      address: data.address,
      requestDate: data.requestDate,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
