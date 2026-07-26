'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { Pencil } from 'lucide-react';
import AddContactModal from '@/components/AddContactModal';

type Contact = {
  id: string;
  company_id: string;
  type?: string;
  name?: string;
  ico?: string | null;
  dic?: string | null;
  ic_dph?: string | null;
  street?: string | null;
  city?: string | null;
  zip?: string | null;
  email?: string | null;
  phone?: string | null;
};

export default function EditContactButton({ contact }: { contact: Contact }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Pencil size={14} /> Upraviť
      </Button>
      {open && (
        <AddContactModal
          companyId={contact.company_id}
          editContact={contact}
          onClose={() => setOpen(false)}
          onCreated={() => { setOpen(false); router.refresh(); }}
        />
      )}
    </>
  );
}
