import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/exchange-rates?date=YYYY-MM-DD&base=EUR
// Fetches ECB rates and stores in exchange_rates table
export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const base = url.searchParams.get('base') || 'EUR';

  const sb = await createClient();

  // Check cache first
  const { data: cached } = await sb
    .from('exchange_rates')
    .select('*')
    .eq('rate_date', date)
    .eq('base_currency', base);
  if (cached && cached.length > 0) {
    return NextResponse.json({ ok: true, cached: true, rates: cached });
  }

  // Fetch from Frankfurter API (ECB rates)
  try {
    const r = await fetch(`https://api.frankfurter.app/${date}?from=${base}`);
    if (!r.ok) throw new Error('Frankfurter API ' + r.status);
    const data = await r.json();
    const rates = data.rates as Record<string, number>;
    const rows = Object.entries(rates).map(([currency, rate]) => ({
      rate_date: date,
      base_currency: base,
      target_currency: currency,
      rate,
    }));
    if (rows.length > 0) {
      const { error } = await sb.from('exchange_rates').insert(rows);
      if (error) console.warn('Cache fail:', error.message);
    }
    return NextResponse.json({ ok: true, cached: false, rates: rows });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
