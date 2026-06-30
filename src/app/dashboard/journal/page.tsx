import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardHeader, EmptyState, Badge, Button } from '@/components/ui';
import { Book, Plus } from 'lucide-react';
import { fmtEur, fmtDate } from '@/lib/utils';
import Link from 'next/link';

type Line = { account: string; debit?: number; credit?: number };
type Entry = { id: string; entry_date: string; description: string; entry_number?: string; lines: Line[] };

export default async function JournalPage() {
  const sb = await createClient();
  const { data: entries } = await sb
    .from('journal_entries')
    .select('id, entry_date, description, entry_number, journal_entry_lines(account_code, debit_amount, credit_amount)')
    .order('entry_date', { ascending: false })
    .limit(200);

  type RawLine = { account_code: string; debit_amount: number | null; credit_amount: number | null };
  const rows: Entry[] = (entries || []).map((e) => ({
    id: e.id as string,
    entry_date: (e.entry_date as string) || '',
    description: (e.description as string) || '',
    entry_number: (e.entry_number as string) || '',
    lines: ((e.journal_entry_lines as RawLine[]) || []).map((l) => ({
      account: l.account_code,
      debit: Number(l.debit_amount || 0),
      credit: Number(l.credit_amount || 0),
    })),
  }));

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      <PageHeader
        title="Denník & hlavná kniha"
        subtitle={`${rows.length} zápisov`}
        actions={
          <div className="flex gap-2">
            <Link href="/dashboard/journal/bulk-post"><Button variant="secondary">Hromadne rozúčtovať</Button></Link>
            <Link href="/dashboard/journal/accruals"><Button variant="secondary">Časové rozlíšenie</Button></Link>
            <Link href="/dashboard/journal/new"><Button variant="primary"><Plus size={14} /> Nový zápis</Button></Link>
          </div>
        }
      />

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Book size={24} />}
            title="Denník je prázdny"
            description="Účtovné zápisy sa pridajú automaticky pri vystavovaní faktúr (auto-posting)."
          />
        </Card>
      ) : (
        <Card>
          <CardHeader title="Účtovný denník" />
          <div className="divide-y divide-slate-100">
            {rows.map((e) => (
              <div key={e.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-slate-500">#{e.entry_number || '—'}</span>
                    <span className="text-sm font-medium text-slate-900">{e.description}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="gray">{fmtDate(e.entry_date)}</Badge>
                  </div>
                </div>
                <table className="w-full text-xs font-mono">
                  <tbody>
                    {e.lines.map((l, i) => (
                      <tr key={i}>
                        <td className="py-1 pl-4 text-slate-600">{l.account}</td>
                        <td className="py-1 text-right text-slate-900">{l.debit ? fmtEur(l.debit) : ''}</td>
                        <td className="py-1 text-right text-slate-900">{l.credit ? fmtEur(l.credit) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
