import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardHeader, Badge, Button, EmptyState } from '@/components/ui';
import { Upload, ExternalLink, FileCode, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { fmtDate } from '@/lib/utils';

export default async function EDanePage() {
  const sb = await createClient();
  const { data: subs } = await sb
    .from('edane_submissions')
    .select('id, submission_type, period, submitted_at, status, confirmation_number, companies(name)')
    .order('created_at', { ascending: false })
    .limit(50);

  type Row = { id: string; submission_type: string; period: string; submitted_at: string | null; status: string; confirmation_number: string | null; companies: { name: string } | { name: string }[] | null };
  const rows = (subs || []) as Row[];

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <PageHeader title="eDane — Finančná správa SR" subtitle="História podaní a workflow návod" />

      <Card className="mb-4 bg-amber-50 border-amber-200">
        <div className="p-5 flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <strong>Priame podanie API zatiaľ neexistuje.</strong> FS SR neumožňuje 3rd-party priamy submit. Workflow:
            <ol className="mt-2 space-y-1 list-decimal pl-5">
              <li>Vygeneruj XML v sekcii <Link href="/dashboard/vat-return" className="underline">DP DPH / KV / SV</Link></li>
              <li>Stiahni do počítača</li>
              <li>Otvor <a href="https://www.financnasprava.sk" target="_blank" rel="noopener" className="underline inline-flex items-center gap-1">portal FS SR <ExternalLink size={11} /></a> → prihlás sa eID</li>
              <li>Elektronické podanie → Daň z pridanej hodnoty → nahraj XML</li>
              <li>Po potvrdení zaznamenaj číslo potvrdenia tu nižšie</li>
            </ol>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="História podaní" />
        {rows.length === 0 ? (
          <EmptyState
            icon={<FileCode size={24} />}
            title="Žiadne podania zatiaľ"
            description="Začni vygenerovaním XML v sekcii DP DPH alebo Kontrolný výkaz."
            action={<Link href="/dashboard/vat-return"><Button variant="primary"><Upload size={14} /> Generovať XML</Button></Link>}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                <th className="text-left px-5 py-3">Firma</th>
                <th className="text-left px-3 py-3">Typ</th>
                <th className="text-left px-3 py-3">Obdobie</th>
                <th className="text-center px-3 py-3">Podané</th>
                <th className="text-left px-3 py-3">Potvrdenie</th>
                <th className="text-center px-3 py-3">Stav</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r) => {
                const co = Array.isArray(r.companies) ? r.companies[0] : r.companies;
                return (
                  <tr key={r.id} className="hover:bg-zinc-50">
                    <td className="px-5 py-3">{co?.name || '—'}</td>
                    <td className="px-3 py-3 font-mono text-xs">{r.submission_type}</td>
                    <td className="px-3 py-3">{r.period}</td>
                    <td className="px-3 py-3 text-center font-mono text-xs">{r.submitted_at ? fmtDate(r.submitted_at) : '—'}</td>
                    <td className="px-3 py-3 font-mono text-xs">{r.confirmation_number || '—'}</td>
                    <td className="px-3 py-3 text-center"><Badge variant={r.status === 'accepted' ? 'green' : r.status === 'rejected' ? 'red' : 'amber'}>{r.status}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
