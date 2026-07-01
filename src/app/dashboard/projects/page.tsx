import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge, Button } from '@/components/ui';
import { Briefcase, Plus } from 'lucide-react';
import { fmtEur, fmtDate } from '@/lib/utils';
import Link from 'next/link';

export default async function ProjectsPage() {
  const sb = await createClient();
  const { data: projects } = await sb
    .from('projects')
    .select('id, name, code, is_active, budget, start_date, end_date, companies(name)');

  type P = { id: string; name: string; code: string | null; is_active: boolean; budget: number | null; start_date: string | null; end_date: string | null; companies: { name: string } | { name: string }[] | null };
  const rows = (projects || []) as P[];

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      <PageHeader
        title="Projekty"
        subtitle={`${rows.length} projektov`}
        actions={<Link href="/dashboard/projects/new"><Button variant="primary"><Plus size={14} /> Nový projekt</Button></Link>}
      />

      {rows.length === 0 ? (
        <Card><EmptyState
          icon={<Briefcase size={24} />}
          title="Žiadne projekty"
          description="Rozdeľ výnosy a náklady podľa projektov pre presnejšiu ziskovosť."
          action={<Link href="/dashboard/projects/new"><Button variant="primary"><Plus size={14} /> Vytvoriť projekt</Button></Link>}
        /></Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                <th className="text-left px-5 py-3">Projekt</th>
                <th className="text-left px-3 py-3">Kód</th>
                <th className="text-left px-3 py-3">Firma</th>
                <th className="text-right px-3 py-3">Rozpočet</th>
                <th className="text-center px-3 py-3">Trvanie</th>
                <th className="text-center px-3 py-3">Stav</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((p) => {
                const co = Array.isArray(p.companies) ? p.companies[0] : p.companies;
                return (
                  <tr key={p.id} className="hover:bg-zinc-50">
                    <td className="px-5 py-3 font-medium">{p.name}</td>
                    <td className="px-3 py-3 font-mono text-xs">{p.code || '—'}</td>
                    <td className="px-3 py-3 text-zinc-600">{co?.name || '—'}</td>
                    <td className="px-3 py-3 text-right font-mono">{fmtEur(Number(p.budget || 0))}</td>
                    <td className="px-3 py-3 text-center font-mono text-xs">{p.start_date ? fmtDate(p.start_date) : '—'}{p.end_date ? ` → ${fmtDate(p.end_date)}` : ''}</td>
                    <td className="px-3 py-3 text-center"><Badge variant={p.is_active ? 'green' : 'gray'}>{p.is_active ? 'aktívny' : 'ukončený'}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
