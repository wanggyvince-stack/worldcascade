import { test, expect, devices } from '@playwright/test';

const iPhone14 = devices['iPhone 14'];

test.describe('WorldCascade Mobile Responsiveness', () => {
  test.use({
    viewport: { width: 375, height: 812 },
    userAgent: iPhone14.userAgent,
    isMobile: true,
    hasTouch: true,
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.p-card', { timeout: 15_000 });
  });

  test('homepage loads correctly on mobile viewport', async ({ page }) => {
    // Page title
    await expect(page).toHaveTitle(/WorldCascade/i);

    // Cards are rendered
    const cards = page.locator('.p-card');
    await expect(cards).toHaveCount(80);

    // No horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasOverflow).toBeFalsy();
  });

  test('prediction cards display in single-column layout on mobile', async ({ page }) => {
    // Scroll to predictions section
    await page.locator('#predictions').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Check that the grid is single-column
    const gridStyle = await page.locator('#ph-grid').evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        gridTemplateColumns: style.gridTemplateColumns,
      };
    });

    // On mobile, grid should be single column (1fr or similar single value)
    const columns = gridStyle.gridTemplateColumns.split(/\s+/).filter(Boolean);
    expect(columns.length).toBe(1);
  });

  test('card click opens detail view on mobile', async ({ page }) => {
    await page.locator('#predictions').scrollIntoViewIfNeeded();

    const firstCard = page.locator('.p-card').first();
    await expect(firstCard).toBeVisible();

    // Tap (mobile) on card
    await firstCard.tap();

    // Detail view should appear
    const detailView = page.locator('#detail-view');
    await expect(detailView).toBeVisible({ timeout: 10_000 });

    // Title should be readable
    const title = page.locator('#detail-title');
    await expect(title).toBeVisible();
    const titleText = await title.textContent();
    expect(titleText?.trim().length).toBeGreaterThan(0);
  });

  test('back button works correctly on mobile', async ({ page }) => {
    await page.locator('#predictions').scrollIntoViewIfNeeded();

    // Open detail view
    await page.locator('.p-card').first().tap();
    await expect(page.locator('#detail-view')).toBeVisible({ timeout: 10_000 });

    // Tap back button
    const backBtn = page.locator('.detail-back').first();
    await expect(backBtn).toBeVisible();
    await backBtn.tap();

    // Should return to predictions
    await expect(page).toHaveURL(/#predictions/, { timeout: 10_000 });
    await expect(page.locator('.p-card').first()).toBeVisible({ timeout: 10_000 });
  });

  test('domain filter buttons are usable on mobile', async ({ page }) => {
    await page.locator('#predictions').scrollIntoViewIfNeeded();

    // Domain buttons should be visible
    const domainBtns = page.locator('.domain-btn');
    await expect(domainBtns.first()).toBeVisible();

    // Tap a domain filter
    const aiBtn = page.locator('.domain-btn[data-domain="ai"]');
    if (await aiBtn.isVisible()) {
      await aiBtn.tap();
      await page.waitForTimeout(500);

      // Cards should now be filtered (fewer than 80)
      const cards = page.locator('.p-card');
      const count = await cards.count();
      expect(count).toBeLessThan(80);
      expect(count).toBeGreaterThan(0);
    }
  });

  test('causal chains section is accessible on mobile', async ({ page }) => {
    await page.locator('#chains').scrollIntoViewIfNeeded();

    const chains = page.locator('.chain');
    await expect(chains).toHaveCount(3);

    // Each chain should be visible and tappable
    for (let i = 0; i < 3; i++) {
      await expect(chains.nth(i)).toBeVisible();
    }
  });

  test('navigation links are present in mobile header', async ({ page }) => {
    const nav = page.locator('.nav');
    await expect(nav).toBeVisible();

    // Brand should be visible
    const brand = page.locator('.brand');
    await expect(brand).toBeVisible();
  });

  test('hero section renders correctly on mobile', async ({ page }) => {
    const hero = page.locator('.hero');
    await expect(hero).toBeVisible();

    // Hero KV text should be present
    const heroKV = page.locator('.hero-kv');
    await expect(heroKV).toBeVisible();

    // CTA buttons should be visible
    const ctaPrimary = page.locator('.btn-primary');
    await expect(ctaPrimary).toBeVisible();
  });
});
