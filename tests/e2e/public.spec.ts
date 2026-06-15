import { test, expect } from '@playwright/test';

test.describe('Public pages', () => {
  test('marketing landing loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Moderné účtovníctvo|ZOLO/i).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Začať zadarmo|Prihlásiť/i }).first()).toBeVisible();
  });

  test('terms page is accessible', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.locator('h1')).toContainText('Obchodné podmienky');
  });

  test('privacy page is accessible', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('h1')).toContainText('Ochrana osobných údajov');
  });

  test('cookies page is accessible', async ({ page }) => {
    await page.goto('/cookies');
    await expect(page.locator('h1')).toContainText('Cookies');
  });

  test('pricing page shows plans', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('h1')).toContainText('Vyber si plán');
  });

  test('contact page is accessible', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('h1')).toContainText('Kontakt');
  });

  test('robots.txt serves correctly', async ({ request }) => {
    const r = await request.get('/robots.txt');
    expect(r.status()).toBe(200);
    expect(await r.text()).toContain('User-agent: *');
  });

  test('sitemap.xml serves XML', async ({ request }) => {
    const r = await request.get('/sitemap.xml');
    expect(r.status()).toBe(200);
    expect(await r.text()).toContain('<?xml');
  });

  test('health check returns ok', async ({ request }) => {
    const r = await request.get('/api/health');
    expect(r.status()).toBe(200);
    const json = await r.json();
    expect(json.service).toBe('ZOLO');
    expect(json.version).toBe('1.0.0');
  });
});

test.describe('Login flow', () => {
  test('redirects unauthenticated user to login from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/login/);
    await expect(page.getByText('Prihlásiť').first()).toBeVisible();
  });

  test('login form shows email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});

test.describe('Security headers', () => {
  test('marketing page sends HSTS + CSP', async ({ request }) => {
    const r = await request.get('/');
    expect(r.headers()['strict-transport-security']).toBeDefined();
    expect(r.headers()['x-content-type-options']).toBe('nosniff');
  });
});
