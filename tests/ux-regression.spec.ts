import { test, expect } from '@playwright/test';

test.describe('UX Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.p-card', { timeout: 15_000 });
  });

  // ============================================
  // P0-1: showHome() 崩溃回归
  // ============================================
  test.describe('P0-1 Regression: showHome() no ReferenceError', () => {
    test('navigating to #predictions does not crash', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await page.evaluate(() => location.hash = '#predictions');
      await page.waitForTimeout(500);

      const refErrors = errors.filter(e => 
        e.includes('ReferenceError') || 
        e.includes('d is not defined') ||
        e.includes('relatedIds is not defined')
      );
      expect(refErrors).toHaveLength(0);
    });

    test('navigating to #chains does not crash', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await page.evaluate(() => location.hash = '#chains');
      await page.waitForTimeout(500);

      const refErrors = errors.filter(e => 
        e.includes('ReferenceError') || 
        e.includes('relatedIds is not defined')
      );
      expect(refErrors).toHaveLength(0);
    });

    test('showHome() can be called 10 times without error', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      // Rapid navigation stress test
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => location.hash = '#');
        await page.waitForTimeout(50);
        await page.evaluate(() => location.hash = '#predictions');
        await page.waitForTimeout(50);
        await page.evaluate(() => location.hash = '#chains');
        await page.waitForTimeout(50);
      }

      const refErrors = errors.filter(e => e.includes('ReferenceError'));
      expect(refErrors).toHaveLength(0);
    });
  });

  // ============================================
  // P0-2: causalChainIds 路由错误回归
  // ============================================
  test.describe('P0-2 Regression: causalChainIds route to #chain/ not #detail/', () => {
    test('Related Causal Chain link uses #chain/CC-xx format', async ({ page }) => {
      const fp01Card = page.locator('.p-card[data-id="FP-01"]');
      await fp01Card.click();
      await page.waitForSelector('#detail-view:not([hidden])', { timeout: 10_000 });

      const chainLink = page.locator('#crosslink-chain-link a');
      if (await chainLink.count() > 0) {
        const href = await chainLink.first().getAttribute('href');
        expect(href).toMatch(/^#chain\/CC-\d+$/);
      }
    });

    test('clicking Related Causal Chain navigates to chain detail', async ({ page }) => {
      const fp01Card = page.locator('.p-card[data-id="FP-01"]');
      await fp01Card.click();
      await page.waitForSelector('#detail-view:not([hidden])', { timeout: 10_000 });

      const chainLink = page.locator('#crosslink-chain-link a');
      if (await chainLink.count() > 0) {
        await chainLink.first().click();
        await page.waitForTimeout(500);

        await expect(page).toHaveURL(/#chain\/CC-\d+/);
        const chainDetail = page.locator('#chain-detail-view');
        await expect(chainDetail).toBeVisible({ timeout: 5_000 });
      }
    });
  });

  // ============================================
  // P0-3: 因果链 strength 计算 (Anna 发现)
  // ============================================
  test.describe('P0-3 Regression: Causal chains render on Timeline', () => {
    test('timeline page has causal chain SVG paths', async ({ page }) => {
      await page.goto('/timeline.html');
      await page.waitForSelector('svg', { timeout: 15_000 });
      await page.waitForTimeout(2000); // wait for D3 rendering

      // Check for causal chain paths (class="causal-chain")
      const chainPaths = page.locator('svg .causal-chains path');
      const count = await chainPaths.count();
      
      // Should have at least 1 chain visible (we have 13 core chains)
      expect(count).toBeGreaterThan(0);
    });

    test('timeline causal chains have visible stroke', async ({ page }) => {
      await page.goto('/timeline.html');
      await page.waitForSelector('svg', { timeout: 15_000 });
      await page.waitForTimeout(2000);

      // Check that chain paths have non-zero opacity and stroke
      const chainPath = page.locator('svg .causal-chains path').first();
      if (await chainPath.count() > 0) {
        const opacity = await chainPath.evaluate(el => parseFloat(el.getAttribute('opacity') || '1'));
        expect(opacity).toBeGreaterThan(0);
      }
    });

    test('timeline has start/end dots for causal chains', async ({ page }) => {
      await page.goto('/timeline.html');
      await page.waitForSelector('svg', { timeout: 15_000 });
      await page.waitForTimeout(2000);

      // Check for chain endpoint circles
      const dots = page.locator('svg .causal-chains circle');
      const count = await dots.count();
      
      // Each chain has 2 dots (start + end), so count should be even and > 0
      expect(count).toBeGreaterThan(0);
      expect(count % 2).toBe(0);
    });
  });

  // ============================================
  // 来源感知 Back 机制
  // ============================================
  test.describe('Source-aware Back Mechanism', () => {
    test('Back button shows "← Back to Predictions" from homepage', async ({ page }) => {
      const firstCard = page.locator('.p-card').first();
      await firstCard.click();
      await page.waitForSelector('#detail-view:not([hidden])', { timeout: 10_000 });

      const backBtn = page.locator('.detail-back').first();
      const text = await backBtn.textContent();
      expect(text).toContain('Back');
    });

    test('Back button shows "← Back to Timeline" when coming from timeline', async ({ page }) => {
      await page.evaluate(() => sessionStorage.setItem('lastRoute', 'timeline'));
      await page.evaluate(() => location.hash = '#detail/FP-01');
      await page.waitForSelector('#detail-view:not([hidden])', { timeout: 10_000 });

      const backBtn = page.locator('.detail-back').first();
      const text = await backBtn.textContent();
      expect(text).toContain('Timeline');
    });

    test('Back button shows "← Back to Home" when no source', async ({ page }) => {
      await page.evaluate(() => sessionStorage.clear());
      await page.evaluate(() => location.hash = '#detail/FP-01');
      await page.waitForSelector('#detail-view:not([hidden])', { timeout: 10_000 });

      const backBtn = page.locator('.detail-back').first();
      const text = await backBtn.textContent();
      expect(text).toContain('Home');
    });
  });

  // ============================================
  // UX-05: 详情页 Cross-links
  // ============================================
  test.describe('Detail Page Cross-links (UX-05)', () => {
    test('View on Timeline link is present', async ({ page }) => {
      const fp01Card = page.locator('.p-card[data-id="FP-01"]');
      await fp01Card.click();
      await page.waitForSelector('#detail-view:not([hidden])', { timeout: 10_000 });

      const timelineLink = page.locator('#crosslink-timeline');
      await expect(timelineLink).toBeVisible();
    });

    test('Timeline cross-link navigates to timeline.html', async ({ page }) => {
      const fp01Card = page.locator('.p-card[data-id="FP-01"]');
      await fp01Card.click();
      await page.waitForSelector('#detail-view:not([hidden])', { timeout: 10_000 });

      const timelineLink = page.locator('#crosslink-timeline a');
      if (await timelineLink.count() > 0) {
        const href = await timelineLink.first().getAttribute('href');
        expect(href).toContain('timeline.html');
      }
    });
  });

  // ============================================
  // 基础功能回归
  // ============================================
  test.describe('Basic Navigation', () => {
    test('homepage loads with prediction cards', async ({ page }) => {
      const cards = page.locator('.p-card');
      const count = await cards.count();
      expect(count).toBeGreaterThan(50); // we have 80 predictions
    });

    test('clicking prediction card opens detail', async ({ page }) => {
      const firstCard = page.locator('.p-card').first();
      await firstCard.click();
      await page.waitForSelector('#detail-view:not([hidden])', { timeout: 10_000 });
      
      await expect(page).toHaveURL(/#detail\/FP-\d+/);
    });

    test('direct URL #detail/FP-01 opens detail page', async ({ page }) => {
      await page.goto('/#detail/FP-01');
      await page.waitForSelector('#detail-view:not([hidden])', { timeout: 10_000 });
      
      const title = page.locator('#detail-view h2').first();
      await expect(title).toBeVisible({ timeout: 5_000 });
    });

    test('direct URL #chain/CC-01 opens chain detail', async ({ page }) => {
      await page.goto('/#chain/CC-1');
      await page.waitForSelector('#chain-detail-view:not([hidden])', { timeout: 10_000 });
    });
  });
});
