import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge } from '@/components/ui';
import { Wallet } from 'lucide-react';
import { fmtEur, fmtDate } from '@/lib/utils';

export default async function PayrollPage() {
  const sb = await createClient();
  const { data: employees } = await sb
    .from('employees')
    .select('id, full_name, position, base_salary, hire_date, status')
    .is('deleted_at', null);

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader
        title="Mzdy"
        subtitle={`${employees?.length || 0} zamestnancov`}
        actions={
          <>
            <Badge variant="amber">BETA</Badge>
            <a href="/dashboard/payroll/calc" className="text-sm text-blue-600 hover:underline ml-3">Mzdová kalkulačka →</a>
          </>
        }
      />

      {!employees?.length ? (
        <Card>
          <EmptyState
            icon={<Wallet size={24} />}
            title="Žiadni zamestnanci"
            description="Pridaj zamestnancov pre výpočet mzdy (SP, ZP, daň)."
          />
        </Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="text-left px-5 py-3">Zamestnanec</th>
                <th className="text-left px-3 py-3">Pozícia</th>
                <th className="text-right px-3 py-3">Hrubá mzda</th>
                <th className="text-center px-3 py-3">Nástup</th>
                <th className="text-center px-3 py-3">Stav</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{e.full_name}</td>
                  <td className="px-3 py-3 text-slate-600">{e.position || '—'}</td>
                  <td className="px-3 py-3 text-right font-mono">{fmtEur(Number(e.base_salary || 0))}</td>
                  <td className="px-3 py-3 text-center font-mono text-xs">{fmtDate(e.hire_date)}</td>
                  <td className="px-3 py-3 text-center"><Badge variant="green">{e.status || 'active'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
