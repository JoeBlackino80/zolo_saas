'use client';

import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }
>(function Button({ variant = 'secondary', className, ...props }, ref) {
  const base = 'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium tracking-tight transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-teal-800 text-white hover:bg-teal-700 shadow-[0_1px_2px_rgba(19,78,74,0.15)]',
    secondary: 'bg-white border border-zinc-200 text-zinc-800 hover:bg-zinc-50 hover:border-zinc-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100',
  };
  return <button ref={ref} className={cn(base, variants[variant], className)} {...props} />;
});

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 transition-colors',
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-[13px] text-zinc-900 focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 transition-colors',
        className
      )}
      {...props}
    />
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-medium text-zinc-700 tracking-tight">{label}</label>
      {children}
      {hint && <span className="text-[11px] text-zinc-500">{hint}</span>}
    </div>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('bg-white border border-zinc-100 rounded-2xl', className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, action }: { title: React.ReactNode; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-[14px] font-semibold text-zinc-900 tracking-tight truncate">{title}</h3>
        {subtitle && <p className="text-[12px] text-zinc-500 mt-0.5 truncate">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, back }: { title: string; subtitle?: string; actions?: React.ReactNode; back?: { href: string; label?: string } }) {
  return (
    <div className="mb-7">
      {back && (
        <a href={back.href} className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-900 transition-colors mb-3 tracking-tight">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          {back.label || 'Späť'}
        </a>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] sm:text-[28px] font-bold text-zinc-900 tracking-[-0.02em] leading-tight">{title}</h1>
          {subtitle && <p className="text-[14px] text-zinc-500 mt-1.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

export function Badge({ children, variant = 'gray' }: { children: React.ReactNode; variant?: 'gray' | 'green' | 'red' | 'amber' | 'blue' }) {
  const variants = {
    gray: 'bg-zinc-100 text-zinc-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-800',
    blue: 'bg-zinc-900 text-white',
  };
  return <span className={cn('inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-md uppercase tracking-[0.05em]', variants[variant])}>{children}</span>;
}

export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mb-4">{icon}</div>}
      <h3 className="text-[15px] font-semibold text-zinc-900 tracking-tight">{title}</h3>
      {description && <p className="text-[13px] text-zinc-500 mt-1.5 max-w-md leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ==========================================================
   ZOLO SIGNATURE — nové wow komponenty (teal + data-forward)
   ========================================================== */

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-zinc-200 border-b-2 bg-zinc-50 text-[10px] font-mono text-zinc-500 leading-none">
      {children}
    </span>
  );
}

export function SectionLabel({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-teal-50 text-teal-800 border border-teal-100 text-[11px] font-bold uppercase tracking-[0.08em]">
      {icon && <span className="text-teal-600">{icon}</span>}
      {children}
    </span>
  );
}

export function InsightBanner({ title, description, action }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 flex items-center gap-5 text-white"
      style={{ background: 'linear-gradient(135deg, #134e4a 0%, #0f766e 100%)', boxShadow: '0 8px 24px -12px rgba(19,78,74,0.4)' }}>
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 relative">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
      </div>
      <div className="flex-1 relative min-w-0">
        <div className="text-[10px] uppercase tracking-widest font-bold text-teal-100/80">Zolo Intelligence</div>
        <div className="text-[15px] font-bold mt-0.5">{title}</div>
        {description && <div className="text-[13px] text-teal-50/90 mt-1">{description}</div>}
      </div>
      {action && <div className="relative shrink-0">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, delta, deltaTone = 'neutral', hint, children }: {
  label: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
  deltaTone?: 'success' | 'danger' | 'neutral';
  hint?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const deltaClass = deltaTone === 'success' ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
    : deltaTone === 'danger' ? 'text-red-700 bg-red-50 border-red-100'
    : 'text-zinc-600 bg-zinc-50 border-zinc-100';
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 hover:border-zinc-300 hover:shadow-[0_4px_12px_-6px_rgba(28,25,23,0.08)] transition-all">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.08em] font-bold text-zinc-500">{label}</div>
        {delta && <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border', deltaClass)}>{delta}</span>}
      </div>
      <div className="mt-3 text-[32px] font-extrabold tracking-[-0.03em] text-zinc-900 tabular-nums leading-none">{value}</div>
      {hint && <div className="mt-2 text-[11px] text-zinc-500">{hint}</div>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function Sparkline({ points, color = '#0f766e', height = 40 }: { points: number[]; color?: string; height?: number }) {
  if (!points.length) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 200;
  const step = w / (points.length - 1 || 1);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(height - ((p - min) / range) * (height - 4) - 2).toFixed(1)}`).join(' ');
  const area = `${path} L${w},${height} L0,${height} Z`;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="overflow-visible">
      <path d={area} fill={color} opacity="0.12" />
      <path d={path} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={height - ((points[points.length - 1] - min) / range) * (height - 4) - 2} r="3" fill={color} />
    </svg>
  );
}

export function ProgressRing({ value, max = 100, label, sub, size = 140 }: { value: number; max?: number; label?: React.ReactNode; sub?: React.ReactNode; size?: number }) {
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const dash = c * pct;
  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e4e4e7" strokeWidth="10" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#0f766e" strokeWidth="10" fill="none"
          strokeDasharray={c} strokeDashoffset={c - dash} strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset .5s' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label && <div className="text-[24px] font-extrabold text-teal-800 tabular-nums leading-none">{label}</div>}
        {sub && <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mt-1">{sub}</div>}
      </div>
    </div>
  );
}
