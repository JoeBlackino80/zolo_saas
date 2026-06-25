'use client';

import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function MobileTopbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Apply / remove sidebar overlay classes
  useEffect(() => {
    const sidebar = document.querySelector('aside.sidebar-aside');
    if (!sidebar) return;
    if (open) {
      sidebar.classList.remove('hidden');
      sidebar.classList.add('fixed', 'top-12', 'left-0', 'right-0', 'bottom-0', 'z-50', 'w-72', 'shadow-2xl');
      document.body.style.overflow = 'hidden';
    } else {
      sidebar.classList.add('hidden');
      sidebar.classList.remove('fixed', 'top-12', 'left-0', 'right-0', 'bottom-0', 'z-50', 'w-72', 'shadow-2xl');
      document.body.style.overflow = '';
    }
  }, [open]);

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      <div className="md:hidden flex items-center justify-between bg-zinc-950 text-white p-3 sticky top-0 z-40 h-12">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white text-zinc-900 flex items-center justify-center font-black text-sm tracking-tight">Z</div>
          <span className="font-semibold text-sm tracking-tight">ZOLO</span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="w-9 h-9 rounded-md hover:bg-white/10 flex items-center justify-center"
          aria-label="Menu"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {open && (
        <div
          className="md:hidden fixed inset-0 top-12 left-72 bg-black/50 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
