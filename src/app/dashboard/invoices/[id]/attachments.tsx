'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { Paperclip, Upload, Trash2, Loader2, FileText } from 'lucide-react';
import { fmtDate } from '@/lib/utils';

type Doc = { id: string; name: string; type: string | null; mime_type: string | null; storage_path: string; file_size: number | null; created_at: string };

export default function InvoiceAttachments({ invoiceId, companyId }: { invoiceId: string; companyId: string }) {
  const toast = useToast();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const sb = createClient();
    const { data } = await sb.from('documents').select('id, name, type, mime_type, storage_path, file_size, created_at').eq('invoice_id', invoiceId).order('created_at', { ascending: false });
    setDocs((data as Doc[]) || []);
  }
  useEffect(() => { load(); }, [invoiceId]);

  async function handleFile(file: File) {
    setUploading(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setUploading(false); return; }
    const path = `${companyId}/${invoiceId}/${Date.now()}-${file.name.replace(/[^A-Za-z0-9._-]+/g, '_')}`;
    const { error: upErr } = await sb.storage.from('documents').upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) { setUploading(false); toast(upErr.message, 'error'); return; }
    const { error: docErr } = await sb.from('documents').insert({
      company_id: companyId,
      name: file.name,
      type: file.name.split('.').pop()?.toLowerCase() || 'file',
      mime_type: file.type,
      storage_path: path,
      file_size: file.size,
      invoice_id: invoiceId,
      created_by: user.id,
    });
    setUploading(false);
    if (docErr) { toast(docErr.message, 'error'); return; }
    toast('Príloha nahraná', 'success');
    load();
  }

  async function download(d: Doc) {
    const sb = createClient();
    const { data, error } = await sb.storage.from('documents').createSignedUrl(d.storage_path, 60);
    if (error || !data) { toast(error?.message || 'Chyba', 'error'); return; }
    window.open(data.signedUrl, '_blank');
  }

  async function remove(d: Doc) {
    if (!confirm(`Zmazať prílohu „${d.name}"?`)) return;
    const sb = createClient();
    await sb.storage.from('documents').remove([d.storage_path]);
    await sb.from('documents').delete().eq('id', d.id);
    toast('Príloha zmazaná', 'success');
    load();
  }

  return (
    <Card className="mb-4">
      <CardHeader
        title="Prílohy"
        subtitle={docs.length === 0 ? 'Žiadne prílohy' : `${docs.length} súborov · uložené v archíve`}
        action={
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-700 text-white text-[13px] font-medium rounded-lg cursor-pointer transition-colors">
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? 'Nahrávam…' : 'Nahrať'}
            <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} disabled={uploading} />
          </label>
        }
      />
      {docs.length === 0 ? (
        <div className="px-5 py-8 text-center text-zinc-400 text-sm flex items-center justify-center gap-2">
          <Paperclip size={14} /> PDF, JPG, foto účtenky alebo iný doklad
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {docs.map((d) => (
            <div key={d.id} className="px-5 py-2.5 flex items-center justify-between gap-3 text-sm">
              <button onClick={() => download(d)} className="flex items-center gap-2 hover:underline text-left">
                <FileText size={14} className="text-zinc-400" />
                <span className="font-medium">{d.name}</span>
                <span className="text-xs text-zinc-500">{d.file_size ? `${(d.file_size / 1024).toFixed(1)} KB` : ''} · {fmtDate(d.created_at)}</span>
              </button>
              <button onClick={() => remove(d)} className="text-zinc-400 hover:text-red-600" title="Zmazať"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
