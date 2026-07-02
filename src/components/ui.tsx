'use client';

import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }
>(function Button({ variant = 'secondary', className, ...props }, ref) {
  const base = 'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium tracking-tight transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-zinc-900 text-white hover:bg-zinc-700',
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
        'w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 transition-colors',
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
        'w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-[13px] text-zinc-900 focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 transition-colors',
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
        'w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 transition-colors',
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
