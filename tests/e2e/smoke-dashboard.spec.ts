import { test, expect, Page } from '@playwright/test';

const ROUTES = [
  '/dashboard',
  '/dashboard/invoices',
  '/dashboard/invoices/new',
  '/dashboard/customers',
  '/dashboard/customers/new',
  '/dashboard/quotes',
  '/dashboard/approvals',
  '/dashboard/receivables',
  '/dashboard/cashflow',
  '/dashboard/reports',
  '/dashboard/links',
  '/dashboard/vat',
  '/dashboard/optimize',
  '/dashboard/vat-return',
  '/dashboard/control-statement',
  '/dashboard/summary-statement',
  '/dashboard/tax-returns',
  '/dashboard/edane',
  '/dashboard/ekasa',
  '/dashboard/calendar',
  '/dashboard/journal',
  '/dashboard/journal/new',
  '/dashboard/chart-of-accounts',
  '/dashboard/chart-of-accounts/new',
  '/dashboard/cash-book',
  '/dashboard/cash-book/new',
  '/dashboard/bank-accounts',
  '/dashboard/bank-accounts/new',
  '/dashboard/projects',
  '/dashboard/projects/new',
  '/dashboard/cost-centers',
  '/dashboard/assets',
  '/dashboard/assets/new',
  '/dashboard/payroll',
  '/dashboard/payroll/calc',
  '/dashboard/payroll/new',
  '/dashboard/stock',
  '/dashboard/stock-movements',
  '/dashboard/travel',
  '/dashboard/travel/new',
  '/dashboard/income-tax',
  '/dashboard/closing',
  '/dashboard/products',
  '/dashboard/products/new',
  '/dashboard/import',
  '/dashboard/bank',
  '/dashboard/recurring',
  '/dashboard/team',
  '/dashboard/audit',
  '/dashboard/settings',
  '/dashboard/settings/branding',
  '/dashboard/settings/companies/new',
  '/dashboard/settings/email',
  '/dashboard/settings/notifications',
  '/dashboard/settings/payments',
  '/dashboard/settings/preferences',
  '/dashboard/settings/webhooks',
  '/dashboard/help',
  '/dashboard/profile',
];

const EMAIL = process.env.SMOKE_EMAIL!;
const PASSWORD = process.env.SMOKE_PASSWORD!;

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', EMAIL);
  await page.fill('input[autocomplete="current-password"]', PASSWORD);
  await page.click('button[type="submit"]:has-text("Prihlásiť sa")');
  await page.waitForURL((url) => url.pathname.startsWith('/dashboard') || url.pathname === '/onboarding', { timeout: 15000 });
}

test.describe.configure({ mode: 'serial' });

test('login once', async ({ page }) => {
  await login(page);
});

for (const route of ROUTES) {
  test(`route ${route}`, async ({ page }) => {
    await login(page);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push('JS: ' + e.message));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push('Console: ' + msg.text().slice(0, 200)); });
    const resp = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(resp, `no response for ${route}`).not.toBeNull();
    const status = resp!.status();
    expect(status, `${route} → HTTP ${status}`).toBeLessThan(500);
    // Wait a beat for client-side hydration / data loads
    await page.waitForTimeout(800);
    const html = await page.content();
    expect(html, `${route} body too small`).toMatch(/<body[^>]*>[\s\S]{200,}/);
    // No "Internal server error" / Next error screen
    expect(html, `${route} shows error overlay`).not.toMatch(/Application error|Internal Server Error|500: This page could not be loaded/);
    // Collect (don't fail) console errors — print for visibility
    if (errors.length) console.warn(`[${route}] errors:`, errors.slice(0, 3));
  });
}
