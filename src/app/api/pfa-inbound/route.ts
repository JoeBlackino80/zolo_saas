import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Inbound email webhook pre auto-import PFA priamo z emailu.
//
// Setup:
//   1. V Resend / Postmark / Mailgun nastav inbound routing pre
//      pfa@<company>.zolo.sk → POST na tento endpoint.
//   2. Konfiguruj webhook secret v env WEBHOOK_INBOUND_SECRET.
//   3. Payload obsahuje: from, to, subject, text, html, attachments[].
//   4. Endpoint prejde attachments (PDF/JPG), extrahuje cez Claude
//      Vision (rovnaká logika ako /api/ai-extract-invoice) a založí
//      PFA v tabuľke invoices pre company podľa "to" domény.
//
// STUB — funkcionalita nie je zapnutá.
//
// Prečo stub:
//   Vyžaduje setup inbound routingu vo Vercel Domain + email
//   servery. Musíš mať vlastnú doménu s MX záznamom na Resend.
//   Až po tomto konfigu spustíš full implementation.
//
// Ak si to chceš aktivovať:
//   1. Registruj custom subdoménu pfa.zolo.sk s MX → Resend.
//   2. V Resend Inbound → Add domain → Set forward URL na
//      https://app.zolo.sk/api/pfa-inbound.
//   3. Odkomentuj implementáciu nižšie + nastav
//      WEBHOOK_INBOUND_SECRET env var.
export async function POST(req: NextRequest) {
  const secret = process.env.WEBHOOK_INBOUND_SECRET;
  if (!secret) {
    return NextResponse.json({
      ok: false,
      error: 'Endpoint not activated. Nastav WEBHOOK_INBOUND_SECRET a inbound routing v Resend/Postmark.',
      docs: 'https://app.zolo.sk/docs',
    }, { status: 501 });
  }

  const auth = req.headers.get('x-inbound-secret') || '';
  if (auth !== secret) {
    return NextResponse.json({ ok: false, error: 'Invalid webhook signature' }, { status: 401 });
  }

  // Payload je závislý od email služby (Resend vs Postmark rozdielny formát)
  // TODO: parsovať from, to, attachments podľa vybraného providera
  // TODO: extrahovať company_id z "to" (napr. pfa@sorbxt.zolo.sk → sorbxt)
  // TODO: fetch base64 z attachments (Resend URLs, Postmark base64)
  // TODO: volať interne /api/ai-extract-invoice logiku a založiť PFA
  return NextResponse.json({
    ok: true,
    stub: true,
    message: 'Inbound email received but processing is not yet implemented.',
  });
}
