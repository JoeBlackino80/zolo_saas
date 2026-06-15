import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const sb = await createClient();
    const start = Date.now();
    // vat_rates is public reference data (no RLS lock for anon)
    const { error } = await sb.from('vat_rates').select('id', { count: 'exact', head: true });
    const dbLatency = Date.now() - start;
    return NextResponse.json({
      ok: true,
      service: 'ZOLO',
      version: '1.0.0',
      db: error ? 'error' : 'ok',
      db_latency_ms: dbLatency,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
