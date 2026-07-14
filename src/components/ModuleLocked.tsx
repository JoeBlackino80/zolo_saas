import { Card } from '@/components/ui';
import { Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { PLANS, type Module } from '@/lib/modules';

const MODULE_LABELS: Record<Module, string> = {
  invoicing: 'Fakturácia',
  finance: 'Financie',
  accounting: 'Účtovníctvo',
  taxes: 'Dane',
  reports: 'Reporty',
  payroll: 'Mzdy',
  warehouse: 'Sklad',
  ai: 'AI asistent',
  api: 'REST API',
  multi_company: 'Viac firiem',
};

export default function ModuleLocked({ module }: { module: Module }) {
  const label = MODULE_LABELS[module];
  // Nájdi najlacnejší plán ktorý má tento modul
  const eligiblePlans = Object.entries(PLANS)
    .filter(([, p]) => p.modules.includes(module))
    .map(([code, p]) => ({ code, ...p }));
  const cheapest = eligiblePlans[0];

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <Card>
        <div className="p-10 text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center">
            <Lock size={24} />
          </div>
          <h1 className="text-[26px] font-bold text-zinc-900 tracking-[-0.02em]">
            {label} nie je v tvojom pláne
          </h1>
          <p className="text-[14px] text-zinc-500 mt-3 leading-relaxed max-w-md mx-auto">
            Tento modul vyžaduje aktivovaný plán, ktorý ho obsahuje. V súčasnom pláne nemáš prístup k tejto sekcii.
          </p>

          {cheapest && (
            <div className="mt-6 inline-flex flex-col gap-3">
              <div className="text-[11px] uppercase tracking-[0.1em] text-zinc-500 font-semibold">
                Dostupné v pláne
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold text-zinc-900">{cheapest.label}</span>
                <span className="text-[13px] text-zinc-500">·</span>
                <span className="text-[15px] font-semibold text-zinc-900">{cheapest.price}</span>
              </div>
              <p className="text-[12px] text-zinc-600 max-w-sm">{cheapest.description}</p>
            </div>
          )}

          <div className="mt-8 flex gap-2 justify-center">
            <Link
              href="/dashboard/settings/subscription"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium bg-zinc-900 text-white hover:bg-zinc-700 tracking-tight"
            >
              <Sparkles size={13} /> Upgradovať plán
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 rounded-lg text-[13px] text-zinc-600 hover:text-zinc-900 tracking-tight"
            >
              Späť na dashboard
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
