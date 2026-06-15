import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="text-center max-w-md">
        <div className="text-7xl font-extrabold bg-gradient-to-br from-blue-500 to-purple-500 bg-clip-text text-transparent">404</div>
        <h1 className="text-2xl font-bold text-slate-900 mt-4">Stránka neexistuje</h1>
        <p className="text-slate-600 mt-2">Hľadanú stránku sme nenašli. Možno bola presunutá alebo zmazaná.</p>
        <Link href="/dashboard" className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/25 hover:translate-y-[-1px] transition">
          <Home size={16} /> Späť na dashboard
        </Link>
      </div>
    </div>
  );
}
