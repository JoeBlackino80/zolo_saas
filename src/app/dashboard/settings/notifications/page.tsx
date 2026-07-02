'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, Card, CardHeader, Button, Input, Field, Badge, Select } from '@/components/ui';
import { ArrowLeft, Plus, Trash2, Bell } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

type Rule = {
  id?: string;
  rule_type: string;
  trigger_event: string;
  days_offset: number;
  recipient: string;
  template_subject: string;
  is_active: boolean;
};

const TYPES = [
  { key: 'before_due', label: 'Pred splatnosťou' },
  { key: 'after_due', label: 'Po splatnosti' },
  { key: 'invoice_issued', label: 'Pri vystavení faktúry' },
  { key: 'monthly_summary', label: 'Mesačné zhrnutie' },
];

export default function NotificationsPage() {
  const toast = useToast();
  const [rules, setRules] = useState<Rule[]>([]);
  const [newRule, setNewRule] = useState<Rule>({
    rule_type: 'before_due',
    trigger_event: 'days',
    days_offset: 3,
    recipient: 'customer',
    template_subject: 'Pripomenutie',
    is_active: true,
  });

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('notification_rules').select('*').order('created_at', { ascending: false });
      setRules(data || []);
    })();
  }, []);

  async function addRule() {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const companyId = typeof window !== 'undefined' ? localStorage.getItem('zolo_firm') : null;
    if (!companyId) { toast('Najprv vyber firmu v sidebare', 'error'); return; }
    const { error, data } = await sb.from('notification_rules').insert([{ ...newRule, company_id: companyId, type: newRule.rule_type, enabled: newRule.is_active, created_by: user.id }]).select().single();
    if (error) { toast(error.message, 'error'); return; }
    setRules([data, ...rules]);
    toast('Pravidlo pridané', 'success');
  }

  async function delRule(id: string) {
    if (!confirm('Zmazať pravidlo?')) return;
    await createClient().from('notification_rules').delete().eq('id', id);
    setRules(rules.filter((r) => r.id !== id));
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <PageHeader back={{ href: "/dashboard/settings" }} title="Notifikácie & upomienky" subtitle="Pravidlá pre automatické upomienky klientom" />

      <Card className="mb-4">
        <CardHeader title="Pridať pravidlo" />
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Typ">
            <Select value={newRule.rule_type} onChange={(e) => setNewRule({ ...newRule, rule_type: e.target.value })}>
              {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </Select>
          </Field>
          <Field label="Dní pred/po">
            <Input type="number" value={newRule.days_offset} onChange={(e) => setNewRule({ ...newRule, days_offset: +e.target.value })} />
          </Field>
          <Field label="Príjemca">
            <Select value={newRule.recipient} onChange={(e) => setNewRule({ ...newRule, recipient: e.target.value })}>
              <option value="customer">Zákazník</option>
              <option value="me">Ja (vlastník)</option>
              <option value="accountant">Účtovníčka</option>
            </Select>
          </Field>
          <Field label="Predmet">
            <Input value={newRule.template_subject} onChange={(e) => setNewRule({ ...newRule, template_subject: e.target.value })} />
          </Field>
          <div className="col-span-2">
            <Button variant="primary" onClick={addRule}><Plus size={14} /> Pridať pravidlo</Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={`Aktívne pravidlá (${rules.length})`} />
        {rules.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500"><Bell size={20} className="mx-auto mb-2 text-zinc-300" />Žiadne pravidlá zatiaľ</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {rules.map((r) => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{TYPES.find((t) => t.key === r.rule_type)?.label}</div>
                  <div className="text-xs text-zinc-500">{r.days_offset} dní · → {r.recipient}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.is_active ? 'green' : 'gray'}>{r.is_active ? 'aktívne' : 'pauzované'}</Badge>
                  <button onClick={() => delRule(r.id!)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
