import { createClient } from '@/lib/supabase/server';
import { fmtEur } from '@/lib/utils';

export default async function DashboardPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();

  const [{ data: companies }, { data: invoices }] = await Promise.all([
    sb.from('companies').select('id, name, ico, ic_dph').order('name'),
    sb.from('invoices').select('id, total, status, type').limit(500),
  ]);

  const totalCompanies = companies?.length || 0;
  const totalRevenue = (invoices || []).filter((i) => i.type === 'invoice').reduce((s, i) => s + Number(i.total || 0), 0);
  const unpaid = (invoices || []).filter((i) => i.status === 'unpaid').reduce((s, i) => s + Number(i.total || 0), 0);

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Vitaj späť, {user?.email?.split('@')[0]}</h1>
        <p className="text-slate-500 mt-1 text-sm">{totalCompanies} firiem pod tvojím účtom</p>
      </div>

      {totalCompanies === 0 ? (
        <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold">
            +
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Vitaj v ZOLO</h2>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">
            Vytvor svoju prvú firmu a začni vystavovať faktúry, viesť účtovníctvo, generovať DPH výkazy.
          </p>
          <a
            href="/dashboard/settings"
            className="inline-block mt-5 px-5 py-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/25 hover:translate-y-[-1px] transition"
          >
            Vytvoriť prvú firmu
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          <Kpi label="Firmy v portfóliu" value={totalCompanies.toString()} />
          <Kpi label="Tržby celkom" value={fmtEur(totalRevenue)} />
          <Kpi label="Po splatnosti" value={fmtEur(unpaid)} accent="red" />
          <Kpi label="Doklady spolu" value={(invoices?.length || 0).toString()} />
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: 'red' | 'green' }) {
  const color = accent === 'red' ? 'text-red-600' : accent === 'green' ? 'text-green-600' : 'text-slate-900';
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-2xl font-bold mt-2 tracking-tight ${color}`}>{value}</div>
    </div>
  );
}
