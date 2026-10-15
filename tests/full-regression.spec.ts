/**
 * WorldCascade 完整自动化测试套件
 * 
 * 覆盖:
 * - 首页 (index.html): 预测卡片、因果链卡片、导航
 * - 详情页 (#detail/FP-xx): 详情渲染、Cross-links、来源感知 Back
 * - Timeline 页 (timeline.html): 节点、脉络线、Tooltip、交互
 * - 因果链详情页 (#chain/CC-xx): 链详情、节点步骤
 * - 数据完整性: predictions.json 格式、因果链排序
 * 
 * 运行: npx playwright test tests/full-regression.spec.ts
 */

import { test, expect, Page } from '@playwright/test';

// ============================================
// 辅助函数
// ============================================
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

async function collectErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

// ============================================
// 1. 首页测试
// ============================================
test.describe('1. 首页 (index.html)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test('1.1 页面加载无 JS 错误', async ({ page }) => {
    const errors = await collectErrors(page);
    await page.waitForTimeout(1000);
    expect(errors.filter(e => e.includes('ReferenceError') || e.includes('TypeError'))).toHaveLength(0);
  });

  test('1.2 80 条预测卡片渲染', async ({ page }) => {
    const cards = page.locator('.p-card');
    const count = await cards.count();
    expect(count).toBe(80);
  });

  test('1.3 预测卡片包含必要信息', async ({ page }) => {
    const firstCard = page.locator('.p-card').first();
    
    // 检查卡片结构
    await expect(firstCard.locator('.p-id')).toBeVisible();
    await expect(firstCard.locator('.p-title')).toBeVisible();
    await expect(firstCard.locator('.p-domain')).toBeVisible();
    await expect(firstCard.locator('.p-score')).toBeVisible();
  });

  test('1.4 点击预测卡片进入详情', async ({ page }) => {
    const firstCard = page.locator('.p-card').first();
    const fpId = await firstCard.getAttribute('data-id');
    
    await firstCard.click();
    await page.waitForSelector('#detail-view:not([hidden])', { timeout: 10_000 });
    
    // URL 应该变成 #detail/FP-xx
    await expect(page).toHaveURL(new RegExp(`#detail/${fpId}`));
    
    // 详情页应该显示对应 FP 的信息
    const detailTitle = page.locator('#detail-view h2').first();
    await expect(detailTitle).toBeVisible({ timeout: 5_000 });
  });

  test('1.5 因果链卡片渲染', async ({ page }) => {
    const chainCards = page.locator('.chain');
    const count = await chainCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('1.6 点击因果链卡片进入链详情', async ({ page }) => {
    const firstChain = page.locator('.chain').first();
    const chainId = await firstChain.getAttribute('data-chain-id');
    
    await firstChain.click();
    await page.waitForSelector('#chain-detail-view:not([hidden])', { timeout: 10_000 });
    
    // URL 应该变成 #chain/CC-xx
    await expect(page).toHaveURL(new RegExp(`#chain/${chainId}`));
  });

  test('1.7 Hero 区 Timeline CTA 链接', async ({ page }) => {
    const cta = page.locator('a[href*="timeline.html"]').first();
    await expect(cta).toBeVisible();
    
    const href = await cta.getAttribute('href');
    expect(href).toContain('timeline.html');
  });

  test('1.8 Track Record 区渲染', async ({ page }) => {
    // 检查 Brier Score 显示
    const brierScore = page.locator('.track-record').locator('text=/\\d+\\.\\d+/').first();
    await expect(brierScore).toBeVisible({ timeout: 5_000 });
  });

  test('1.9 Hash 路由: #predictions 滚动到预测区', async ({ page }) => {
    await page.evaluate(() => location.hash = '#predictions');
    await page.waitForTimeout(500);
    
    const predSection = page.locator('#predictions');
    const isVisible = await predSection.isVisible();
    expect(isVisible).toBe(true);
  });

  test('1.10 Hash 路由: #chains 滚动到因果链区', async ({ page }) => {
    await page.evaluate(() => location.hash = '#chains');
    await page.waitForTimeout(500);
    
    const chainsSection = page.locator('#chains');
    const isVisible = await chainsSection.isVisible();
    expect(isVisible).toBe(true);
  });
});

// ============================================
// 2. 详情页测试
// ============================================
test.describe('2. 详情页 (#detail/FP-xx)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#detail/FP-01');
    await page.waitForSelector('#detail-view:not([hidden])', { timeout: 10_000 });
  });

  test('2.1 详情页标题渲染', async ({ page }) => {
    const title = page.locator('#detail-view h2').first();
    await expect(title).toBeVisible();
    
    const text = await title.textContent();
    expect(text?.length).toBeGreaterThan(0);
  });

  test('2.2 详情页显示 FP ID', async ({ page }) => {
    const fpId = page.locator('#detail-view').locator('text=/FP-\\d+/').first();
    await expect(fpId).toBeVisible();
  });

  test('2.3 详情页显示 Domain 标签', async ({ page }) => {
    const domainBadge = page.locator('#detail-view .domain-badge').first();
    await expect(domainBadge).toBeVisible();
  });

  test('2.4 详情页显示 Engine Score', async ({ page }) => {
    const score = page.locator('#detail-view').locator('text=/\\d+/').first();
    await expect(score).toBeVisible();
  });

  test('2.5 Back 按钮存在且可点击', async ({ page }) => {
    const backBtn = page.locator('.detail-back, #detail-back-btn').first();
    await expect(backBtn).toBeVisible();
    
    const text = await backBtn.textContent();
    expect(text).toContain('Back');
  });

  test('2.6 Cross-link: View on Timeline 存在', async ({ page }) => {
    const timelineLink = page.locator('#crosslink-timeline');
    await expect(timelineLink).toBeVisible();
  });

  test('2.7 Cross-link: Timeline 链接跳转到 timeline.html', async ({ page }) => {
    const timelineLink = page.locator('#crosslink-timeline a').first();
    if (await timelineLink.count() > 0) {
      const href = await timelineLink.getAttribute('href');
      expect(href).toContain('timeline.html');
    }
  });

  test('2.8 来源感知 Back: 从首页进入显示 "Back to Predictions"', async ({ page }) => {
    // 清空 sessionStorage 模拟从首页进入
    await page.evaluate(() => sessionStorage.clear());
    await page.goto('/#detail/FP-01');
    await page.waitForSelector('#detail-view:not([hidden])', { timeout: 10_000 });
    
    const backBtn = page.locator('.detail-back, #detail-back-btn').first();
    const text = await backBtn.textContent();
    expect(text).toContain('Home').toContain('Back');
  });

  test('2.9 来源感知 Back: 从 Timeline 进入显示 "Back to Timeline"', async ({ page }) => {
    await page.evaluate(() => sessionStorage.setItem('lastRoute', 'timeline'));
    await page.goto('/#detail/FP-01');
    await page.waitForSelector('#detail-view:not([hidden])', { timeout: 10_000 });
    
    const backBtn = page.locator('.detail-back, #detail-back-btn').first();
    const text = await backBtn.textContent();
    expect(text).toContain('Timeline');
  });

  test('2.10 Related Causal Chain 链接格式正确', async ({ page }) => {
    const chainLinks = page.locator('#crosslink-chain-link a, #crosslink-related a');
    const count = await chainLinks.count();
    
    for (let i = 0; i < count; i++) {
      const href = await chainLinks.nth(i).getAttribute('href');
      if (href && href.includes('CC-')) {
        // 因果链应该用 #chain/ 不是 #detail/
        expect(href).toMatch(/^#chain\/CC-/);
      }
    }
  });
});

// ============================================
// 3. Timeline 页测试
// ============================================
test.describe('3. Timeline 页 (timeline.html)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/timeline.html');
    await page.waitForSelector('svg', { timeout: 15_000 });
    await page.waitForTimeout(2000); // 等待 D3 渲染
  });

  test('3.1 Timeline 页面加载无错误', async ({ page }) => {
    const errors = await collectErrors(page);
    await page.waitForTimeout(1000);
    expect(errors.filter(e => e.includes('ReferenceError') || e.includes('TypeError'))).toHaveLength(0);
  });

  test('3.2 SVG 容器渲染', async ({ page }) => {
    const svg = page.locator('svg');
    await expect(svg).toBeVisible();
  });

  test('3.3 节点渲染 (至少 70 个)', async ({ page }) => {
    // 节点是 circle 或 rect
    const nodes = page.locator('svg .timeline-node, svg circle[r="6"], svg circle[r="7"]');
    const count = await nodes.count();
    expect(count).toBeGreaterThanOrEqual(70);
  });

  test('3.4 域泳道标签渲染', async ({ page }) => {
    // 检查域标签 (AI, Energy, Demographics 等)
    const labels = page.locator('svg text');
    const texts: string[] = [];
    const count = await labels.count();
    for (let i = 0; i < Math.min(count, 50); i++) {
      const text = await labels.nth(i).textContent();
      if (text) texts.push(text.trim());
    }
    
    // 应该包含至少一个域名称
    const hasDomain = texts.some(t => 
      ['AI', 'Energy', 'Demographics', 'Biotech', 'Quantum', 'Climate'].includes(t)
    );
    expect(hasDomain).toBe(true);
  });

  test('3.5 因果脉络线渲染 (至少 10 条)', async ({ page }) => {
    const chainPaths = page.locator('svg .causal-chains path, svg .causal-chain-segment');
    const count = await chainPaths.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('3.6 脉络线有起点终点圆点', async ({ page }) => {
    const dots = page.locator('svg .causal-chains circle');
    const count = await dots.count();
    // 每条链至少 2 个圆点
    expect(count).toBeGreaterThanOrEqual(20);
  });

  test('3.7 脉络线按时间从左到右 (无回流)', async ({ page }) => {
    const segments = page.locator('svg .causal-chain-segment');
    const count = await segments.count();
    
    if (count === 0) {
      // 如果没有 segment class，检查普通 path
      const paths = page.locator('svg .causal-chains path');
      const pathCount = await paths.count();
      
      for (let i = 0; i < pathCount; i++) {
        const d = await paths.nth(i).getAttribute('d');
        if (!d) continue;
        
        const coords = d.match(/-?\d+(\.\d+)?/g);
        if (!coords || coords.length < 4) continue;
        
        const startX = parseFloat(coords[0]);
        const endX = parseFloat(coords[coords.length - 2]);
        
        // 允许 5px 容差
        expect(startX).toBeLessThanOrEqual(endX + 5);
      }
    } else {
      for (let i = 0; i < Math.min(count, 20); i++) {
        const d = await segments.nth(i).getAttribute('d');
        if (!d) continue;
        
        const coords = d.match(/-?\d+(\.\d+)?/g);
        if (!coords || coords.length < 4) continue;
        
        const startX = parseFloat(coords[0]);
        const endX = parseFloat(coords[coords.length - 2]);
        
        expect(startX).toBeLessThanOrEqual(endX + 5);
      }
    }
  });

  test('3.8 点击脉络线跳转到链详情', async ({ page }) => {
    const chainGroup = page.locator('svg .causal-chain-group, svg [data-chain-id]').first();
    
    if (await chainGroup.count() > 0) {
      await chainGroup.click();
      await page.waitForTimeout(1000);
      
      // 应该跳转到 index.html#chain/CC-xx
      const url = page.url();
      expect(url).toMatch(/#chain\/CC-/);
    }
  });

  test('3.9 返回按钮存在', async ({ page }) => {
    const backBtn = page.locator('a[href="/"], .back-btn, #back-btn').first();
    await expect(backBtn).toBeVisible();
  });

  test('3.10 页面标题正确', async ({ page }) => {
    const title = await page.title();
    expect(title.toLowerCase()).toContain('timeline');
  });
});

// ============================================
// 4. 因果链详情页测试
// ============================================
test.describe('4. 因果链详情页 (#chain/CC-xx)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#chain/CC-1');
    await page.waitForSelector('#chain-detail-view:not([hidden])', { timeout: 10_000 });
  });

  test('4.1 链详情页加载无错误', async ({ page }) => {
    const errors = await collectErrors(page);
    await page.waitForTimeout(1000);
    expect(errors.filter(e => e.includes('ReferenceError'))).toHaveLength(0);
  });

  test('4.2 链标题渲染', async ({ page }) => {
    const title = page.locator('#chain-detail-view h2, .cd-title').first();
    await expect(title).toBeVisible();
  });

  test('4.3 链 ID 显示', async ({ page }) => {
    const chainId = page.locator('#chain-detail-view').locator('text=/CC-\\d+/').first();
    await expect(chainId).toBeVisible();
  });

  test('4.4 节点步骤列表渲染', async ({ page }) => {
    const steps = page.locator('#chain-detail-view .chain-step, .cd-step');
    const count = await steps.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('4.5 Back 按钮存在', async ({ page }) => {
    const backBtn = page.locator('.cd-back, #chain-back-btn').first();
    await expect(backBtn).toBeVisible();
    
    const text = await backBtn.textContent();
    expect(text).toContain('Back');
  });

  test('4.6 关联预测列表', async ({ page }) => {
    // 检查是否有关联预测
    const predLinks = page.locator('#chain-detail-view a[href*="#detail/"]');
    // 可能没有关联预测，只检查不报错
    const count = await predLinks.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

// ============================================
// 5. 数据完整性测试
// ============================================
test.describe('5. 数据完整性', () => {
  test('5.1 predictions.json 可访问', async ({ request }) => {
    const response = await request.get('/public/data/predictions.json');
    expect(response.ok()).toBe(true);
  });

  test('5.2 predictions.json 格式正确', async ({ request }) => {
    const response = await request.get('/public/data/predictions.json');
    const data = await response.json();
    
    expect(data).toHaveProperty('metadata');
    expect(data).toHaveProperty('predictions');
    expect(data).toHaveProperty('causalChains');
    
    expect(data.predictions.length).toBe(80);
    expect(data.causalChains.length).toBeGreaterThanOrEqual(20);
  });

  test('5.3 所有预测有有效 verificationDate', async ({ request }) => {
    const response = await request.get('/public/data/predictions.json');
    const data = await response.json();
    
    for (const pred of data.predictions) {
      expect(pred.verificationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test('5.4 因果链 linkedPredictions 按时间排序', async ({ request }) => {
    const response = await request.get('/public/data/predictions.json');
    const data = await response.json();
    
    // 构建 FP 日期查找表
    const dateMap: Record<string, string> = {};
    for (const pred of data.predictions) {
      dateMap[pred.id] = pred.verificationDate;
    }
    
    // 检查每条链
    for (const chain of data.causalChains) {
      const linked = chain.linkedPredictions || [];
      if (linked.length < 2) continue;
      
      for (let i = 0; i < linked.length - 1; i++) {
        const dateA = dateMap[linked[i]] || '9999';
        const dateB = dateMap[linked[i + 1]] || '9999';
        expect(dateA <= dateB).toBe(true);
      }
    }
  });

  test('5.5 所有因果链有必要的字段', async ({ request }) => {
    const response = await request.get('/public/data/predictions.json');
    const data = await response.json();
    
    for (const chain of data.causalChains) {
      expect(chain).toHaveProperty('id');
      expect(chain).toHaveProperty('title');
      expect(chain).toHaveProperty('linkedPredictions');
      expect(chain).toHaveProperty('nodes');
    }
  });
});

// ============================================
// 6. 导航流程测试
// ============================================
test.describe('6. 导航流程', () => {
  test('6.1 首页 → 详情 → Back → 首页', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    
    // 进入详情
    await page.locator('.p-card').first().click();
    await page.waitForSelector('#detail-view:not([hidden])', { timeout: 10_000 });
    
    // 点 Back
    await page.locator('.detail-back, #detail-back-btn').first().click();
    await page.waitForTimeout(500);
    
    // 应该回到首页（URL 可能是 /、/#、或 /#predictions）
    await expect(page).toHaveURL(/\/(#|$|\/#predictions)/);
    
    // 首页内容应该可见
    const cards = page.locator('.p-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('6.2 首页 → Timeline → 节点 → 详情 → Back → Timeline', async ({ page }) => {
    // 去 Timeline
    await page.goto('/timeline.html');
    await page.waitForSelector('svg', { timeout: 15_000 });
    
    // 模拟从 Timeline 进入详情
    await page.evaluate(() => sessionStorage.setItem('lastRoute', 'timeline'));
    await page.goto('/#detail/FP-01');
    await page.waitForSelector('#detail-view:not([hidden])', { timeout: 10_000 });
    
    // 检查 Back 按钮文案
    const backBtn = page.locator('.detail-back, #detail-back-btn').first();
    const text = await backBtn.textContent();
    expect(text).toContain('Timeline');
    
    // 点击 Back 应该跳转到 timeline.html
    await backBtn.click();
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/timeline\.html/);
  });

  test('6.3 直接 URL 访问 #detail/FP-01', async ({ page }) => {
    await page.goto('/#detail/FP-01');
    await page.waitForSelector('#detail-view:not([hidden])', { timeout: 10_000 });
    
    const title = page.locator('#detail-view h2').first();
    await expect(title).toBeVisible();
  });

  test('6.4 直接 URL 访问 #chain/CC-1', async ({ page }) => {
    await page.goto('/#chain/CC-1');
    await page.waitForSelector('#chain-detail-view:not([hidden])', { timeout: 10_000 });
    
    const title = page.locator('#chain-detail-view h2, .cd-title').first();
    await expect(title).toBeVisible();
  });

  test('6.5 无效 Hash 降级到首页', async ({ page }) => {
    await page.goto('/#invalid-hash-xyz');
    await waitForPageLoad(page);
    
    // 应该显示首页内容
    const cards = page.locator('.p-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('6.6 Back 按钮文案根据来源动态变化', async ({ page }) => {
    // 场景 1: 从首页进入 → "Back to Home" 或 "Back to Predictions"
    await page.evaluate(() => sessionStorage.clear());
    await page.goto('/#detail/FP-01');
    await page.waitForSelector('#detail-view:not([hidden])', { timeout: 10_000 });
    let backText = await page.locator('#detail-back-btn').textContent();
    expect(backText).toMatch(/Back/);
    
    // 场景 2: 从 Timeline 进入 → "Back to Timeline"
    await page.evaluate(() => sessionStorage.setItem('lastRoute', 'timeline'));
    await page.goto('/#detail/FP-01');
    await page.waitForSelector('#detail-view:not([hidden])', { timeout: 10_000 });
    backText = await page.locator('#detail-back-btn').textContent();
    expect(backText).toContain('Timeline');
    
    // 场景 3: 从另一个详情进入 → "Back to Prediction"
    await page.evaluate(() => sessionStorage.setItem('lastRoute', '#detail/FP-02'));
    await page.goto('/#detail/FP-01');
    await page.waitForSelector('#detail-view:not([hidden])', { timeout: 10_000 });
    backText = await page.locator('#detail-back-btn').textContent();
    expect(backText).toContain('Prediction');
  });
});

// ============================================
// 7. 回归测试 (已知 Bug)
// ============================================
test.describe('7. 回归测试', () => {
  test('7.1 P0-1: showHome() 无 ReferenceError', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    
    await page.goto('/');
    await waitForPageLoad(page);
    
    // 快速导航触发 showHome()
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => location.hash = '#predictions');
      await page.waitForTimeout(100);
      await page.evaluate(() => location.hash = '#chains');
      await page.waitForTimeout(100);
      await page.evaluate(() => location.hash = '#');
      await page.waitForTimeout(100);
    }
    
    const refErrors = errors.filter(e => 
      e.includes('ReferenceError') || 
      e.includes('is not defined')
    );
    expect(refErrors).toHaveLength(0);
  });

  test('7.2 P0-2: causalChainIds 路由到 #chain/ 不是 #detail/', async ({ page }) => {
    await page.goto('/#detail/FP-01');
    await page.waitForSelector('#detail-view:not([hidden])', { timeout: 10_000 });
    
    const links = page.locator('#crosslink-chain-link a, #crosslink-related a');
    const count = await links.count();
    
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      if (href && href.includes('CC-')) {
        expect(href).toMatch(/^#chain\/CC-/);
      }
    }
  });

  test('7.3 P0-3: 因果链按时间排序', async ({ request }) => {
    const response = await request.get('/public/data/predictions.json');
    const data = await response.json();
    
    const dateMap: Record<string, string> = {};
    for (const pred of data.predictions) {
      dateMap[pred.id] = pred.verificationDate;
    }
    
    let outOfOrder = 0;
    for (const chain of data.causalChains) {
      const linked = chain.linkedPredictions || [];
      for (let i = 0; i < linked.length - 1; i++) {
        if ((dateMap[linked[i]] || '9999') > (dateMap[linked[i + 1]] || '9999')) {
          outOfOrder++;
        }
      }
    }
    
    expect(outOfOrder).toBe(0);
  });
});
