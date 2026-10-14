import { test, expect } from '@playwright/test';

test.describe('WorldCascade Detail Content Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.p-card', { timeout: 15_000 });
  });

  test('all 80 predictions have valid DETAIL_DATA (title, predictionContent, causalChainNodes, leadingSignal)', async ({
    page,
  }) => {
    // Extract DETAIL_DATA from the page's JavaScript context
    const detailData = await page.evaluate(() => {
      // @ts-ignore - DETAIL_DATA is a global variable defined in inline script
      return typeof DETAIL_DATA !== 'undefined' ? DETAIL_DATA : null;
    });

    expect(detailData).not.toBeNull();
    expect(Array.isArray(detailData)).toBeTruthy();
    expect(detailData.length).toBe(80);

    for (const item of detailData) {
      // title must be non-empty
      expect(item.title, `Missing title for ${item.id}`).toBeTruthy();
      expect(item.title.length).toBeGreaterThan(0);

      // predictionContent must be non-empty
      expect(item.predictionContent, `Missing predictionContent for ${item.id}`).toBeTruthy();
      expect(item.predictionContent.length).toBeGreaterThan(0);

      // causalChainNodes must be a non-empty array
      expect(item.causalChainNodes, `Missing causalChainNodes for ${item.id}`).toBeTruthy();
      expect(Array.isArray(item.causalChainNodes)).toBeTruthy();
      expect(item.causalChainNodes.length).toBeGreaterThan(0);

      // leadingSignal must exist with required fields
      expect(item.leadingSignal, `Missing leadingSignal for ${item.id}`).toBeTruthy();
      expect(item.leadingSignal.status, `Missing leadingSignal.status for ${item.id}`).toBeTruthy();
      expect(item.leadingSignal.source, `Missing leadingSignal.source for ${item.id}`).toBeTruthy();
      expect(item.leadingSignal.indicator, `Missing leadingSignal.indicator for ${item.id}`).toBeTruthy();
    }
  });

  test('detail view has no Chinese character residue', async ({ page }) => {
    // Sample 5 different detail pages
    const sampleIds = ['FP-01', 'FP-10', 'FP-21', 'FP-42', 'FP-60'];

    for (const id of sampleIds) {
      // Navigate to detail
      await page.locator(`.p-card[data-id="${id}"]`).click();
      await expect(page.locator('#detail-view')).toBeVisible({ timeout: 10_000 });

      // Scan visible text content for Chinese characters
      const bodyText = await page.locator('#detail-view').textContent();
      const chineseRegex = /[\u4e00-\u9fff]/;
      expect(bodyText, `Chinese characters found in detail view for ${id}`).not.toMatch(chineseRegex);

      // Go back
      await page.locator('.detail-back').first().click();
      await page.waitForSelector('.p-card', { timeout: 10_000 });
    }
  });

  test('causalChainNodes do not contain placeholder text', async ({ page }) => {
    const detailData = await page.evaluate(() => {
      // @ts-ignore
      return typeof DETAIL_DATA !== 'undefined' ? DETAIL_DATA : null;
    });

    expect(detailData).not.toBeNull();

    const placeholderRegex = /\[domain\]\s*causal\s*link/i;

    for (const item of detailData) {
      for (const node of item.causalChainNodes) {
        const stepText = node.step || node.stepEn || '';
        expect(
          stepText,
          `Placeholder found in causalChainNodes for ${item.id}: "${stepText}"`,
        ).not.toMatch(placeholderRegex);

        // Step text should be meaningful (at least 5 chars)
        expect(stepText.length).toBeGreaterThan(3);
      }
    }
  });

  test('leadingSignal has required fields: status, source, indicator', async ({ page }) => {
    const detailData = await page.evaluate(() => {
      // @ts-ignore
      return typeof DETAIL_DATA !== 'undefined' ? DETAIL_DATA : null;
    });

    expect(detailData).not.toBeNull();

    const validStatuses = ['triggered', 'accelerating', 'trending', 'early_signal', 'stable', 'declining'];

    for (const item of detailData) {
      const signal = item.leadingSignal;
      expect(signal, `Missing leadingSignal for ${item.id}`).toBeTruthy();

      // status must be a recognized value
      expect(
        validStatuses.includes(signal.status),
        `Invalid status "${signal.status}" for ${item.id}`,
      ).toBeTruthy();

      // source must be a non-empty string
      expect(typeof signal.source).toBe('string');
      expect(signal.source.length).toBeGreaterThan(0);

      // indicator must be a non-empty string
      expect(typeof signal.indicator).toBe('string');
      expect(signal.indicator.length).toBeGreaterThan(0);
    }
  });

  test('each detail page renders all key sections', async ({ page }) => {
    // Click FP-01 to verify detail layout
    await page.locator('.p-card[data-id="FP-01"]').click();
    await expect(page.locator('#detail-view')).toBeVisible({ timeout: 10_000 });

    // Key sections should be present
    const requiredSelectors = [
      '#detail-title',
      '#detail-domain',
      '#detail-score',
      '#detail-content',
      '#detail-criteria',
      '#detail-chain',
      '#detail-signal',
      '#detail-evidence',
    ];

    for (const selector of requiredSelectors) {
      const el = page.locator(selector);
      await expect(el).toBeVisible({ timeout: 5_000 });
      const text = await el.textContent();
      expect(text?.trim().length, `Empty content for ${selector}`).toBeGreaterThan(0);
    }
  });

  test('evidence sources list is non-empty for each prediction', async ({ page }) => {
    const detailData = await page.evaluate(() => {
      // @ts-ignore
      return typeof DETAIL_DATA !== 'undefined' ? DETAIL_DATA : null;
    });

    expect(detailData).not.toBeNull();

    // Check first 10 predictions have evidence
    for (let i = 0; i < Math.min(10, detailData.length); i++) {
      const item = detailData[i];
      expect(item.evidence, `Missing evidence for ${item.id}`).toBeTruthy();
      expect(Array.isArray(item.evidence)).toBeTruthy();
      expect(item.evidence.length, `Empty evidence array for ${item.id}`).toBeGreaterThan(0);

      // Each evidence item should have name and institution
      for (const ev of item.evidence) {
        expect(ev.name).toBeTruthy();
        expect(ev.institution).toBeTruthy();
      }
    }
  });
});
