import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui';
import { fmtEur, fmtDate } from '@/lib/utils';
import Link from 'next/link';
import { TrendingUp, TrendingDown, FileText, Building2, Clock, Calendar, Plus, ArrowUpRight, Percent } from 'lucide-react';
import { aggregateVat } from '@/lib/vat';

export default async function DashboardPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const today = new Date();
  const thisMonth = today.toISOString().slice(0, 7);
  const thisMonthStart = `${thisMonth}-01`;
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0, 10);

  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().slice(0, 10);

  const [{ data: companies }, { data: invoices }, { data: recent }, { data: overdue }, { data: vatOut }, { data: vatIn }] = await Promise.all([
    sb.from('companies').select('id, name').is('deleted_at', null),
    sb.from('invoices').select('total, type, status, issue_date, paid_amount').is('deleted_at', null),
    sb.from('invoices').select('id, number, customer_name, total, status, issue_date, companies(name)').is('deleted_at', null).order('issue_date', { ascending: false }).limit(8),
    sb.from('invoices').select('id, number, customer_name, total, due_date').is('deleted_at', null).eq('type', 'invoice').in('status', ['issued', 'sent', 'partially_paid']).lt('due_date', today.toISOString().slice(0, 10)).limit(5),
    // DPH agregát za tento mesiac — výstupné plnenia (predaj)
    sb.from('invoices')
      .select('invoice_items(vat_rate, subtotal, vat_amount)')
      .in('type', ['invoice', 'credit_note'])
      .gte('delivery_date', thisMonthStart)
      .lt('delivery_date', nextMonthStart)
      .is('deleted_at', null),
    // DPH agregát za tento mesiac — vstupné plnenia (nákupy)
    sb.from('invoices')
      .select('invoice_items(vat_rate, subtotal, vat_amount)')
      .eq('type', 'received_invoice')
      .gte('delivery_date', thisMonthStart)
      .lt('delivery_date', nextMonthStart)
      .is('deleted_at', null),
  ]);

  type RawItem = { vat_rate: number; subtotal: number; vat_amount: number };
  const outItems: RawItem[] = (vatOut || []).flatMap((i) => (i.invoice_items as RawItem[]) || []);
  const inItems: RawItem[] = (vatIn || []).flatMap((i) => (i.invoice_items as RawItem[]) || []);
  const vatTotals = aggregateVat(outItems, inItems);
  const vatDeadline = `25. ${String(today.getMonth() + 2).padStart(2, '0')}.`;

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
    redirect('/onboarding');
  }

  const totalInvoices = allInv.length;
  const showFirstInvoiceCoach = totalCompanies > 0 && totalInvoices === 0;

  const monthName = new Date().toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' });

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      {/* Hero — Apple Health style: prominent primary metric */}
      <div className="mb-8">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-3">
          Prehľad · {monthName}
        </div>
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-[44px] sm:text-[56px] font-bold text-zinc-900 tracking-[-0.03em] leading-[1] tabular-nums">
              {fmtEur(thisMonthRevenue)}
            </h1>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-[13px] text-zinc-500 tracking-tight">tržby tento mesiac</span>
              {revenueDelta !== 0 && (
                <span className={`inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-0.5 rounded-full tabular-nums ${
                  revenueDelta > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                  {revenueDelta > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {revenueDelta > 0 ? '+' : ''}{revenueDelta.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-[11px] text-zinc-400 uppercase tracking-[0.1em]">Vitaj späť</div>
            <div className="text-[14px] text-zinc-700 font-medium mt-1 tracking-tight">{user?.email?.split('@')[0]}</div>
          </div>
        </div>
      </div>

      {showFirstInvoiceCoach && (
        <div className="mb-8 bg-zinc-950 text-white rounded-2xl p-7">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="max-w-xl">
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400">Posledný krok</div>
              <h2 className="text-[26px] sm:text-3xl font-bold mt-2 tracking-[-0.02em] leading-tight">Vystav svoju prvú faktúru za 30 sekúnd</h2>
              <p className="text-zinc-400 mt-3 leading-relaxed text-[14px]">Pridaj zákazníka (alebo IČO a zvyšok doplníme z ORSR), vyber položky a pošli mailom rovno z aplikácie — vrátane PDF prílohy.</p>
              <div className="flex gap-2 mt-5">
                <Link href="/dashboard/invoices/new" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-zinc-900 font-medium rounded-full text-[13px] hover:bg-zinc-100 transition-colors">
                  <Plus size={14} strokeWidth={2.5} /> Vystaviť prvú faktúru
                </Link>
                <Link href="/dashboard/customers/new" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-full text-[13px] transition-colors">
                  Najprv pridať zákazníka
                </Link>
              </div>
            </div>
            <div className="hidden md:flex items-center justify-center w-28 h-28 rounded-2xl bg-white/[0.06] border border-white/10">
              <FileText size={44} className="text-zinc-400" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      )}

      {/* Secondary metrics — smaller, denser */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <MetricCard
          label="Nezaplatené"
          value={fmtEur(unpaidTotal)}
          hint={`${overdueCount} po splatnosti`}
          hintVariant={overdueCount > 0 ? 'red' : undefined}
          valueVariant="red"
          icon={<Clock size={14} />}
          href="/dashboard/receivables"
        />
        <MetricCard
          label={vatTotals.obligation >= 0 ? `DPH k odvodu · do ${vatDeadline}` : `Nadmerný odpočet · do ${vatDeadline}`}
          value={fmtEur(Math.abs(vatTotals.obligation))}
          hint={vatTotals.obligation >= 0 ? 'do štátneho rozpočtu' : 'štát vráti'}
          valueVariant={vatTotals.obligation >= 0 ? 'red' : 'green'}
          icon={<Percent size={14} />}
          href="/dashboard/vat-return"
        />
        <MetricCard
          label="Faktúry tento rok"
          value={String(allInv.filter((i) => i.type === 'invoice').length)}
          hint="vystavené spolu"
          icon={<FileText size={14} />}
          href="/dashboard/invoices"
        />
        <MetricCard
          label="Firmy"
          value={String(totalCompanies)}
          hint="v portfóliu"
          icon={<Building2 size={14} />}
          href="/dashboard/settings"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <Link href="/dashboard/invoices/new" className="group bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl p-5 transition-colors flex items-center justify-between">
          <div>
            <Plus size={20} strokeWidth={2.2} className="mb-2 text-zinc-300 group-hover:text-white transition-colors" />
            <div className="text-[14px] font-semibold tracking-tight">Nový doklad</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">FA · ZF · DO · DL · PPD · CP</div>
          </div>
          <ArrowUpRight size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
        </Link>
        <Link href="/dashboard/calendar" className="group bg-white border border-zinc-100 rounded-2xl p-5 hover:border-zinc-200 hover:bg-zinc-50 transition-colors flex items-center justify-between">
          <div>
            <Calendar size={20} className="text-zinc-400 mb-2" />
            <div className="text-[14px] font-semibold text-zinc-900 tracking-tight">Daňový kalendár</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">DPH 25. · DZP 31.3.</div>
          </div>
          <ArrowUpRight size={16} className="text-zinc-400 group-hover:text-zinc-900 transition-colors" />
        </Link>
        <Link href="/dashboard/cashflow" className="group bg-white border border-zinc-100 rounded-2xl p-5 hover:border-zinc-200 hover:bg-zinc-50 transition-colors flex items-center justify-between">
          <div>
            <TrendingUp size={20} className="text-zinc-400 mb-2" />
            <div className="text-[14px] font-semibold text-zinc-900 tracking-tight">Cash flow 90 dní</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">predikcia hotovosti</div>
          </div>
          <ArrowUpRight size={16} className="text-zinc-400 group-hover:text-zinc-900 transition-colors" />
        </Link>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Posledné doklady" action={<Link href="/dashboard/invoices" className="text-[12px] text-zinc-900 hover:underline tracking-tight">Všetky →</Link>} />
          <div className="divide-y divide-zinc-100">
            {recentRows.length === 0 ? (
              <div className="px-5 py-10 text-center text-[13px] text-zinc-500">Zatiaľ žiadne doklady</div>
            ) : (
              recentRows.map((r) => {
                const co = Array.isArray(r.companies) ? r.companies[0] : r.companies;
                return (
                  <Link key={r.id} href={`/dashboard/invoices/${r.id}`} className="block px-5 py-3 hover:bg-zinc-50 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-zinc-900 font-mono tracking-tight">{r.number}</div>
                        <div className="text-[12px] text-zinc-500 mt-0.5 truncate">{co?.name} → {r.customer_name || '—'}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[13px] font-mono font-semibold tabular-nums">{fmtEur(Number(r.total))}</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">{fmtDate(r.issue_date)}</div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Po splatnosti" action={<Link href="/dashboard/receivables" className="text-[12px] text-zinc-900 hover:underline tracking-tight">Všetky →</Link>} />
          <div className="divide-y divide-zinc-100">
            {overdueRows.length === 0 ? (
              <div className="px-5 py-10 text-center text-[13px] text-emerald-600 font-medium">✓ Všetko zaplatené</div>
            ) : (
              overdueRows.map((r) => {
                const days = Math.floor((today.getTime() - new Date(r.due_date).getTime()) / 86400000);
                return (
                  <Link key={r.id} href={`/dashboard/invoices/${r.id}`} className="block px-5 py-3 hover:bg-zinc-50 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-zinc-900 font-mono tracking-tight">{r.number}</div>
                        <div className="text-[12px] text-zinc-500 mt-0.5 truncate">{r.customer_name || '—'}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[13px] font-mono font-semibold text-red-600 tabular-nums">{fmtEur(Number(r.total))}</div>
                        <div className="text-[10px] text-red-500 mt-0.5 font-medium">{days} dní po splatnosti</div>
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

function MetricCard({
  label, value, hint, icon, href, valueVariant, hintVariant,
}: {
  label: string; value: string; hint: string;
  icon: React.ReactNode;
  href?: string;
  valueVariant?: 'red' | 'green';
  hintVariant?: 'red';
}) {
  const valueColor = valueVariant === 'red' ? 'text-red-600' : valueVariant === 'green' ? 'text-emerald-600' : 'text-zinc-900';
  const hintColor = hintVariant === 'red' ? 'text-red-600 font-medium' : 'text-zinc-500';
  const inner = (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">{label}</div>
        <span className="text-zinc-400">{icon}</span>
      </div>
      <div className={`text-[22px] font-bold tracking-[-0.02em] tabular-nums ${valueColor}`}>{value}</div>
      <div className={`text-[11px] mt-1.5 ${hintColor}`}>{hint}</div>
    </>
  );
  return href ? (
    <Link href={href} className="bg-white border border-zinc-100 rounded-2xl p-5 hover:border-zinc-200 hover:bg-zinc-50 transition-colors block">
      {inner}
    </Link>
  ) : (
    <div className="bg-white border border-zinc-100 rounded-2xl p-5">{inner}</div>
  );
}
