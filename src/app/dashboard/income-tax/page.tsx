import ComingSoon from '@/components/ComingSoon';
import { Receipt } from 'lucide-react';

export default function IncomeTaxPage() {
  return <ComingSoon title="Daň z príjmov" subtitle="DZP FO (typ A/B), DZP PO" icon={<Receipt size={24} />} desc="Modul DZP je v príprave. Aktuálne dostupné v existujúcom ZOLO HTML." />;
}
