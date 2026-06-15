'use client';

import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function MobileTopbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sidebar = document.querySelector('aside.sidebar-aside');
    if (!sidebar) return;
    if (open) {
      sidebar.classList.remove('hidden');
      sidebar.classList.add('fixed', 'inset-0', 'z-50');
    } else {
      sidebar.classList.add('hidden');
      sidebar.classList.remove('fixed', 'inset-0', 'z-50');
    }
  }, [open]);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener('popstate', close);
    return () => window.removeEventListener('popstate', close);
  }, []);

  return (
    <div className="md:hidden flex items-center justify-between bg-slate-950 text-white p-3 sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-extrabold text-sm">Z</div>
        <span className="font-semibold text-sm">ZOLO</span>
      </div>
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-md hover:bg-white/10 flex items-center justify-center"
        aria-label="Menu"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>
    </div>
  );
}
