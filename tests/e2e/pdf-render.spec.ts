import { test, expect } from '@playwright/test';

const EMAIL = process.env.SMOKE_EMAIL!;
const PASSWORD = process.env.SMOKE_PASSWORD!;
const INVOICE_ID = process.env.INVOICE_ID!;

test('PDF endpoint renders real PDF when authenticated', async ({ page, context }) => {
  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', EMAIL);
  await page.fill('input[autocomplete="current-password"]', PASSWORD);
  await page.click('button[type="submit"]:has-text("Prihlásiť sa")');
  await page.waitForURL(/\/dashboard|\/onboarding/, { timeout: 15000 });

  // Use the authenticated browser context to fetch the PDF
  const resp = await context.request.get(`/api/invoice-pdf?id=${INVOICE_ID}`);
  expect(resp.status(), 'PDF endpoint should return 200 when authenticated').toBe(200);
  expect(resp.headers()['content-type']).toContain('application/pdf');
  const buf = await resp.body();
  // Real PDF starts with %PDF-
  const head = buf.slice(0, 5).toString('utf8');
  expect(head, 'response is a real PDF').toBe('%PDF-');
  expect(buf.length, 'PDF has reasonable size').toBeGreaterThan(1000);
  console.log(`PDF size: ${(buf.length / 1024).toFixed(1)} KB`);
});
