import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge, Button } from '@/components/ui';
import { Wallet, Plus } from 'lucide-react';
import { fmtDate } from '@/lib/utils';
import Link from 'next/link';

export default async function PayrollPage() {
  const sb = await createClient();
  const { data: employees } = await sb
    .from('employees')
    .select('id, name, surname, iban, active, created_at')
    .is('deleted_at', null);

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader
        title="Mzdy"
        subtitle={`${employees?.length || 0} zamestnancov`}
        actions={
          <>
            <Link href="/dashboard/payroll/calc"><Button variant="secondary">Mzdová kalkulačka</Button></Link>
            <Link href="/dashboard/payroll/new"><Button variant="primary"><Plus size={14} /> Nový zamestnanec</Button></Link>
            <Badge variant="amber">BETA</Badge>
          </>
        }
      />

      {!employees?.length ? (
        <Card>
          <EmptyState
            icon={<Wallet size={24} />}
            title="Žiadni zamestnanci"
            description="Pridaj zamestnancov pre výpočet mzdy (SP, ZP, daň)."
            action={<Link href="/dashboard/payroll/new"><Button variant="primary"><Plus size={14} /> Pridať zamestnanca</Button></Link>}
          />
        </Card>
      ) : (
        <Card>
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
                  <td className="px-5 py-3 font-medium text-slate-900">{e.name} {e.surname}</td>
                  <td className="px-3 py-3 font-mono text-xs">{e.iban || '—'}</td>
                  <td className="px-3 py-3 text-center font-mono text-xs">{fmtDate(e.created_at)}</td>
                  <td className="px-3 py-3 text-center"><Badge variant={e.active ? 'green' : 'gray'}>{e.active ? 'aktívny' : 'neaktívny'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
