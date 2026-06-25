import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardHeader } from '@/components/ui';
import { AlertTriangle, MapPin, Monitor } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Bezpečnosť' };

type LoginRow = {
  id: string;
  ip: string | null;
  country: string | null;
  user_agent: string | null;
  success: boolean;
  is_new_device: boolean;
  created_at: string;
};

function shortUa(ua: string | null): string {
  if (!ua) return 'neznáme';
  const m = ua.match(/(Chrome|Safari|Firefox|Edge|Opera|Brave)\/[\d.]+/);
  const browser = m ? m[1] : 'Browser';
  const os = /Mac OS X/.test(ua)
    ? 'macOS'
    : /Windows/.test(ua)
      ? 'Windows'
      : /Android/.test(ua)
        ? 'Android'
        : /iPhone|iPad/.test(ua)
          ? 'iOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'OS';
  return `${browser} · ${os}`;
}

function fmtCountry(c: string | null): string {
  if (!c) return '—';
  return c.toUpperCase();
}

export default async function SecurityPage() {
  const sb = await createClient();
  const { data: events } = await sb
    .from('login_events')
    .select('id, ip, country, user_agent, success, is_new_device, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = (events || []) as LoginRow[];

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <PageHeader title="Bezpečnosť" subtitle="História prihlásení a aktivita účtu" />

      <Card>
        <CardHeader title="Posledných 50 prihlásení" />
        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            Zatiaľ žiadne udalosti.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((r) => (
              <div key={r.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center ${r.is_new_device ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                    {r.is_new_device ? <AlertTriangle size={16} /> : <Monitor size={16} />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-slate-900 flex items-center gap-2 flex-wrap">
                      {shortUa(r.user_agent)}
                      {r.is_new_device && (
                        <span className="px-1.5 py-0.5 text-[10px] uppercase tracking-wider bg-amber-100 text-amber-700 rounded">
                          nové zariadenie
                        </span>
                      )}
                      {!r.success && (
                        <span className="px-1.5 py-0.5 text-[10px] uppercase tracking-wider bg-red-100 text-red-700 rounded">
                          neúspech
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate flex items-center gap-2">
                      <MapPin size={12} />
                      {r.ip || '—'} · {fmtCountry(r.country)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 sm:text-right shrink-0 pl-11 sm:pl-0">
                  {new Date(r.created_at).toLocaleString('sk-SK', { timeZone: 'Europe/Bratislava' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="text-xs text-slate-500 mt-4">
        Pri novom zariadení / inej krajine pošleme aj email. Ak vidíš podozrivú aktivitu, okamžite zmeň heslo a aktivuj MFA.
      </p>
    </div>
  );
}
