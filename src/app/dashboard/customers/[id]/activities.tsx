'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, Field, Input, Select, Textarea, Button, Badge } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { Phone, Mail, MessageCircle, Calendar, FileText, Trash2, Plus } from 'lucide-react';

type Act = { id: string; type: string; content: string | null; occurred_at: string };

const TYPE_ICON: Record<string, React.ReactNode> = {
  call: <Phone size={14} />,
  email: <Mail size={14} />,
  note: <MessageCircle size={14} />,
  meeting: <Calendar size={14} />,
  document: <FileText size={14} />,
};

export default function ContactActivities({ contactId, companyId }: { contactId: string; companyId: string }) {
  const toast = useToast();
  const [items, setItems] = useState<Act[]>([]);
  const [draft, setDraft] = useState({ type: 'note', content: '', occurred_at: new Date().toISOString().slice(0, 16) });
  const [saving, setSaving] = useState(false);

  async function load() {
    const sb = createClient();
    const { data } = await sb.from('contact_activities').select('id, type, content, occurred_at').eq('contact_id', contactId).order('occurred_at', { ascending: false }).limit(100);
    setItems((data as Act[]) || []);
  }
  useEffect(() => { load(); }, [contactId]);

  async function add() {
    if (!draft.content.trim()) { toast('Pridaj poznámku', 'error'); return; }
    setSaving(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from('contact_activities').insert({
      company_id: companyId,
      contact_id: contactId,
      type: draft.type,
      content: draft.content,
      occurred_at: new Date(draft.occurred_at).toISOString(),
      created_by: user?.id,
    });
    setSaving(false);
    if (error) { toast(error.message, 'error'); return; }
    setDraft({ ...draft, content: '' });
    load();
  }

  async function remove(id: string) {
    if (!confirm('Zmazať aktivitu?')) return;
    const sb = createClient();
    await sb.from('contact_activities').delete().eq('id', id);
    load();
  }

  return (
    <Card className="mb-4">
      <CardHeader title="Aktivity & komunikácia" subtitle={`${items.length} záznamov`} />
      <div className="p-5 border-b border-zinc-100 bg-zinc-50/40">
        <div className="grid sm:grid-cols-[120px_1fr_180px] gap-2 items-end">
          <Field label="Typ">
            <Select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
              <option value="note">Poznámka</option>
              <option value="call">Hovor</option>
              <option value="email">Email</option>
              <option value="meeting">Stretnutie</option>
              <option value="document">Doklad</option>
            </Select>
          </Field>
          <Field label="Obsah">
            <Input value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} placeholder="Stručná poznámka, výsledok hovoru, dohoda…" />
          </Field>
          <Field label="Kedy">
            <Input type="datetime-local" value={draft.occurred_at} onChange={(e) => setDraft({ ...draft, occurred_at: e.target.value })} />
          </Field>
        </div>
        <div className="flex justify-end mt-3">
          <Button variant="primary" onClick={add} disabled={saving}><Plus size={14} /> Pridať</Button>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-zinc-500">Žiadne aktivity</div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {items.map((i) => (
            <div key={i.id} className="px-5 py-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0">
                  {TYPE_ICON[i.type] || <MessageCircle size={14} />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="gray">{i.type}</Badge>
                    <span className="text-xs text-zinc-500">{new Date(i.occurred_at).toLocaleString('sk-SK')}</span>
                  </div>
                  <div className="text-sm text-zinc-900 mt-1 whitespace-pre-wrap break-words">{i.content}</div>
                </div>
              </div>
              <button onClick={() => remove(i.id)} className="text-zinc-400 hover:text-red-600 shrink-0"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
