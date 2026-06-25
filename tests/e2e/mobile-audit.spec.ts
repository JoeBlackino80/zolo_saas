import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'] });

test.describe('Mobile — public pages', () => {
  test('landing usable, no horizontal scroll', async ({ page }) => {
    await page.goto('/');
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const cw = await page.evaluate(() => document.documentElement.clientWidth);
    expect(sw - cw, 'horizontal scroll on landing').toBeLessThanOrEqual(1);
    await expect(page.getByRole('link', { name: /Prihlásiť|Začať/i }).first()).toBeVisible();
  });

  test('login page form fits in viewport', async ({ page }) => {
    await page.goto('/login');
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const cw = await page.evaluate(() => document.documentElement.clientWidth);
    expect(sw - cw, 'horizontal scroll on login').toBeLessThanOrEqual(1);
    const emailInput = page.locator('input[autocomplete="email"]');
    await expect(emailInput).toBeVisible();
    const box = await emailInput.boundingBox();
    // Touch target — at least 36 px tall
    expect(box?.height, 'email input too small for touch').toBeGreaterThanOrEqual(36);
  });

  test('pricing page tables scroll horizontally if needed', async ({ page }) => {
    await page.goto('/pricing');
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const cw = await page.evaluate(() => document.documentElement.clientWidth);
    expect(sw - cw, 'horizontal scroll on pricing').toBeLessThanOrEqual(1);
  });

  test('contact page form readable', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('h1')).toBeVisible();
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const cw = await page.evaluate(() => document.documentElement.clientWidth);
    expect(sw - cw, 'horizontal scroll on contact').toBeLessThanOrEqual(1);
  });
});
