'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Card, Badge, Button } from '@/components/ui';
import { Bell, Check, X } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';

type N = { id: string; type: string; title: string; message: string | null; link: string | null; is_read: boolean; created_at: string };

const TYPE_LABEL: Record<string, string> = {
  info: 'Info', success: 'Hotovo', warning: 'Upozornenie', error: 'Chyba',
  invoice_paid: 'Faktúra zaplatená', invoice_overdue: 'Po splatnosti', payroll_run: 'Mzdový beh',
};

export default function NotificationsPage() {
  const toast = useToast();
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');
  const [items, setItems] = useState<N[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const sb = createClient();
    let q = sb.from('notifications').select('id, type, title, message, link, is_read, created_at').order('created_at', { ascending: false }).limit(200);
    if (filter === 'unread') q = q.eq('is_read', false);
    const { data } = await q;
    setItems((data as N[]) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [filter]);

  async function markAllRead() {
    const sb = createClient();
    await sb.from('notifications').update({ is_read: true }).eq('is_read', false);
    toast('Označené ako prečítané', 'success');
    load();
  }
  async function toggleRead(id: string, read: boolean) {
    const sb = createClient();
    await sb.from('notifications').update({ is_read: !read }).eq('id', id);
    load();
  }
  async function remove(id: string) {
    const sb = createClient();
    await sb.from('notifications').delete().eq('id', id);
    load();
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <PageHeader
        title="Notifikácie"
        subtitle={`${items.length} ${filter === 'unread' ? 'neprečítaných' : 'celkom'}`}
        actions={
          <div className="flex gap-2">
            <Button variant={filter === 'unread' ? 'primary' : 'secondary'} onClick={() => setFilter('unread')}>Neprečítané</Button>
            <Button variant={filter === 'all' ? 'primary' : 'secondary'} onClick={() => setFilter('all')}>Všetky</Button>
            <Button variant="secondary" onClick={markAllRead}><Check size={14} /> Označiť všetky</Button>
          </div>
        }
      />

      {loading ? (
        <Card><div className="p-10 text-center text-zinc-500">Načítavam…</div></Card>
      ) : items.length === 0 ? (
        <Card>
          <div className="p-10 text-center">
            <Bell size={32} className="mx-auto mb-3 text-zinc-300" />
            <div className="text-zinc-500">{filter === 'unread' ? 'Žiadne nové notifikácie' : 'Žiadne notifikácie'}</div>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-zinc-100">
            {items.map((n) => (
              <div key={n.id} className={`px-5 py-3 flex items-start justify-between gap-3 ${!n.is_read ? 'bg-blue-50/30' : ''}`}>
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!n.is_read ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-500'}`}>
                    <Bell size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {n.link ? <Link href={n.link} className="font-semibold text-zinc-900 hover:underline">{n.title}</Link> : <span className="font-semibold text-zinc-900">{n.title}</span>}
                      <Badge variant="gray">{TYPE_LABEL[n.type] || n.type}</Badge>
                      {!n.is_read && <Badge variant="blue">nové</Badge>}
                    </div>
                    {n.message && <div className="text-sm text-zinc-600 mt-1">{n.message}</div>}
                    <div className="text-xs text-zinc-400 mt-1">{new Date(n.created_at).toLocaleString('sk-SK')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleRead(n.id, n.is_read)} className="text-zinc-400 hover:text-zinc-900 p-1" title={n.is_read ? 'Označiť ako neprečítané' : 'Označiť ako prečítané'}>
                    <Check size={14} />
                  </button>
                  <button onClick={() => remove(n.id)} className="text-zinc-400 hover:text-red-600 p-1" title="Vymazať">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
