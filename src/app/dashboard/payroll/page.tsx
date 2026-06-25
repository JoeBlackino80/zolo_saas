import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardHeader, EmptyState, Badge, Button } from '@/components/ui';
import { Wallet, Plus, Play, FileText } from 'lucide-react';
import { fmtDate, fmtEur } from '@/lib/utils';
import Link from 'next/link';

const MONTH_LABELS = ['Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún', 'Júl', 'August', 'September', 'Október', 'November', 'December'];

export default async function PayrollPage() {
  const sb = await createClient();
  const [{ data: employees }, { data: runs }] = await Promise.all([
    sb.from('employees').select('id, name, surname, iban, active, created_at').is('deleted_at', null).order('surname'),
    sb.from('payroll_runs').select('id, period_year, period_month, status, total_gross, total_net, total_employer_cost, created_at').is('deleted_at', null).order('period_year', { ascending: false }).order('period_month', { ascending: false }).limit(20),
  ]);

  const activeEmps = (employees || []).filter((e) => e.active);
  const today = new Date();
  const currentPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  // If current month already has a run, jump to last month
  const hasCurrent = (runs || []).some((r) => `${r.period_year}-${String(r.period_month).padStart(2, '0')}` === currentPeriod);
  const suggestPeriod = hasCurrent
    ? `${today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear()}-${String(today.getMonth() === 0 ? 12 : today.getMonth()).padStart(2, '0')}`
    : currentPeriod;

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      <PageHeader
        title="Mzdy"
        subtitle={`${activeEmps.length} aktívnych zamestnancov · ${(runs || []).length} uložených behov`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/payroll/run?period=${suggestPeriod}`}>
              <Button variant="primary"><Play size={14} /> Spustiť mzdový mesiac</Button>
            </Link>
            <Link href="/dashboard/payroll/calc"><Button variant="secondary">Kalkulačka</Button></Link>
            <Link href="/dashboard/payroll/new"><Button variant="ghost"><Plus size={14} /> Nový zamestnanec</Button></Link>
            <Badge variant="amber">BETA</Badge>
          </div>
        }
      />

      <Card className="mb-4">
        <CardHeader title="Mzdové behy" subtitle="Posledné spustené výplaty" />
        {!runs?.length ? (
          <EmptyState
            icon={<FileText size={24} />}
            title="Zatiaľ žiadny beh"
            description="Spusti mzdový mesiac — z aktívnych zamestnancov vyrátame čistú mzdu, SP, ZP, daň, odvody zamestnávateľa."
            action={<Link href={`/dashboard/payroll/run?period=${suggestPeriod}`}><Button variant="primary"><Play size={14} /> Spustiť {MONTH_LABELS[parseInt(suggestPeriod.split('-')[1]) - 1]} {suggestPeriod.split('-')[0]}</Button></Link>}
          />
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="text-left px-5 py-3">Obdobie</th>
                  <th className="text-right px-3 py-3">Hrubá spolu</th>
                  <th className="text-right px-3 py-3">Čistá spolu</th>
                  <th className="text-right px-3 py-3">Náklad zamest.</th>
                  <th className="text-center px-3 py-3">Stav</th>
                  <th className="text-center px-3 py-3">Vytvorené</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/payroll/run?period=${r.period_year}-${String(r.period_month).padStart(2, '0')}`} className="font-medium text-blue-600 hover:underline">
                        {MONTH_LABELS[r.period_month - 1]} {r.period_year}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-right font-mono">{fmtEur(Number(r.total_gross || 0))}</td>
                    <td className="px-3 py-3 text-right font-mono">{fmtEur(Number(r.total_net || 0))}</td>
                    <td className="px-3 py-3 text-right font-mono">{fmtEur(Number(r.total_employer_cost || 0))}</td>
                    <td className="px-3 py-3 text-center"><Badge variant={r.status === 'finalized' ? 'green' : 'amber'}>{r.status || 'draft'}</Badge></td>
                    <td className="px-3 py-3 text-center font-mono text-xs">{fmtDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Zamestnanci" subtitle={`${activeEmps.length} aktívnych / ${(employees || []).length} celkom`} />
        {!employees?.length ? (
          <EmptyState
            icon={<Wallet size={24} />}
            title="Žiadni zamestnanci"
            description="Pridaj zamestnancov pre výpočet mzdy (SP, ZP, daň)."
            action={<Link href="/dashboard/payroll/new"><Button variant="primary"><Plus size={14} /> Pridať zamestnanca</Button></Link>}
          />
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="text-left px-5 py-3">Meno</th>
                  <th className="text-left px-3 py-3">IBAN</th>
                  <th className="text-center px-3 py-3">Pridaný</th>
                  <th className="text-center px-3 py-3">Stav</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">{e.surname} {e.name}</td>
                    <td className="px-3 py-3 font-mono text-xs">{e.iban || '—'}</td>
                    <td className="px-3 py-3 text-center font-mono text-xs">{fmtDate(e.created_at)}</td>
                    <td className="px-3 py-3 text-center"><Badge variant={e.active ? 'green' : 'gray'}>{e.active ? 'aktívny' : 'neaktívny'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
