import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/ratelimit';
import type { NextRequest } from 'next/server';

// GET /api/gdpr-export
// Returns ZIP/JSON of all user's data (GDPR Article 20 — Right to Data Portability)
// Rate limited to 3/hour per user (heavy DB read across 13 tables)
export async function GET(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(`gdpr-export:${user.id}:${getClientIp(req)}`, 3, 3600_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Rate limit exceeded — max 3 exportov za hodinu' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) } }
    );
  }

  // Fetch all user data
  const [companies, contacts, invoices, items, payments, journal, jLines, accounts, employees, payslips, assets, products, audit] = await Promise.all([
    sb.from('companies').select('*'),
    sb.from('contacts').select('*'),
    sb.from('invoices').select('*'),
    sb.from('invoice_items').select('*'),
    sb.from('invoice_payments').select('*'),
    sb.from('journal_entries').select('*'),
    sb.from('journal_entry_lines').select('*'),
    sb.from('chart_of_accounts').select('*'),
    sb.from('employees').select('*'),
    sb.from('payslips').select('*'),
    sb.from('assets').select('*'),
    sb.from('products').select('*'),
    sb.from('audit_log').select('*').limit(1000),
  ]);

  const data = {
    export_metadata: {
      generated_at: new Date().toISOString(),
      generated_for: user.email,
      user_id: user.id,
      gdpr_article: 20,
      format: 'JSON',
      version: '1.0',
    },
    user: { id: user.id, email: user.email, created_at: user.created_at, last_sign_in: user.last_sign_in_at },
    companies: companies.data,
    contacts: contacts.data,
    invoices: invoices.data,
    invoice_items: items.data,
    invoice_payments: payments.data,
    journal_entries: journal.data,
    journal_entry_lines: jLines.data,
    chart_of_accounts: accounts.data,
    employees: employees.data,
    payslips: payslips.data,
    assets: assets.data,
    products: products.data,
    audit_log: audit.data,
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="zolo-export-${user.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
