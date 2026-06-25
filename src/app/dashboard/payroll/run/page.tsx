'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, Card, CardHeader, Button, Field, Input, Select, Badge } from '@/components/ui';
import { ArrowLeft, Calculator, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { calcPayroll } from '@/lib/payroll';
import { fmtEur } from '@/lib/utils';
import { useToast } from '@/components/Toast';

const MONTH_LABELS = ['Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún', 'Júl', 'August', 'September', 'Október', 'November', 'December'];

type Employee = { id: string; name: string; surname: string; active: boolean };
type Contract = { employee_id: string; gross_salary: number; contract_type: string | null };
type RowState = { employee_id: string; name: string; gross: number; childCount: number };

export default function PayrollRunPage() {
  const router = useRouter();
  const toast = useToast();
  const search = useSearchParams();
  const initialPeriod = search.get('period') || new Date().toISOString().slice(0, 7);
  const [period, setPeriod] = useState(initialPeriod);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [rows, setRows] = useState<RowState[]>([]);
  const [existingRunId, setExistingRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data: cos } = await sb.from('companies').select('id, name').is('deleted_at', null).order('name');
      setCompanies(cos || []);
      const cid = (typeof window !== 'undefined' && localStorage.getItem('zolo_firm')) || cos?.[0]?.id || '';
      setCompanyId(cid);
    })();
  }, []);

  useEffect(() => {
    if (!companyId || !period) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const sb = createClient();
      const [y, m] = period.split('-').map(Number);

      // Check for existing run
      const { data: run } = await sb.from('payroll_runs').select('id').eq('company_id', companyId).eq('period_year', y).eq('period_month', m).is('deleted_at', null).maybeSingle();

      let initialRows: RowState[] = [];
      if (run) {
        setExistingRunId(run.id);
        const { data: items } = await sb.from('payroll_items').select('employee_id, employee_name, gross_salary').eq('payroll_run_id', run.id);
        initialRows = (items || []).map((it) => ({ employee_id: it.employee_id, name: it.employee_name || '—', gross: Number(it.gross_salary || 0), childCount: 0 }));
      } else {
        setExistingRunId(null);
        const { data: emps } = await sb.from('employees').select('id, name, surname, active').eq('company_id', companyId).eq('active', true).is('deleted_at', null);
        const { data: contracts } = await sb.from('employee_contracts').select('employee_id, gross_salary, contract_type').is('deleted_at', null);
        const contractMap = new Map<string, Contract>();
        (contracts || []).forEach((c) => contractMap.set(c.employee_id, c as Contract));
        initialRows = (emps || []).map((e: Employee) => ({
          employee_id: e.id,
          name: `${e.surname} ${e.name}`.trim(),
          gross: Number(contractMap.get(e.id)?.gross_salary || 0),
          childCount: 0,
        }));
      }
      setRows(initialRows);
      setLoading(false);
    })();
  }, [companyId, period]);

  const calculated = rows.map((r) => ({ row: r, calc: calcPayroll(r.gross, { childCount: r.childCount }) }));
  const totals = calculated.reduce((acc, x) => ({
    gross: acc.gross + x.calc.gross,
    net: acc.net + x.calc.net,
    emp_sp: acc.emp_sp + x.calc.emp_sp,
    emp_zp: acc.emp_zp + x.calc.emp_zp,
    tax: acc.tax + x.calc.tax,
    empr: acc.empr + x.calc.employer_contributions,
    totalCost: acc.totalCost + x.calc.totalCost,
  }), { gross: 0, net: 0, emp_sp: 0, emp_zp: 0, tax: 0, empr: 0, totalCost: 0 });

  function setRow(i: number, k: keyof RowState, v: string | number) {
    const next = [...rows];
    // @ts-expect-error generic
    next[i][k] = v;
    setRows(next);
  }

  async function save(finalize: boolean) {
    if (!companyId || rows.length === 0) { toast('Žiadni zamestnanci', 'error'); return; }
    setSaving(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { toast('Nie si prihlásený', 'error'); setSaving(false); return; }
    const [y, m] = period.split('-').map(Number);

    let runId = existingRunId;
    if (runId) {
      // Update existing — replace items
      await sb.from('payroll_items').delete().eq('payroll_run_id', runId);
      await sb.from('payroll_runs').update({
        total_gross: +totals.gross.toFixed(2),
        total_net: +totals.net.toFixed(2),
        total_employer_cost: +totals.totalCost.toFixed(2),
        status: finalize ? 'finalized' : 'draft',
      }).eq('id', runId);
    } else {
      const { data: newRun, error } = await sb.from('payroll_runs').insert({
        company_id: companyId,
        period_year: y, period_month: m,
        status: finalize ? 'finalized' : 'draft',
        total_gross: +totals.gross.toFixed(2),
        total_net: +totals.net.toFixed(2),
        total_employer_cost: +totals.totalCost.toFixed(2),
        created_by: user.id,
      }).select('id').single();
      if (error || !newRun) { toast(error?.message || 'Chyba pri ukladaní', 'error'); setSaving(false); return; }
      runId = newRun.id;
      setExistingRunId(runId);
    }

    const itemRows = calculated.map((x) => ({
      payroll_run_id: runId,
      company_id: companyId,
      employee_id: x.row.employee_id,
      employee_name: x.row.name,
      gross_salary: +x.calc.gross.toFixed(2),
      total_gross: +x.calc.gross.toFixed(2),
      net_salary: +x.calc.net.toFixed(2),
      employee_insurance: +(x.calc.emp_sp + x.calc.emp_zp).toFixed(2),
      employer_insurance: +x.calc.employer_contributions.toFixed(2),
      tax: +x.calc.tax.toFixed(2),
      surcharges: 0,
      sick_leave: 0,
    }));
    const { error: itemsErr } = await sb.from('payroll_items').insert(itemRows);
    if (itemsErr) { toast(itemsErr.message, 'error'); setSaving(false); return; }

    toast(finalize ? 'Beh uzamknutý' : 'Uložené ako draft', 'success');
    setSaving(false);
    router.refresh();
  }

  async function discard() {
    if (!existingRunId) return;
    if (!confirm('Vymazať tento mzdový beh?')) return;
    const sb = createClient();
    await sb.from('payroll_runs').update({ deleted_at: new Date().toISOString() }).eq('id', existingRunId);
    toast('Vymazané', 'success');
    router.push('/dashboard/payroll');
  }

  const [y, m] = period.split('-').map(Number);

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      <Link href="/dashboard/payroll" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-3">
        <ArrowLeft size={14} /> Späť na mzdy
      </Link>
      <PageHeader
        title={`Mzdový beh — ${MONTH_LABELS[m - 1]} ${y}`}
        subtitle={existingRunId ? 'Editácia existujúceho behu' : `${rows.length} aktívnych zamestnancov`}
        actions={
          <div className="flex flex-wrap gap-2">
            {existingRunId && <Button variant="ghost" onClick={discard}><Trash2 size={14} /> Vymazať</Button>}
            <Button variant="secondary" onClick={() => save(false)} disabled={saving}><Save size={14} /> Uložiť draft</Button>
            <Button variant="primary" onClick={() => save(true)} disabled={saving}><Calculator size={14} /> Uzavrieť beh</Button>
          </div>
        }
      />

      <Card className="mb-4">
        <CardHeader title="Parametre" />
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Firma">
            <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Obdobie">
            <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </Field>
        </div>
      </Card>

      {loading ? (
        <Card><div className="p-10 text-center text-sm text-slate-500">Načítavam zamestnancov…</div></Card>
      ) : rows.length === 0 ? (
        <Card><div className="p-10 text-center text-sm text-slate-500">Žiadni aktívni zamestnanci v tejto firme. <Link href="/dashboard/payroll/new" className="text-blue-600 hover:underline">Pridať zamestnanca →</Link></div></Card>
      ) : (
        <>
          <Card className="mb-4">
            <CardHeader title="Zamestnanci a mzdy" subtitle="Uprav hrubú mzdu a počet detí; výpočet je live" />
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    <th className="text-left px-5 py-3">Zamestnanec</th>
                    <th className="text-right px-3 py-3">Hrubá mzda</th>
                    <th className="text-center px-3 py-3">Deti</th>
                    <th className="text-right px-3 py-3">SP zamest.</th>
                    <th className="text-right px-3 py-3">ZP zamest.</th>
                    <th className="text-right px-3 py-3">Daň</th>
                    <th className="text-right px-3 py-3 bg-blue-50">Čistá mzda</th>
                    <th className="text-right px-3 py-3">Odvody zam.dáv.</th>
                    <th className="text-right px-5 py-3">Spolu náklad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calculated.map((x, i) => (
                    <tr key={x.row.employee_id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-900">{x.row.name}</td>
                      <td className="px-3 py-3 text-right">
                        <input type="number" step="0.01" value={x.row.gross} onChange={(e) => setRow(i, 'gross', +e.target.value)} className="w-28 bg-white border border-slate-200 rounded px-2 py-1 text-right font-mono text-sm" />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input type="number" min="0" max="10" value={x.row.childCount} onChange={(e) => setRow(i, 'childCount', +e.target.value)} className="w-14 bg-white border border-slate-200 rounded px-2 py-1 text-center font-mono text-sm" />
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-slate-700">{fmtEur(x.calc.emp_sp)}</td>
                      <td className="px-3 py-3 text-right font-mono text-slate-700">{fmtEur(x.calc.emp_zp)}</td>
                      <td className="px-3 py-3 text-right font-mono text-slate-700">{fmtEur(x.calc.tax)}</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-slate-900 bg-blue-50/40">{fmtEur(x.calc.net)}</td>
                      <td className="px-3 py-3 text-right font-mono text-slate-700">{fmtEur(x.calc.employer_contributions)}</td>
                      <td className="px-5 py-3 text-right font-mono font-medium">{fmtEur(x.calc.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white text-sm font-semibold">
                    <td className="px-5 py-3">Spolu</td>
                    <td className="px-3 py-3 text-right font-mono">{fmtEur(totals.gross)}</td>
                    <td></td>
                    <td className="px-3 py-3 text-right font-mono">{fmtEur(totals.emp_sp)}</td>
                    <td className="px-3 py-3 text-right font-mono">{fmtEur(totals.emp_zp)}</td>
                    <td className="px-3 py-3 text-right font-mono">{fmtEur(totals.tax)}</td>
                    <td className="px-3 py-3 text-right font-mono bg-blue-700">{fmtEur(totals.net)}</td>
                    <td className="px-3 py-3 text-right font-mono">{fmtEur(totals.empr)}</td>
                    <td className="px-5 py-3 text-right font-mono">{fmtEur(totals.totalCost)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card><div className="p-4"><div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Hrubé mzdy</div><div className="text-lg font-bold mt-1">{fmtEur(totals.gross)}</div></div></Card>
            <Card><div className="p-4"><div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Čisté mzdy</div><div className="text-lg font-bold mt-1 text-emerald-600">{fmtEur(totals.net)}</div></div></Card>
            <Card><div className="p-4"><div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Daň + SP/ZP zamest.</div><div className="text-lg font-bold mt-1 text-red-600">{fmtEur(totals.emp_sp + totals.emp_zp + totals.tax)}</div></div></Card>
            <Card><div className="p-4"><div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Spolu náklad firmy</div><div className="text-lg font-bold mt-1">{fmtEur(totals.totalCost)}</div><div className="text-xs text-slate-500 mt-1">vrátane odvodov zam.dáv.</div></div></Card>
          </div>
        </>
      )}
    </div>
  );
}
