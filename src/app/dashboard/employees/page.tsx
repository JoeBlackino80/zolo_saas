import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge, Button } from '@/components/ui';
import { Users, Plus } from 'lucide-react';
import Link from 'next/link';

type Employee = {
  id: string;
  name: string;
  surname: string;
  date_of_birth: string | null;
  rodne_cislo: string | null;
  address_city: string | null;
  iban: string | null;
  health_insurance: string | null;
  active: boolean;
};

export default async function EmployeesPage() {
  const sb = await createClient();
  const { data } = await sb
    .from('employees')
    .select('id, name, surname, date_of_birth, rodne_cislo, address_city, iban, health_insurance, active')
    .is('deleted_at', null)
    .order('surname');

  const rows = (data || []) as Employee[];
  const active = rows.filter((r) => r.active);
  const inactive = rows.filter((r) => !r.active);

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      <PageHeader
        title="Zamestnanci"
        subtitle={`${active.length} aktívnych · ${inactive.length} neaktívnych`}
        actions={<Link href="/dashboard/payroll/new"><Button variant="primary"><Plus size={14} /> Nový zamestnanec</Button></Link>}
      />

      {rows.length === 0 ? (
        <Card><EmptyState icon={<Users size={24} />} title="Žiadni zamestnanci" description="Pridaj prvého zamestnanca pre spustenie miezd." action={<Link href="/dashboard/payroll/new"><Button variant="primary"><Plus size={14} /> Nový zamestnanec</Button></Link>} /></Card>
      ) : (
        <Card>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                  <th className="text-left px-5 py-3">Meno a priezvisko</th>
                  <th className="text-left px-3 py-3">RČ</th>
                  <th className="text-left px-3 py-3">Mesto</th>
                  <th className="text-left px-3 py-3">IBAN</th>
                  <th className="text-left px-3 py-3">ZP</th>
                  <th className="text-center px-3 py-3">Stav</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((e) => (
                  <tr key={e.id} className="hover:bg-zinc-50">
                    <td className="px-5 py-3 font-medium">{e.surname} {e.name}</td>
                    <td className="px-3 py-3 font-mono text-xs text-zinc-600">{e.rodne_cislo || '—'}</td>
                    <td className="px-3 py-3 text-zinc-700">{e.address_city || '—'}</td>
                    <td className="px-3 py-3 font-mono text-xs text-zinc-600">{e.iban ? `${e.iban.slice(0, 4)}…${e.iban.slice(-4)}` : '—'}</td>
                    <td className="px-3 py-3 text-zinc-700">{e.health_insurance || '—'}</td>
                    <td className="px-3 py-3 text-center">
                      <Badge variant={e.active ? 'green' : 'gray'}>{e.active ? 'Aktívny' : 'Neaktívny'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
