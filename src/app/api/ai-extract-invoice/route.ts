import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type ExtractedInvoice = {
  number?: string;
  date?: string;
  partnerName?: string;
  partnerIco?: string;
  partnerDic?: string;
  partnerIcDph?: string;
  partnerStreet?: string;
  partnerCity?: string;
  partnerZip?: string;
  subtotal?: number;
  vatAmount?: number;
  total?: number;
  currency?: string;
  vatRate?: number;
  items?: { description: string; quantity: number; unit_price: number; vat_rate: number }[];
  kind?: 'in' | 'out';
  dueDate?: string;
  variableSymbol?: string;
  iban?: string;
  confidence?: 'high' | 'medium' | 'low';
};

const PROMPT = `Si expert na slovenské účtovníctvo. Analyzuj túto faktúru alebo účtenku a vráť IBA JSON (žiadny markdown ani text okolo):

{
  "number": "číslo faktúry alebo účtenky",
  "date": "YYYY-MM-DD dátum vystavenia",
  "dueDate": "YYYY-MM-DD dátum splatnosti (ak je uvedený)",
  "variableSymbol": "variabilný symbol (ak je)",
  "partnerName": "názov firmy ktorá vystavila (dodávateľ z pohľadu nášho čitatelia)",
  "partnerIco": "IČO 8 číslic",
  "partnerDic": "DIČ",
  "partnerIcDph": "IČ DPH začínajúce SK, CZ atď.",
  "partnerStreet": "ulica dodávateľa",
  "partnerCity": "mesto",
  "partnerZip": "PSČ",
  "iban": "IBAN účtu na ktorý sa má platit",
  "subtotal": číslo (základ dane bez DPH),
  "vatAmount": číslo (suma DPH),
  "total": číslo (suma celkom vrátane DPH),
  "currency": "EUR / CZK / USD",
  "vatRate": číslo (23, 19, 10 alebo 0),
  "items": [{"description":"...","quantity":1,"unit_price":0,"vat_rate":23}],
  "kind": "in",
  "confidence": "high | medium | low",
  "suggestedAccount": "504 | 518 | 511 | 512 | 513 | 501 | 132 (predkontácia)",
  "suggestedAccountReason": "krátke vysvetlenie prečo tento účet"
}

kind je vždy "in" (my sme príjemca).
Ak nejaké pole nie je viditeľné, dá null.
Sumy sú čísla bez menových značiek (napr. 123.45).
Ak sú položky nečitateľné, items môže byť prázdny [] a použiješ len subtotal/vatAmount/total.
Ak je viac položiek s rôznymi DPH sadzbami, items zoznam ich detailizuje.

Predkontácia (suggestedAccount) — vyber najvhodnejší účet MD podľa
podnikania:
  504 — Predaný tovar (obchodné firmy)
  518 — Ostatné služby (IT, poradenstvo, telko, marketing)
  511 — Opravy a udržiavanie
  512 — Cestovné (letenka, hotel, taxík)
  513 — Reprezentácia (obed s klientom, kvety)
  501 — Spotreba materiálu (kancelárske potreby)
  132 — Tovar na sklade (nákup na predaj)
Vyber JEDEN kód podľa dominantného charakteru dokladu.`;

async function extractOne(base64: string, mediaType: string): Promise<ExtractedInvoice> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const contentBlock = mediaType === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: mediaType, data: base64 } }
    : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: [contentBlock, { type: 'text', text: PROMPT }] }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API ${res.status}: ${err.slice(0, 200)}`);
  }
  const j = await res.json();
  const text = (j.content?.[0]?.text || '').replace(/```json|```/g, '').trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Claude nevrátil validný JSON');
  return JSON.parse(match[0]);
}

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  // Rate limit — max 20 extractions/min per user (Claude cost control)
  const rl = await rateLimit(`ai-extract:${user.id}:${getClientIp(req)}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Rate limit exceeded — max 20 spracovaní za minútu' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) } }
    );
  }

  let body: { files?: { name: string; base64: string; mediaType: string }[] };
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }); }

  const files = body.files || [];
  if (files.length === 0) return NextResponse.json({ ok: false, error: 'Žiadne súbory' }, { status: 400 });
  if (files.length > 10) return NextResponse.json({ ok: false, error: 'Max 10 súborov naraz' }, { status: 400 });

  const results: { file: string; data?: ExtractedInvoice; error?: string }[] = [];
  for (const f of files) {
    try {
      const data = await extractOne(f.base64, f.mediaType || 'image/jpeg');
      results.push({ file: f.name, data });
    } catch (e) {
      results.push({ file: f.name, error: (e as Error).message });
    }
  }

  return NextResponse.json({ ok: true, results });
}
