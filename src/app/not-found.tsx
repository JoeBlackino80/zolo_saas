import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold tracking-[-0.04em] text-zinc-900">404</div>
        <h1 className="text-2xl font-bold text-zinc-900 mt-4 tracking-tight">Stránka neexistuje</h1>
        <p className="text-zinc-600 mt-2">Hľadanú stránku sme nenašli. Možno bola presunutá alebo zmazaná.</p>
        <Link href="/dashboard" className="inline-flex items-center gap-2 mt-6 px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-[14px] font-medium rounded-full transition-colors">
          <Home size={16} /> Späť na dashboard
        </Link>
      </div>
    </div>
  );
}
