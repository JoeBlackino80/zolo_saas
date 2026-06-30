import { createClient as createServerClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

type WebhookTarget = { id: string; url: string; secret: string | null };

// Fire-and-forget POST to all configured webhook URLs for a company+event.
// Logs each attempt into webhook_deliveries.
export async function fireWebhook(
  companyId: string,
  event: string,
  payload: Record<string, unknown>,
  sb?: SupabaseClient,
): Promise<void> {
  const client = sb || (await createServerClient());
  const { data: targets } = await client.rpc('webhook_targets', { p_company_id: companyId, p_event: event });
  const list = (targets as WebhookTarget[]) || [];
  if (list.length === 0) return;

  const body = JSON.stringify({ event, company_id: companyId, ts: new Date().toISOString(), data: payload });
  await Promise.all(list.map(async (t) => {
    if (!t.url) return;
    let status = 0, respBody = '', success = false;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Zolo-Event': event };
      if (t.secret) {
        // HMAC-SHA256 signature
        const enc = new TextEncoder();
        const keyBytes = enc.encode(t.secret);
        const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(body));
        headers['X-Zolo-Signature'] = 'sha256=' + Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
      }
      const r = await fetch(t.url, { method: 'POST', headers, body, signal: AbortSignal.timeout(8000) });
      status = r.status;
      respBody = (await r.text()).slice(0, 2000);
      success = r.ok;
    } catch (e) {
      respBody = e instanceof Error ? e.message : String(e);
    }
    await client.from('webhook_deliveries').insert({
      webhook_config_id: t.id,
      event,
      payload: { event, data: payload },
      response_status: status,
      response_body: respBody,
      success,
      delivered_at: new Date().toISOString(),
    });
  }));
}
