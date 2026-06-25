// Scheduled daily: send polite/firm payment reminders via Resend.
// Schedule: 0 8 * * * (8 AM UTC) via supabase cron.
// Reminder kinds:
//   1: 3 days before due — polite ("Dovoľte mi pripomenúť...")
//   2: on due date — gentle ("Faktúra je dnes splatná")
//   3: 7 days overdue — firm ("Po splatnosti")
//   4: 30 days overdue — final ("Posledná pripomienka")

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'ZOLO <noreply@zolo.sk>';
const APP_URL = Deno.env.get('APP_URL') || 'https://zolo.sk';

interface Row { id: string; company_id: string; number: string; total: number; currency: string; due_date: string; customer_email: string; customer_name: string | null; sent_to: string | null }

const TEMPLATES: Record<number, { subject: (n: string) => string; intro: (n: string, dueDate: string, daysDelta: number) => string; tone: string }> = {
  1: {
    subject: (n) => `Pripomienka — faktúra ${n} bude splatná o 3 dni`,
    intro: (n, due) => `dovoľte mi zdvorilo pripomenúť, že faktúra <strong>${n}</strong> bude splatná <strong>${due}</strong>. Ak je všetko v poriadku, môžete platbu vybaviť priamo cez odkaz nižšie.`,
    tone: 'friendly',
  },
  2: {
    subject: (n) => `Faktúra ${n} je dnes splatná`,
    intro: (n) => `pripomíname Vám, že faktúra <strong>${n}</strong> je <strong>dnes splatná</strong>. Platbu môžete jednoducho zaslať cez odkaz nižšie.`,
    tone: 'friendly',
  },
  3: {
    subject: (n) => `Faktúra ${n} je po splatnosti`,
    intro: (n, _due, daysDelta) => `faktúra <strong>${n}</strong> je <strong>${daysDelta} dní po splatnosti</strong>. Prosíme o jej urgentné uhradenie. Ak ste platbu už realizovali, prosím ignorujte túto správu.`,
    tone: 'firm',
  },
  4: {
    subject: (n) => `Posledná pripomienka — faktúra ${n}`,
    intro: (n, _due, daysDelta) => `faktúra <strong>${n}</strong> je <strong>${daysDelta} dní po splatnosti</strong>. Toto je posledná pripomienka pred postúpením pohľadávky na vymáhanie. Prosíme o okamžitú úhradu.`,
    tone: 'final',
  },
};

function fmtDate(d: string): string {
  const [y, m, day] = d.split('-');
  return `${day}. ${m}. ${y}`;
}
function fmtMoney(n: number, currency: string): string {
  return `${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace('.', ',')} ${currency}`;
}
function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function renderEmail(supabase: ReturnType<typeof createClient>, inv: Row, kind: number): Promise<{ subject: string; html: string }> {
  // Re-use existing portal token if there's a fresh one; otherwise create
  const { data: existing } = await supabase
    .from('portal_tokens')
    .select('token, expires_at')
    .eq('invoice_id', inv.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let portalToken: string;
  if (existing && existing.expires_at && new Date(existing.expires_at as string) > new Date(Date.now() + 7 * 86400 * 1000)) {
    portalToken = existing.token as string;
  } else {
    portalToken = randomToken();
    await supabase.from('portal_tokens').insert({
      token: portalToken, invoice_id: inv.id, company_id: inv.company_id,
      expires_at: new Date(Date.now() + 60 * 86400 * 1000).toISOString(),
    });
  }
  const portalUrl = `${APP_URL}/portal/${portalToken}`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(inv.due_date);
  const daysDelta = Math.abs(Math.floor((today.getTime() - due.getTime()) / 86400000));
  const t = TEMPLATES[kind];
  const subject = t.subject(inv.number);
  const intro = t.intro(inv.number, fmtDate(inv.due_date), daysDelta);
  const ctaColor = t.tone === 'final' ? '#dc2626' : t.tone === 'firm' ? '#b45309' : '#2563eb';
  const ctaBg = t.tone === 'final' ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : t.tone === 'firm' ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#3b82f6,#a855f7)';

  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#0f172a;line-height:1.55">
    <div style="display:inline-block;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#3b82f6,#a855f7);color:#fff;font-weight:800;font-size:24px;text-align:center;line-height:48px;margin-bottom:24px">Z</div>
    <h1 style="font-size:18px;margin:0 0 16px 0;color:${ctaColor}">${subject}</h1>
    <p>Dobrý deň${inv.customer_name ? ', ' + inv.customer_name : ''},</p>
    <p>${intro}</p>
    <p style="margin:28px 0;text-align:center">
      <a href="${portalUrl}" style="display:inline-block;padding:14px 28px;background:${ctaBg};color:#fff;text-decoration:none;border-radius:10px;font-weight:600">Zobraziť faktúru &amp; zaplatiť · ${fmtMoney(inv.total, inv.currency || 'EUR')}</a>
    </p>
    <p style="color:#64748b;font-size:13px">Po zaplatení sa stav automaticky aktualizuje a viac pripomienok nepríde. Ak ste platbu už uhradili a tento email Vám prišiel chybou, ospravedlňujeme sa.</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
    <p style="color:#94a3b8;font-size:12px;text-align:center">Odoslané cez <a href="https://zolo.sk" style="color:#94a3b8">ZOLO</a></p>
  </div>`;
  return { subject, html };
}

async function sendOne(supabase: ReturnType<typeof createClient>, inv: Row, kind: number): Promise<{ ok: boolean; error?: string; providerId?: string }> {
  const { subject, html } = await renderEmail(supabase, inv, kind);
  const to = inv.customer_email || inv.sent_to || '';
  if (!to) return { ok: false, error: 'no recipient' };
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  });
  const j = await r.json();
  if (!r.ok || !j.id) return { ok: false, error: j?.message || `HTTP ${r.status}` };
  // Mark sent + log
  await supabase.rpc('mark_reminder_sent', { p_invoice_id: inv.id, p_kind: kind });
  await supabase.from('email_queue').insert({
    company_id: inv.company_id, to_email: to, subject, body_html: html,
    status: 'sent', invoice_id: inv.id, from_email: EMAIL_FROM, provider_id: j.id, sent_at: new Date().toISOString(),
  });
  return { ok: true, providerId: j.id };
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const stats = { kind1: 0, kind2: 0, kind3: 0, kind4: 0, errors: [] as string[] };
  for (const kind of [1, 2, 3, 4]) {
    const { data, error } = await supabase.rpc('invoices_needing_reminder', { p_kind: kind });
    if (error) { stats.errors.push(`kind ${kind}: ${error.message}`); continue; }
    const rows = (data || []) as Row[];
    for (const inv of rows) {
      const res = await sendOne(supabase, inv, kind);
      if (res.ok) stats[`kind${kind}` as 'kind1' | 'kind2' | 'kind3' | 'kind4']++;
      else stats.errors.push(`inv ${inv.number}: ${res.error}`);
    }
  }
  return new Response(JSON.stringify({ ok: true, ...stats, at: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
