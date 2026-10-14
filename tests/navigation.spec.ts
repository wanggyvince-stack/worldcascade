import { test, expect } from '@playwright/test';

test.describe('WorldCascade Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.p-card', { timeout: 15_000 });
  });

  test.describe('Prediction Card → Detail View', () => {
    test('clicking the first card opens detail view', async ({ page }) => {
      const firstCard = page.locator('.p-card').first();
      const cardId = await firstCard.getAttribute('data-id');

      await firstCard.click();

      // Detail view should become visible
      const detailView = page.locator('#detail-view');
      await expect(detailView).toBeVisible({ timeout: 10_000 });

      // URL should contain detail hash
      await expect(page).toHaveURL(/#detail/);
    });

    test('detail view shows correct FP-01 data (title, predictionContent, verificationCriteria)', async ({ page }) => {
      // Click the card with data-id="FP-01"
      const fp01Card = page.locator('.p-card[data-id="FP-01"]');
      await fp01Card.click();

      const detailView = page.locator('#detail-view');
      await expect(detailView).toBeVisible({ timeout: 10_000 });

      // Title should be non-empty and in English
      const title = page.locator('#detail-title');
      await expect(title).toBeVisible();
      const titleText = await title.textContent();
      expect(titleText?.trim().length).toBeGreaterThan(0);
      // English text check: should not contain CJK characters
      expect(titleText).not.toMatch(/[\u4e00-\u9fff]/);

      // Prediction content should be non-empty
      const content = page.locator('#detail-content');
      await expect(content).toBeVisible();
      const contentText = await content.textContent();
      expect(contentText?.trim().length).toBeGreaterThan(0);

      // Verification criteria should be non-empty
      const criteria = page.locator('#detail-criteria');
      await expect(criteria).toBeVisible();
      const criteriaText = await criteria.textContent();
      expect(criteriaText?.trim().length).toBeGreaterThan(0);
    });

    test('"← Back to Predictions" button scrolls back to predictions section', async ({ page }) => {
      // Open a detail view
      const firstCard = page.locator('.p-card').first();
      await firstCard.click();
      await page.waitForSelector('#detail-view:not([hidden])', { timeout: 10_000 });

      // Click back button
      const backBtn = page.locator('.detail-back').first();
      await expect(backBtn).toBeVisible();
      await backBtn.click();

      // Should navigate back to #predictions
      await expect(page).toHaveURL(/#predictions/, { timeout: 10_000 });

      // Predictions section should be visible
      const predictionsSection = page.locator('#predictions');
      await expect(predictionsSection).toBeVisible({ timeout: 5_000 });

      // Detail view should be hidden
      const detailView = page.locator('#detail-view');
      const isHidden = await detailView.evaluate(el => el.hasAttribute('hidden'));
      expect(isHidden).toBeTruthy();
    });

    test('clicking the same card twice switches views correctly', async ({ page }) => {
      const card = page.locator('.p-card').first();
      const cardId = await card.getAttribute('data-id');

      // First click → detail view
      await card.click();
      await expect(page.locator('#detail-view')).toBeVisible({ timeout: 10_000 });

      // Go back
      await page.locator('.detail-back').first().click();
      await expect(page).toHaveURL(/#predictions/, { timeout: 10_000 });
      await page.waitForSelector('.p-card', { timeout: 10_000 });

      // Second click on same card → detail view again
      await card.click();
      await expect(page.locator('#detail-view')).toBeVisible({ timeout: 10_000 });
      await expect(page).toHaveURL(/#detail/);
    });

    test('browser back button returns to homepage', async ({ page }) => {
      // Navigate to detail
      const card = page.locator('.p-card').first();
      await card.click();
      await expect(page.locator('#detail-view')).toBeVisible({ timeout: 10_000 });

      // Browser back
      await page.goBack();
      await expect(page).toHaveURL(/#predictions|\/$/, { timeout: 10_000 });

      // Cards should be visible again
      await expect(page.locator('.p-card').first()).toBeVisible({ timeout: 10_000 });
    });

    test('clicking different cards switches detail content', async ({ page }) => {
      // Click FP-01
      await page.locator('.p-card[data-id="FP-01"]').click();
      await expect(page.locator('#detail-view')).toBeVisible({ timeout: 10_000 });
      const title1 = await page.locator('#detail-title').textContent();

      // Go back
      await page.locator('.detail-back').first().click();
      await page.waitForSelector('.p-card', { timeout: 10_000 });

      // Click FP-02
      await page.locator('.p-card[data-id="FP-02"]').click();
      await expect(page.locator('#detail-view')).toBeVisible({ timeout: 10_000 });
      const title2 = await page.locator('#detail-title').textContent();

      // Titles should be different
      expect(title1?.trim()).not.toBe(title2?.trim());
    });
  });

  test.describe('Causal Chain Navigation', () => {
    test('clicking a causal chain card opens chain detail view', async ({ page }) => {
      // Scroll to chains section
      await page.locator('#chains').scrollIntoViewIfNeeded();
      await page.waitForSelector('.chain', { timeout: 10_000 });

      const chainCards = page.locator('.chain');
      const chainCount = await chainCards.count();
      expect(chainCount).toBe(3);

      // Click first chain
      await chainCards.first().click();

      // Chain detail view should become visible
      const chainDetail = page.locator('#chain-detail-view');
      await expect(chainDetail).toBeVisible({ timeout: 10_000 });
    });

    test('chain detail "← Back to Causal Chains" scrolls back to chains section', async ({ page }) => {
      // Navigate to chain detail
      await page.locator('#chains').scrollIntoViewIfNeeded();
      await page.locator('.chain').first().click();
      await expect(page.locator('#chain-detail-view')).toBeVisible({ timeout: 10_000 });

      // Click back
      const backBtn = page.locator('.cd-back').first();
      await expect(backBtn).toBeVisible();
      await backBtn.click();

      // Should show chains section
      await expect(page).toHaveURL(/#chains/, { timeout: 10_000 });
      const chainsSection = page.locator('#chains');
      await expect(chainsSection).toBeVisible({ timeout: 5_000 });

      // Chain detail view should be hidden
      const chainDetail = page.locator('#chain-detail-view');
      const isHidden = await chainDetail.evaluate(el => el.hasAttribute('hidden'));
      expect(isHidden).toBeTruthy();
    });

    test('all 3 causal chains are clickable', async ({ page }) => {
      await page.locator('#chains').scrollIntoViewIfNeeded();
      const chains = page.locator('.chain');
      await expect(chains).toHaveCount(3);

      // Verify each chain has required elements
      for (let i = 0; i < 3; i++) {
        const chain = chains.nth(i);
        await expect(chain.locator('.chain-id')).toBeVisible();
        await expect(chain.locator('.chain-title')).toBeVisible();
        await expect(chain.locator('.chain-desc')).toBeVisible();
      }
    });
  });

  test.describe('Smooth Scroll Behavior', () => {
    test('anchor links scroll smoothly without errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      // Click "Explore Predictions" CTA
      const ctaBtn = page.locator('a[href="#predictions"]');
      if (await ctaBtn.isVisible()) {
        await ctaBtn.click();
        await page.waitForTimeout(1000);
      }

      // No JS errors should have occurred
      expect(errors.filter(e => !e.includes('CORS') && !e.includes('404'))).toHaveLength(0);
    });
  });
});
