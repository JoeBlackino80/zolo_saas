import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public endpoint — anyone (incl. external cron) can trigger ECB daily-rate sync.
// Uses ECB Eurofxref daily XML. Rates are EUR-based (1 EUR = X CCY).
export async function GET() {
  try {
    const r = await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', {
      cache: 'no-store',
      headers: { 'User-Agent': 'ZOLO/1.0' },
    });
    if (!r.ok) return NextResponse.json({ ok: false, error: `ECB returned ${r.status}` }, { status: 502 });
    const xml = await r.text();

    // Parse <Cube time="YYYY-MM-DD"> and child <Cube currency="USD" rate="1.0815"/>
    const timeMatch = xml.match(/Cube\s+time=["']([\d-]+)["']/);
    const rateDate = timeMatch?.[1];
    if (!rateDate) return NextResponse.json({ ok: false, error: 'ECB XML date not found' }, { status: 502 });

    const rates: { currency: string; rate: number }[] = [];
    const re = /Cube\s+currency=["']([A-Z]{3})["']\s+rate=["']([\d.]+)["']/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
      rates.push({ currency: m[1], rate: parseFloat(m[2]) });
    }
    if (rates.length === 0) return NextResponse.json({ ok: false, error: 'No rates parsed' }, { status: 502 });

    const sb = await createClient();
    const rows = rates.map((x) => ({
      rate_date: rateDate,
      currency: x.currency,
      eur_rate: x.rate,
      source: 'ECB',
    }));

    const { error } = await sb.from('exchange_rates').upsert(rows, { onConflict: 'rate_date,currency,source', ignoreDuplicates: true });
    if (error) {
      // Fallback: try insert without onConflict (column shape may differ)
      const { error: err2 } = await sb.from('exchange_rates').insert(rows);
      if (err2) return NextResponse.json({ ok: false, error: err2.message, rates: rows.length }, { status: 500 });
    }

    return NextResponse.json({ ok: true, date: rateDate, rates: rows.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
