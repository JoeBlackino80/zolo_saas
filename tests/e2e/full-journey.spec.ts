import { test, expect } from '@playwright/test';

const EMAIL = process.env.JOURNEY_EMAIL!;
const PW = process.env.JOURNEY_PASSWORD!;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  // Pre-create + auto-confirm test user via Supabase Admin API (bypasses email confirmation)
  const SROLE = process.env.SROLE!;
  const r = await request.post('https://knijcjrpmgkuwnkvgpeu.supabase.co/auth/v1/admin/users', {
    headers: { 'apikey': SROLE, 'Authorization': `Bearer ${SROLE}`, 'Content-Type': 'application/json' },
    data: { email: EMAIL, password: PW, email_confirm: true },
  });
  if (!r.ok()) throw new Error('failed to create user: ' + (await r.text()));
});

test('full journey — login, onboarding, FA creation, detail', async ({ page }) => {
  test.setTimeout(120_000);

  // 1. Landing
  await page.goto('/');
  await expect(page.locator('body')).toContainText(/ZOLO/i);

  // 2. Login (user pre-created+confirmed in beforeAll)
  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', EMAIL);
  await page.fill('input[autocomplete="current-password"]', PW);
  await page.click('button[type="submit"]:has-text("Prihlásiť sa")');

  // 3. Fresh user with no company → should be on /dashboard with empty state OR onboarding
  await page.waitForURL((url) => url.pathname.startsWith('/dashboard') || url.pathname === '/onboarding', { timeout: 15_000 });
  if (page.url().includes('/dashboard')) {
    // Click "Create first company" CTA
    const createBtn = page.locator('a:has-text("Vytvoriť prvú firmu"), a:has-text("Vystaviť prvú faktúru")').first();
    if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createBtn.click();
    } else {
      await page.goto('/onboarding');
    }
  }
  // Onboarding step 0 → 1
  await page.waitForURL(/\/onboarding/, { timeout: 10_000 });
  await expect(page.locator('body')).toContainText(/Vitaj v ZOLO/i);
  await page.click('button:has-text("Začať")');
  await expect(page.locator('body')).toContainText(/IČO/);

  // ORSR lookup
  await page.fill('input[maxlength="8"]', '35804807');
  await page.click('button:has-text("Hľadať")');
  // Wait for step 2 (Detaily firmy heading)
  await page.waitForSelector('h2:has-text("Detaily firmy")', { timeout: 15_000 });

  // Create company
  await page.click('button:has-text("Vytvoriť firmu")');
  await page.waitForURL(/\/dashboard\b/, { timeout: 15_000 });

  // 8. Should see coaching banner for first invoice
  await expect(page.locator('body')).toContainText(/Vystav svoju prvú faktúru|30 sekúnd/i, { timeout: 5000 });

  // 9. Click create invoice
  await page.click('a:has-text("Vystaviť prvú faktúru")');
  await page.waitForURL(/\/invoices\/new/, { timeout: 10_000 });

  // 10. Auto-suggested number should be visible (poll up to 8s)
  const numInput = page.locator('input[placeholder*="FA-"]').first();
  await expect.poll(async () => await numInput.inputValue(), { timeout: 8000 }).toMatch(/FA-\d{4}-\d{4}/);

  // 11. Fill customer fields
  await page.fill('input[type="email"][placeholder*="zakaznik"]', 'journey-customer@example.com');
  await page.locator('text=Názov zákazníka').first().locator('..').locator('input').fill('E2E Klient s.r.o.');

  // 12. Fill first item
  await page.locator('input[placeholder*="Tovar"]').first().fill('Test služba');

  // 13. Save invoice
  await page.click('button:has-text("Vystaviť doklad")');
  await page.waitForURL(/\/dashboard\/invoices(?:\?|$)/, { timeout: 15_000 });

  // 14. Invoice should appear in list
  await expect(page.locator('body')).toContainText(/E2E Klient/i);

  // 15. Open the invoice detail — click first FA-number link (UUID in href, NOT /new or sidebar)
  const detailLink = page.locator('a[href^="/dashboard/invoices/"]').filter({ hasNotText: 'Nový' }).filter({ hasText: /FA-/ }).first();
  await detailLink.click({ timeout: 5000 });
  await page.waitForURL(/\/dashboard\/invoices\/[a-f0-9-]{36}/, { timeout: 10_000 });

  // 16. Verify reminders card is visible
  await expect(page.locator('body')).toContainText(/Pripomienky platby|3 dni pred/i);

  // 17. PDF download link works (wait for client hydration first)
  await page.waitForLoadState('networkidle', { timeout: 10_000 });
  const pdfDl = page.locator('a[href*="/api/invoice-pdf"]').first();
  await expect(pdfDl).toBeVisible({ timeout: 5000 });
  const pdfHref = await pdfDl.getAttribute('href');
  expect(pdfHref).toMatch(/\/api\/invoice-pdf\?id=/);
});
