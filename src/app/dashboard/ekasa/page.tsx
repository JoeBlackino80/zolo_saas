import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardHeader, Badge, EmptyState } from '@/components/ui';
import { Receipt, AlertCircle, ExternalLink } from 'lucide-react';
import { fmtEur, fmtDate } from '@/lib/utils';

export default async function EkasaPage() {
  const sb = await createClient();
  const { data: devices } = await sb.from('ekasa_devices').select('id, device_id, location, status, last_sync_at, companies(name)');
  const { data: receipts } = await sb.from('ekasa_receipts').select('id, receipt_number, total, issued_at, payment_method').order('issued_at', { ascending: false }).limit(50);

  type DevRow = { id: string; device_id: string; location: string; status: string; last_sync_at: string | null; companies: { name: string } | { name: string }[] | null };
  type RecRow = { id: string; receipt_number: string; total: number; issued_at: string; payment_method: string };
  const devs = (devices || []) as DevRow[];
  const recs = (receipts || []) as RecRow[];

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <PageHeader title="eKasa" subtitle="Pokladničné doklady podľa zákona č. 289/2008 Z.z." />

      <Card className="mb-4 bg-amber-50 border-amber-200">
        <div className="p-5 flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <strong>eKasa vyžaduje certifikované zariadenie</strong> (online registračnú pokladňu).
            ZOLO ti umožní evidovať pokladničné doklady z certifikovaných zariadení (import cez API alebo CSV).
            Priame on-line spojenie s FS SR realizujú výrobcovia ako Wajstech, EFSAT, A3SOFT a iní.
            Pre ZOLO ako náhradu eKasy <strong>kontaktuj výrobcu eKasy</strong>.
            <div className="mt-2">
              <a href="https://www.financnasprava.sk/sk/podnikatelia/ekasa" target="_blank" rel="noopener" className="text-blue-600 underline inline-flex items-center gap-1">eKasa info na FS SR <ExternalLink size={11} /></a>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Pripojené zariadenia" />
          {devs.length === 0 ? (
            <EmptyState icon={<Receipt size={24} />} title="Žiadne zariadenia" description="Pridaj eKasu zariadenie cez API alebo manuálne." />
          ) : (
            <div className="divide-y divide-slate-100">
              {devs.map((d) => {
                const co = Array.isArray(d.companies) ? d.companies[0] : d.companies;
                return (
                  <div key={d.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{d.device_id}</div>
                      <div className="text-xs text-slate-500">{co?.name} · {d.location}</div>
                    </div>
                    <Badge variant={d.status === 'active' ? 'green' : 'gray'}>{d.status}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Posledné účtenky" />
          {recs.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">Žiadne účtenky</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-96 overflow-auto">
              {recs.map((r) => (
                <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-mono text-xs">{r.receipt_number}</div>
                    <div className="text-xs text-slate-500">{fmtDate(r.issued_at)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-medium">{fmtEur(Number(r.total))}</div>
                    <div className="text-[10px] text-slate-500">{r.payment_method}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
