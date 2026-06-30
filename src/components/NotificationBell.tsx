'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type N = { id: string; type: string; title: string; message: string | null; link: string | null; is_read: boolean; created_at: string };

export default function NotificationBell() {
  const [items, setItems] = useState<N[]>([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  async function load() {
    const sb = createClient();
    const { data } = await sb.from('notifications').select('id, type, title, message, link, is_read, created_at').order('created_at', { ascending: false }).limit(10);
    setItems((data as N[]) || []);
    setUnread((data as N[] || []).filter((n) => !n.is_read).length);
  }
  useEffect(() => {
    load();
    const id = setInterval(load, 60_000); // refresh every 60s
    return () => clearInterval(id);
  }, []);

  async function markRead(id: string) {
    const sb = createClient();
    await sb.from('notifications').update({ is_read: true }).eq('id', id);
    load();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 hover:bg-white/10 rounded-md transition-colors text-zinc-400 hover:text-zinc-100"
        aria-label="Notifikácie"
      >
        <Bell size={15} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1.5 w-80 bg-white text-zinc-900 rounded-xl shadow-2xl border border-zinc-200 z-50 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-zinc-100 flex items-center justify-between">
              <div className="font-semibold text-sm">Notifikácie</div>
              <Link href="/dashboard/notifications" onClick={() => setOpen(false)} className="text-xs text-zinc-500 hover:text-zinc-900">Všetky →</Link>
            </div>
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-zinc-500">Žiadne notifikácie</div>
            ) : (
              <div className="max-h-96 overflow-y-auto divide-y divide-zinc-100">
                {items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => { if (n.link) window.location.href = n.link; markRead(n.id); setOpen(false); }}
                    className={`w-full px-4 py-2.5 text-left hover:bg-zinc-50 ${!n.is_read ? 'bg-blue-50/40' : ''}`}
                  >
                    <div className="text-sm font-medium text-zinc-900 truncate">{n.title}</div>
                    {n.message && <div className="text-xs text-zinc-600 mt-0.5 truncate">{n.message}</div>}
                    <div className="text-[10px] text-zinc-400 mt-1">{new Date(n.created_at).toLocaleString('sk-SK')}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
