// Supabase Edge Function — poll email_queue → send via Resend
// Deploy: supabase functions deploy send-email --no-verify-jwt
// Schedule: trigger every 2 min via supabase Cron

import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM = Deno.env.get('EMAIL_FROM') || 'ZOLO <noreply@zolo.sk>';

Deno.serve(async () => {
  if (!RESEND_API_KEY) {
    return new Response('RESEND_API_KEY not configured', { status: 500 });
  }
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Fetch up to 20 pending emails
  const { data: queue, error } = await supabase
    .from('email_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(20);
  if (error) return new Response(error.message, { status: 500 });

  type QueueRow = { id: string; to_email: string; subject: string; body_html?: string; cc?: string; invoice_id?: string; from_email?: string };

  let sent = 0;
  let failed = 0;

  for (const row of (queue || []) as QueueRow[]) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: row.from_email || FROM,
          to: [row.to_email],
          cc: row.cc ? [row.cc] : undefined,
          subject: row.subject,
          html: row.body_html || '<p>Bez obsahu</p>',
        }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        await supabase.from('email_queue').update({ status: 'failed', error_message: t.slice(0, 500), updated_at: new Date().toISOString() }).eq('id', row.id);
        await supabase.from('email_log').insert([{ to_email: row.to_email, subject: row.subject, status: 'failed', error_message: t.slice(0, 500), invoice_id: row.invoice_id }]);
        failed++;
        continue;
      }
      const result = await resp.json();
      await supabase.from('email_queue').update({ status: 'sent', sent_at: new Date().toISOString(), provider_id: result.id }).eq('id', row.id);
      await supabase.from('email_log').insert([{ to_email: row.to_email, subject: row.subject, status: 'sent', provider_id: result.id, invoice_id: row.invoice_id }]);
      sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase.from('email_queue').update({ status: 'failed', error_message: msg.slice(0, 500), updated_at: new Date().toISOString() }).eq('id', row.id);
      failed++;
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, failed, processed: sent + failed }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
