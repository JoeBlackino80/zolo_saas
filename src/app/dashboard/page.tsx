import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader } from '@/components/ui';
import { fmtEur, fmtDate } from '@/lib/utils';
import Link from 'next/link';
import { TrendingUp, TrendingDown, FileText, Building2, Clock, Calendar, Plus, Receipt } from 'lucide-react';

export default async function DashboardPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const today = new Date();
  const thisMonth = today.toISOString().slice(0, 7);
  const thisMonthStart = `${thisMonth}-01`;
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0, 10);

  const [{ data: companies }, { data: invoices }, { data: recent }, { data: overdue }] = await Promise.all([
    sb.from('companies').select('id, name').is('deleted_at', null),
    sb.from('invoices').select('total, type, status, issue_date, paid_amount').is('deleted_at', null),
    sb.from('invoices').select('id, number, customer_name, total, status, issue_date, companies(name)').is('deleted_at', null).order('issue_date', { ascending: false }).limit(8),
    sb.from('invoices').select('id, number, customer_name, total, due_date').is('deleted_at', null).eq('type', 'invoice').in('status', ['issued', 'sent', 'partially_paid']).lt('due_date', today.toISOString().slice(0, 10)).limit(5),
  ]);

  const totalCompanies = companies?.length || 0;
  const allInv = invoices || [];
  const thisMonthRevenue = allInv.filter((i) => i.type === 'invoice' && i.issue_date >= thisMonthStart).reduce((s, i) => s + Number(i.total || 0), 0);
  const lastMonthRevenue = allInv.filter((i) => i.type === 'invoice' && i.issue_date >= lastMonth && i.issue_date < thisMonthStart).reduce((s, i) => s + Number(i.total || 0), 0);
  const revenueDelta = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
  const unpaidTotal = allInv.filter((i) => i.type === 'invoice' && i.status !== 'paid').reduce((s, i) => s + Number(i.total || 0) - Number(i.paid_amount || 0), 0);
  const overdueCount = (overdue || []).length;

  type Inv = { id: string; number: string; customer_name: string | null; total: number; status: string; issue_date: string; companies: { name: string } | { name: string }[] | null };
  type Due = { id: string; number: string; customer_name: string | null; total: number; due_date: string };
  const recentRows = (recent || []) as Inv[];
  const overdueRows = (overdue || []) as Due[];

  if (totalCompanies === 0) {
    return (
      <div className="p-8 max-w-5xl">
        <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white"><Plus size={32} /></div>
          <h2 className="text-2xl font-bold text-slate-900">Vitaj v ZOLO, {user?.email?.split('@')[0]}</h2>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">Vytvor svoju prvú firmu a začni vystavovať faktúry, viesť účtovníctvo, generovať DPH výkazy.</p>
          <Link href="/dashboard/settings/companies/new" className="inline-block mt-5 px-5 py-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/25 hover:translate-y-[-1px] transition">Vytvoriť prvú firmu</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Vitaj späť, {user?.email?.split('@')[0]}</h1>
        <p className="text-slate-500 mt-1 text-sm">{totalCompanies} firiem pod tvojím účtom · {thisMonth}</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tržby tento mesiac</div>
              <Receipt size={16} className="text-slate-400" />
            </div>
            <div className="text-2xl font-bold tracking-tight">{fmtEur(thisMonthRevenue)}</div>
            {revenueDelta !== 0 && (
              <div className={`flex items-center gap-1 text-xs font-medium mt-2 ${revenueDelta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {revenueDelta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {revenueDelta > 0 ? '+' : ''}{revenueDelta.toFixed(1)}% vs minulý mesiac
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Nezaplatené</div>
              <Clock size={16} className="text-slate-400" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-red-600">{fmtEur(unpaidTotal)}</div>
            <div className="text-xs text-slate-500 mt-2">{overdueCount} po splatnosti</div>
          </div>
        </Card>

        <Card>
          <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Faktúry tento rok</div>
              <FileText size={16} className="text-slate-400" />
            </div>
            <div className="text-2xl font-bold tracking-tight">{allInv.filter((i) => i.type === 'invoice').length}</div>
            <div className="text-xs text-slate-500 mt-2">vystavené spolu</div>
          </div>
        </Card>

        <Card>
          <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Firmy</div>
              <Building2 size={16} className="text-slate-400" />
            </div>
            <div className="text-2xl font-bold tracking-tight">{totalCompanies}</div>
            <div className="text-xs text-slate-500 mt-2">v portfóliu</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Link href="/dashboard/invoices/new" className="block bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl p-5 hover:shadow-xl hover:scale-[1.02] transition">
          <Plus size={20} className="mb-2" />
          <div className="text-sm font-semibold">Nový doklad</div>
          <div className="text-xs opacity-80 mt-0.5">FA · ZF · DO · DL · PPD · CP</div>
        </Link>
        <Link href="/dashboard/calendar" className="block bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-blue-300 transition">
          <Calendar size={20} className="text-amber-500 mb-2" />
          <div className="text-sm font-semibold text-slate-900">Daňový kalendár</div>
          <div className="text-xs text-slate-500 mt-0.5">DPH 25. · DZP 31.3.</div>
        </Link>
        <Link href="/dashboard/cashflow" className="block bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-blue-300 transition">
          <TrendingUp size={20} className="text-emerald-500 mb-2" />
          <div className="text-sm font-semibold text-slate-900">Cash flow 90 dní</div>
          <div className="text-xs text-slate-500 mt-0.5">predikcia hotovosti</div>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Posledné doklady" action={<Link href="/dashboard/invoices" className="text-xs text-blue-600 hover:underline">Všetky →</Link>} />
          <div className="divide-y divide-slate-100">
            {recentRows.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-500">Zatiaľ žiadne doklady</div>
            ) : (
              recentRows.map((r) => {
                const co = Array.isArray(r.companies) ? r.companies[0] : r.companies;
                return (
                  <Link key={r.id} href={`/dashboard/invoices/${r.id}`} className="block px-5 py-3 hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-900 font-mono">{r.number}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{co?.name} → {r.customer_name || '—'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono font-medium">{fmtEur(Number(r.total))}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{fmtDate(r.issue_date)}</div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Po splatnosti" action={<Link href="/dashboard/receivables" className="text-xs text-blue-600 hover:underline">Všetky →</Link>} />
          <div className="divide-y divide-slate-100">
            {overdueRows.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-emerald-600">✓ Žiadne overdue faktúry</div>
            ) : (
              overdueRows.map((r) => {
                const days = Math.floor((today.getTime() - new Date(r.due_date).getTime()) / 86400000);
                return (
                  <Link key={r.id} href={`/dashboard/invoices/${r.id}`} className="block px-5 py-3 hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-900 font-mono">{r.number}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{r.customer_name || '—'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono font-medium text-red-600">{fmtEur(Number(r.total))}</div>
                        <div className="text-[10px] text-red-500 mt-0.5">{days} dní po</div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
