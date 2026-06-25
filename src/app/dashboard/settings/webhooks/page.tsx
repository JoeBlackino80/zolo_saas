'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, Card, CardHeader, Button, Input, Field, Badge, EmptyState } from '@/components/ui';
import { ArrowLeft, Plus, Trash2, Webhook } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

type Hook = {
  id?: string;
  webhook_url: string;
  events: string[];
  is_active: boolean;
};

const EVENTS = ['invoice.created', 'invoice.status_changed', 'invoice.paid', 'invoice.overdue', 'all'];

export default function WebhooksPage() {
  const toast = useToast();
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [newHook, setNewHook] = useState<Hook>({ webhook_url: '', events: [], is_active: true });

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('webhook_configs').select('*').order('created_at', { ascending: false });
      setHooks(data || []);
    })();
  }, []);

  async function addHook() {
    if (!newHook.webhook_url.trim()) { toast('URL je povinné', 'error'); return; }
    if (newHook.events.length === 0) { toast('Vyber aspoň 1 event', 'error'); return; }
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const companyId = typeof window !== 'undefined' ? localStorage.getItem('zolo_firm') : null;
    if (!companyId) { toast('Najprv vyber firmu v sidebare', 'error'); return; }
    const { error, data } = await sb.from('webhook_configs').insert([{ ...newHook, company_id: companyId, created_by: user.id }]).select().single();
    if (error) { toast(error.message, 'error'); return; }
    setHooks([data, ...hooks]);
    setNewHook({ webhook_url: '', events: [], is_active: true });
    toast('Webhook pridaný', 'success');
  }

  async function delHook(id: string) {
    if (!confirm('Zmazať webhook?')) return;
    const sb = createClient();
    await sb.from('webhook_configs').delete().eq('id', id);
    setHooks(hooks.filter((h) => h.id !== id));
    toast('Zmazané', 'success');
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <Link href="/dashboard/settings" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-3">
        <ArrowLeft size={14} /> Späť na nastavenia
      </Link>
      <PageHeader title="Webhooks" subtitle="POST notifikácie pri eventoch (N8N · Zapier · Make · custom)" />

      <Card className="mb-4">
        <CardHeader title="Pridať webhook" />
        <div className="p-5 space-y-4">
          <Field label="Webhook URL" hint="POST request s JSON payload">
            <Input value={newHook.webhook_url} onChange={(e) => setNewHook({ ...newHook, webhook_url: e.target.value })} placeholder="https://hook.zapier.com/hooks/..." />
          </Field>
          <Field label="Eventy" hint="Vyber ktoré eventy spôsobia POST">
            <div className="grid grid-cols-2 gap-2">
              {EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newHook.events.includes(ev)}
                    onChange={(e) => {
                      const next = e.target.checked ? [...newHook.events, ev] : newHook.events.filter((x) => x !== ev);
                      setNewHook({ ...newHook, events: next });
                    }}
                  />
                  <span className="font-mono text-xs">{ev}</span>
                </label>
              ))}
            </div>
          </Field>
          <Button variant="primary" onClick={addHook}><Plus size={14} /> Pridať webhook</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title={`Aktívne webhooks (${hooks.length})`} />
        {hooks.length === 0 ? (
          <EmptyState icon={<Webhook size={24} />} title="Žiadne webhooks" description="Pridaj webhook pre integráciu s N8N, Zapier alebo Make." />
        ) : (
          <div className="divide-y divide-slate-100">
            {hooks.map((h) => (
              <div key={h.id} className="px-5 py-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="font-mono text-xs text-slate-700 break-all">{h.webhook_url}</div>
                  <button onClick={() => delHook(h.id!)} className="text-red-500 hover:bg-red-50 p-1 rounded flex-shrink-0"><Trash2 size={14} /></button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {h.events.map((e) => <Badge key={e} variant="blue">{e}</Badge>)}
                  <Badge variant={h.is_active ? 'green' : 'gray'}>{h.is_active ? 'aktívny' : 'pauzovaný'}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
