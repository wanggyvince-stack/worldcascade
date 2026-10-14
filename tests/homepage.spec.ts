import { test, expect } from '@playwright/test';

test.describe('WorldCascade Homepage', () => {
  const KNOWN_DOMAINS = [
    'ai', 'demographics', 'energy', 'cross-domain',
    'space', 'space-economy', 'biotech', 'quantum', 'climate', 'space-alien',
  ];

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.p-card', { timeout: 15_000 });
  });

  test('page title contains WorldCascade', async ({ page }) => {
    await expect(page).toHaveTitle(/WorldCascade/i);
  });

  test('all 80 prediction cards are rendered', async ({ page }) => {
    const cards = page.locator('.p-card');
    await expect(cards).toHaveCount(80);
  });

  test('all 10 domain filter buttons exist', async ({ page }) => {
    // "All" button + 10 domain buttons = 11 total
    const domainBtns = page.locator('.domain-btn');
    await expect(domainBtns).toHaveCount(KNOWN_DOMAINS.length + 1);

    // Verify "All" button is present and active by default
    const allBtn = page.locator('.domain-btn[data-domain="all"]');
    await expect(allBtn).toBeVisible();
    await expect(allBtn).toHaveClass(/active/);
  });

  test('each known domain filter button is present', async ({ page }) => {
    for (const domain of KNOWN_DOMAINS) {
      const btn = page.locator(`.domain-btn[data-domain="${domain}"]`);
      await expect(btn).toBeVisible({ timeout: 5_000 });
    }
  });

  test('every card displays title, domain tag, and engine score', async ({ page }) => {
    const cards = page.locator('.p-card');
    const count = await cards.count();
    expect(count).toBe(80);

    for (let i = 0; i < Math.min(count, 10); i++) {
      const card = cards.nth(i);

      // Title exists and is non-empty
      const title = card.locator('.p-title');
      await expect(title).toBeVisible();
      const titleText = await title.textContent();
      expect(titleText?.trim().length).toBeGreaterThan(0);

      // Domain tag exists
      const domainTag = card.locator('.p-domain-tag');
      await expect(domainTag).toBeVisible();
      const domainText = await domainTag.textContent();
      expect(domainText?.trim().length).toBeGreaterThan(0);

      // Engine score (numeric value)
      const scoreVal = card.locator('.p-score-val');
      await expect(scoreVal).toBeVisible();
      const scoreText = await scoreVal.textContent();
      expect(parseFloat(scoreText || '0')).toBeGreaterThan(0);
    }
  });

  test('cards show confidence percentage (original confidence)', async ({ page }) => {
    const cards = page.locator('.p-card');
    // Check first 5 cards have "orig XX%" text
    for (let i = 0; i < 5; i++) {
      const origText = cards.nth(i).locator('.p-orig');
      await expect(origText).toBeVisible();
      const text = await origText.textContent();
      expect(text).toMatch(/orig\s+\d+%/);
    }
  });

  test('card hover produces visual feedback', async ({ page }) => {
    const card = page.locator('.p-card').first();

    // Get initial box shadow or transform
    const beforeHover = await card.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        transform: style.transform,
        boxShadow: style.boxShadow,
      };
    });

    await card.hover();

    // After hover, check that some visual property changed
    const afterHover = await card.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        transform: style.transform,
        boxShadow: style.boxShadow,
      };
    });

    // At least one visual property should change on hover
    const changed =
      beforeHover.transform !== afterHover.transform ||
      beforeHover.boxShadow !== afterHover.boxShadow;
    expect(changed).toBeTruthy();
  });

  test('predictions section is visible with correct heading', async ({ page }) => {
    const section = page.locator('#predictions');
    await expect(section).toBeVisible();

    const heading = page.locator('#predictions-title');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/80 predictions/i);
  });

  test('confidence filter buttons exist and work', async ({ page }) => {
    const highBtn = page.locator('.conf-btn[data-conf="high"]');
    await expect(highBtn).toBeVisible();

    await highBtn.click();
    await page.waitForTimeout(500);

    // After filtering, card count should be less than 80
    const cards = page.locator('.p-card');
    const count = await cards.count();
    expect(count).toBeLessThan(80);
    expect(count).toBeGreaterThan(0);
  });
});
