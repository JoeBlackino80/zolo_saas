import { PageHeader, Card, CardHeader, Badge } from '@/components/ui';
import { AlertTriangle, CheckCircle2, ExternalLink, Bell } from 'lucide-react';

export default function MonitoringPage() {
  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <PageHeader
        back={{ href: '/dashboard/settings' }}
        title="Monitorovanie a alerty"
        subtitle="Ako nastaviť real-time upozornenia keď niečo padne v produkcii"
      />

      <Card className="mb-4">
        <CardHeader
          title="Aktuálny stav"
          action={<Badge variant="green">Sentry aktívny</Badge>}
        />
        <div className="p-5 space-y-3 text-[13px] text-zinc-700">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <strong>Sentry error tracking</strong> — každý JS/API error v produkcii sa loguje do
              Sentry projektu s stack trace, user context, breadcrumbs.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <strong>Vercel runtime errors</strong> — deployment errory, function timeouts a build
              failures sa objavia v Vercel dashboarde.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <strong>Chýba: real-time alerting</strong> — Sentry zbiera errory, ale ty ich neuvidíš
              kým sa neprihlásiš. Pri produkčnom výpadku dostaneš vedieť cez sťažnosť užívateľa.
            </div>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <CardHeader title="Nastaviť Slack alerting (odporúčam)" subtitle="Sentry → Slack integration za 5 minút" />
        <div className="p-5 space-y-4 text-[13px] text-zinc-700">
          <ol className="space-y-3 list-decimal pl-5">
            <li>
              Otvor <a href="https://sentry.io" target="_blank" rel="noopener" className="text-zinc-900 underline">sentry.io</a> a
              prihlás sa do ZOLO projektu.
            </li>
            <li>
              <strong>Settings → Integrations → Slack</strong> → klik <em>Add to Slack</em>. Autorizuj tvoju Slack workspace.
            </li>
            <li>
              Vyber kanál (napr. <code className="text-[11px] bg-zinc-100 px-1.5 py-0.5 rounded">#zolo-alerts</code>) kde chceš dostávať upozornenia.
            </li>
            <li>
              <strong>Settings → Alerts → Create Alert Rule</strong> → nastav pravidlá:
              <ul className="list-disc pl-6 mt-2 space-y-1 text-[12px]">
                <li>&quot;New error frequency &gt; 10/min&quot; → notifikuj do Slack (P1 – production down)</li>
                <li>&quot;An event is seen for the first time&quot; → notifikuj (P2 – nový bug)</li>
                <li>&quot;Issue affects &gt; 50 users&quot; → notifikuj + escalate (P0 – critical)</li>
              </ul>
            </li>
            <li>
              Otestuj: klikni <em>Send Test Alert</em>. V Slack ti príde ukážková správa.
            </li>
          </ol>
          <div className="mt-4">
            <a href="https://docs.sentry.io/product/integrations/notification-incidents/slack/" target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-[13px] text-zinc-900 hover:underline">
              Sentry docs — Slack integration <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <CardHeader title="Nastaviť Email alerting (alternatíva)" subtitle="Ak nechceš Slack" />
        <div className="p-5 text-[13px] text-zinc-700">
          <ol className="space-y-2 list-decimal pl-5">
            <li>Sentry → <strong>User Settings → Notifications</strong></li>
            <li>Zapni <em>&quot;Weekly reports&quot;</em> a <em>&quot;Deploys&quot;</em></li>
            <li>Alert Rules — vyber notification action &quot;Send an email to Team&quot;</li>
          </ol>
          <p className="mt-3 text-[12px] text-zinc-500">
            Email je pomalší než Slack — pri high-frequency errore môžeš dostať 100+ mailov naraz.
            Slack channel dedupuje.
          </p>
        </div>
      </Card>

      <Card className="mb-4">
        <CardHeader title="Backup & disaster recovery" />
        <div className="p-5 space-y-3 text-[13px] text-zinc-700">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <strong>Supabase automated backups</strong> — celá DB sa zálohuje denne (Pro plán = 7 dní PITR retention).
              Nič nemusíš robiť.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <strong>Otestuj restore proces</strong> — otvor Supabase Dashboard → Database → Backups → skús
              <em>Restore to new project</em>. Aspoň raz za 6 mesiacov aby si vedel že to funguje.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Bell size={16} className="text-zinc-500 mt-0.5 shrink-0" />
            <div>
              <strong>Kritické súbory</strong> — logo, brand assets, custom templates → export z Supabase Storage
              1× za mesiac do lokálnej zálohy alebo S3 bucket.
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Uptime monitoring" />
        <div className="p-5 text-[13px] text-zinc-700">
          <p>
            Pridaj <strong>Better Uptime</strong>, <strong>Pingdom</strong> alebo <strong>UptimeRobot</strong> checker na
            <code className="text-[11px] bg-zinc-100 px-1.5 py-0.5 rounded mx-1">https://app.zolo.sk/api/health</code>
            každých 5 minút.
          </p>
          <p className="mt-2 text-[12px] text-zinc-500">
            Endpoint vráti 200 + JSON <code className="text-[10px]">{'{"ok":true,"db":"ok","db_latency_ms":137}'}</code>.
            Ak spadne, dostaneš SMS/call — okamžite vieš že je downtime.
          </p>
        </div>
      </Card>
    </div>
  );
}
