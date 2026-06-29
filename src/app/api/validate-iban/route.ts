import { NextResponse } from 'next/server';
import { validateIban } from '@/lib/pay-by-square';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const iban = url.searchParams.get('iban') || '';
  const result = validateIban(iban);
  return NextResponse.json({ iban: iban.replace(/\s+/g, '').toUpperCase(), ...result });
}
