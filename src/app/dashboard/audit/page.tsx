import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState } from '@/components/ui';
import { History } from 'lucide-react';
import { fmtDate } from '@/lib/utils';

export default async function AuditPage() {
  const sb = await createClient();
  const { data: log } = await sb
    .from('audit_log')
    .select('id, table_name, record_id, action, new_values, old_values, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(200);

  type Row = { id: string; table_name: string; record_id: string; action: string; new_values: Record<string, unknown>; old_values: Record<string, unknown>; created_at: string; user_id: string };
  const rows = (log || []) as Row[];

  const actionColor: Record<string, 'green' | 'amber' | 'red' | 'gray' | 'blue'> = {
    INSERT: 'green',
    UPDATE: 'blue',
    DELETE: 'red',
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <PageHeader title="Audit log" subtitle={`Posledných ${rows.length} akcií · ${rows.length === 200 ? 'limit 200' : 'všetky'}`} />

      {rows.length === 0 ? (
        <Card><EmptyState icon={<History size={24} />} title="Žiadna aktivita" description="Audit log sa naplní pri akciách (create/update/delete)." /></Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                <th className="text-left px-5 py-3">Čas</th>
                <th className="text-left px-3 py-3">Akcia</th>
                <th className="text-left px-3 py-3">Tabuľka</th>
                <th className="text-left px-3 py-3">ID záznamu</th>
                <th className="text-left px-3 py-3">Detaily</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r) => {
                const time = new Date(r.created_at);
                return (
                  <tr key={r.id} className="hover:bg-zinc-50">
                    <td className="px-5 py-2.5 font-mono text-xs">{fmtDate(r.created_at)} {time.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-3 py-2.5"><Badge variant={actionColor[r.action] || 'gray'}>{r.action}</Badge></td>
                    <td className="px-3 py-2.5 font-mono text-xs">{r.table_name}</td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-zinc-500 truncate max-w-[120px]">{String(r.record_id).slice(0, 8)}…</td>
                    <td className="px-3 py-2.5 text-xs text-zinc-600 max-w-md truncate font-mono">
                      {r.new_values ? JSON.stringify(r.new_values).slice(0, 100) : '—'}
                    </td>
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
