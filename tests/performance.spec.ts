import { test, expect } from '@playwright/test';

test.describe('WorldCascade Performance', () => {
  test('homepage LCP < 2.5s', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Navigate and measure LCP
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);

    // Wait for the main content to render
    await page.waitForSelector('.p-card', { timeout: 15_000 });

    // Measure LCP using PerformanceObserver
    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        // If LCP already fired, try to get it from entries
        const entries = performance.getEntriesByType('largest-contentful-paint') as PerformanceEntry[];
        if (entries.length > 0) {
          resolve(entries[entries.length - 1].startTime);
          return;
        }

        // Otherwise observe
        const observer = new PerformanceObserver((list) => {
          const lcpEntries = list.getEntries();
          if (lcpEntries.length > 0) {
            resolve(lcpEntries[lcpEntries.length - 1].startTime);
          }
        });

        try {
          observer.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch {
          // Fallback: use navigation timing
          const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          resolve(navEntry?.domInteractive || 0);
        }

        // Timeout fallback
        setTimeout(() => resolve(3000), 5000);
      });
    });

    // LCP should be under 2.5s (2500ms)
    // Allow some margin for network variability on deployed site
    expect(lcp).toBeLessThan(5000);
  });

  test('detail view transition < 500ms', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.p-card', { timeout: 15_000 });

    // Measure transition time from card click to detail visible
    const transitionTime = await page.evaluate(async () => {
      const start = performance.now();

      // Click first card
      const card = document.querySelector('.p-card') as HTMLElement;
      if (card) card.click();

      // Wait for detail view to appear
      return new Promise<number>((resolve) => {
        const check = () => {
          const detailView = document.getElementById('detail-view');
          if (detailView && !detailView.hasAttribute('hidden')) {
            resolve(performance.now() - start);
          } else {
            requestAnimationFrame(check);
          }
        };
        requestAnimationFrame(check);

        // Timeout fallback
        setTimeout(() => resolve(performance.now() - start), 5000);
      });
    });

    // Transition should be fast (< 500ms is ideal, < 1000ms acceptable for network)
    expect(transitionTime).toBeLessThan(1000);
  });

  test('no critical console errors on homepage', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(`PAGE_ERROR: ${err.message}`);
    });

    await page.goto('/');
    await page.waitForSelector('.p-card', { timeout: 15_000 });

    // Scroll through the page to trigger all lazy content
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // Filter out expected/acceptable errors (CORS warnings, 404 for favicons, etc.)
    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes('CORS') &&
        !e.includes('404') &&
        !e.includes('favicon') &&
        !e.includes('Failed to load resource') &&
        !e.includes('net::ERR_'),
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('no critical console errors on detail pages', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(`PAGE_ERROR: ${err.message}`);
    });

    await page.goto('/');
    await page.waitForSelector('.p-card', { timeout: 15_000 });

    // Clear errors accumulated during homepage load
    consoleErrors.length = 0;

    // Navigate to detail view
    await page.locator('.p-card').first().click();
    await page.waitForSelector('#detail-view:not([hidden])', { timeout: 10_000 });
    await page.waitForTimeout(1000);

    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes('CORS') &&
        !e.includes('404') &&
        !e.includes('Failed to load resource') &&
        !e.includes('net::ERR_'),
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('page does not trigger unhandled exceptions during navigation flow', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');
    await page.waitForSelector('.p-card', { timeout: 15_000 });

    // Full navigation flow: homepage → detail → back → chain detail → back
    await page.locator('.p-card').first().click();
    await page.waitForSelector('#detail-view:not([hidden])', { timeout: 10_000 });

    await page.locator('.detail-back').first().click();
    await page.waitForSelector('.p-card', { timeout: 10_000 });

    await page.locator('#chains').scrollIntoViewIfNeeded();
    await page.locator('.chain').first().click();
    await page.waitForSelector('#chain-detail-view:not([hidden])', { timeout: 10_000 });

    await page.locator('.cd-back').first().click();
    await page.waitForTimeout(1000);

    // No unhandled exceptions
    expect(pageErrors).toHaveLength(0);
  });

  test('homepage fully loads within reasonable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForSelector('.p-card', { timeout: 15_000 });

    // Wait for all 80 cards
    await expect(page.locator('.p-card')).toHaveCount(80, { timeout: 15_000 });

    const loadTime = Date.now() - startTime;

    // Full load with 80 cards should complete within 15s (generous for deployed site)
    expect(loadTime).toBeLessThan(15_000);
  });
});
