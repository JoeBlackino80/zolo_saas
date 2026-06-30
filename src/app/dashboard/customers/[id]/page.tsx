import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { PageHeader, Card, CardHeader, Badge, Button } from '@/components/ui';
import { ArrowLeft, Mail, Phone, Globe } from 'lucide-react';
import Link from 'next/link';
import { fmtEur, fmtDate } from '@/lib/utils';
import ContactActivities from './activities';

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { data: contact } = await sb.from('contacts').select('*').eq('id', id).is('deleted_at', null).single();
  if (!contact) notFound();

  const { data: invoices } = await sb
    .from('invoices')
    .select('id, number, type, total, status, issue_date, paid_amount')
    .eq('contact_id', id)
    .is('deleted_at', null)
    .order('issue_date', { ascending: false })
    .limit(50);

  type Inv = { id: string; number: string; type: string; total: number; status: string; issue_date: string; paid_amount: number | null };
  const rows = (invoices || []) as Inv[];
  const totalRevenue = rows.filter((i) => i.type === 'invoice').reduce((s, i) => s + Number(i.total), 0);
  const totalPaid = rows.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
  const totalUnpaid = totalRevenue - totalPaid;

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <Link href="/dashboard/customers" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-3">
        <ArrowLeft size={14} /> Späť na zákazníkov
      </Link>
      <PageHeader title={contact.name} subtitle={`IČO ${contact.ico || '—'} · ${contact.city || ''}`} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card><div className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tržby s týmto klientom</div>
          <div className="text-2xl font-bold mt-2">{fmtEur(totalRevenue)}</div>
          <div className="text-xs text-slate-500 mt-1">{rows.filter((i) => i.type === 'invoice').length} faktúr</div>
        </div></Card>
        <Card><div className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Zaplatené</div>
          <div className="text-2xl font-bold mt-2 text-emerald-600">{fmtEur(totalPaid)}</div>
        </div></Card>
        <Card><div className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Po splatnosti</div>
          <div className="text-2xl font-bold mt-2 text-red-600">{fmtEur(totalUnpaid)}</div>
        </div></Card>
      </div>

      <Card className="mb-4">
        <CardHeader title="Kontaktné údaje" />
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {contact.email && <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /><a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">{contact.email}</a></div>}
          {contact.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /><a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">{contact.phone}</a></div>}
          {contact.web && <div className="flex items-center gap-2"><Globe size={14} className="text-slate-400" /><a href={contact.web} target="_blank" rel="noopener" className="text-blue-600 hover:underline">{contact.web}</a></div>}
          <div><span className="text-slate-500">DIČ:</span> <span className="font-mono">{contact.dic || '—'}</span></div>
          <div><span className="text-slate-500">IČ DPH:</span> <span className="font-mono">{contact.ic_dph || '—'}</span></div>
          <div><span className="text-slate-500">Adresa:</span> {[contact.street, contact.city, contact.zip].filter(Boolean).join(', ') || '—'}</div>
        </div>
      </Card>

      <ContactActivities contactId={id} companyId={contact.company_id} />

      <Card>
        <CardHeader title={`História faktúr (${rows.length})`} action={<Link href={`/dashboard/invoices/new?customer=${id}`}><Button variant="primary">Nová faktúra</Button></Link>} />
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">Žiadne faktúry s týmto klientom</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              <th className="text-left px-5 py-3">Číslo</th>
              <th className="text-left px-3 py-3">Typ</th>
              <th className="text-center px-3 py-3">Dátum</th>
              <th className="text-right px-3 py-3">Suma</th>
              <th className="text-center px-3 py-3">Stav</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3"><Link href={`/dashboard/invoices/${r.id}`} className="font-mono text-xs text-blue-600 hover:underline">{r.number}</Link></td>
                  <td className="px-3 py-3 text-xs">{r.type}</td>
                  <td className="px-3 py-3 text-center font-mono text-xs">{fmtDate(r.issue_date)}</td>
                  <td className="px-3 py-3 text-right font-mono font-medium">{fmtEur(Number(r.total))}</td>
                  <td className="px-3 py-3 text-center"><Badge variant={r.status === 'paid' ? 'green' : r.status === 'overdue' ? 'red' : 'amber'}>{r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
