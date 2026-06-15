import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge } from '@/components/ui';
import { CreditCard } from 'lucide-react';
import { fmtEur } from '@/lib/utils';

export default async function BankAccountsPage() {
  const sb = await createClient();
  const { data } = await sb.from('bank_accounts').select('id, account_name, iban, bic, bank_name, currency, current_balance, is_default, is_active, companies(name)').is('deleted_at', null);

  type B = { id: string; account_name: string; iban: string | null; bic: string | null; bank_name: string | null; currency: string; current_balance: number | null; is_default: boolean; is_active: boolean; companies: { name: string } | { name: string }[] | null };
  const rows = (data || []) as B[];

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader title="Bankové účty" subtitle={`${rows.length} účtov`} />
      {rows.length === 0 ? (
        <Card><EmptyState icon={<CreditCard size={24} />} title="Žiadne účty" description="Pridaj bankový účet pre evidenciu transakcií a import výpisov." /></Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              <th className="text-left px-5 py-3">Účet</th>
              <th className="text-left px-3 py-3">Firma</th>
              <th className="text-left px-3 py-3">IBAN</th>
              <th className="text-left px-3 py-3">BIC</th>
              <th className="text-right px-3 py-3">Zostatok</th>
              <th className="text-center px-3 py-3">Mena</th>
              <th className="text-center px-3 py-3">Stav</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((b) => {
                const co = Array.isArray(b.companies) ? b.companies[0] : b.companies;
                return (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="font-medium">{b.account_name}</div>
                      <div className="text-xs text-slate-500">{b.bank_name}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{co?.name}</td>
                    <td className="px-3 py-3 font-mono text-xs">{b.iban || '—'}</td>
                    <td className="px-3 py-3 font-mono text-xs">{b.bic || '—'}</td>
                    <td className="px-3 py-3 text-right font-mono font-medium">{fmtEur(Number(b.current_balance || 0))}</td>
                    <td className="px-3 py-3 text-center text-xs">{b.currency}</td>
                    <td className="px-3 py-3 text-center">
                      <Badge variant={b.is_active ? 'green' : 'gray'}>{b.is_active ? 'aktívny' : 'pauzovaný'}</Badge>
                      {b.is_default && <Badge variant="blue">default</Badge>}
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
