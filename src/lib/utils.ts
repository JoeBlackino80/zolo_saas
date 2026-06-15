import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtEur(n: number) {
  return new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(n || 0);
}

export function fmtDate(d: string | Date) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('sk-SK');
}
