import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge } from '@/components/ui';
import { FolderOpen, FileText } from 'lucide-react';
import { fmtDate } from '@/lib/utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Digitálny archív' };

type D = { id: string; name: string; type: string | null; mime_type: string | null; storage_path: string; file_size: number | null; invoice_id: string | null; created_at: string };

export default async function ArchivePage() {
  const sb = await createClient();
  const { data } = await sb.from('documents').select('id, name, type, mime_type, storage_path, file_size, invoice_id, created_at').order('created_at', { ascending: false }).limit(500);
  const rows = (data || []) as D[];

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <PageHeader title="Digitálny archív" subtitle={`${rows.length} dokumentov · zákonná archivácia 10 rokov`} />

      {!rows.length ? (
        <Card>
          <EmptyState
            icon={<FolderOpen size={24} />}
            title="Archív je prázdny"
            description="Prílohy nahrávané k faktúram a denníkovým zápisom sa zobrazia tu."
          />
        </Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                <th className="text-left px-5 py-3">Názov</th>
                <th className="text-left px-3 py-3">Typ</th>
                <th className="text-right px-3 py-3">Veľkosť</th>
                <th className="text-center px-3 py-3">Pridané</th>
                <th className="text-left px-3 py-3">Doklad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((d) => (
                <tr key={d.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-3 flex items-center gap-2"><FileText size={14} className="text-zinc-400" />{d.name}</td>
                  <td className="px-3 py-3"><Badge variant="gray">{d.type || d.mime_type?.split('/')[1] || 'file'}</Badge></td>
                  <td className="px-3 py-3 text-right font-mono text-xs">{d.file_size ? `${(d.file_size / 1024).toFixed(1)} KB` : '—'}</td>
                  <td className="px-3 py-3 text-center text-xs">{fmtDate(d.created_at)}</td>
                  <td className="px-3 py-3">
                    {d.invoice_id ? <Link href={`/dashboard/invoices/${d.invoice_id}`} className="text-blue-600 hover:underline text-xs">FA →</Link> : <span className="text-xs text-zinc-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
