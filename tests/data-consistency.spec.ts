/**
 * 数据一致性测试
 * 
 * 验证：
 * 1. 首页 chain 卡片的 data-chain-id 在 CHAINS_DATA 中存在
 * 2. DETAIL_DATA 的 causalChainIds 在 CHAINS_DATA 中存在
 * 3. ID 格式一致性（CC-{domain}-{sequence}）
 * 4. 所有引用的 chain 都能正常渲染
 */

import { test, expect } from '@playwright/test';

test.describe('数据一致性测试', () => {
  
  test('首页 chain 卡片 ID 在 CHAINS_DATA 中存在', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 获取所有首页 chain 卡片的 ID
    const cardIds = await page.evaluate(() => {
      const cards = document.querySelectorAll('.chain[data-chain-id]');
      return Array.from(cards).map(c => c.getAttribute('data-chain-id'));
    });
    
    // 获取 CHAINS_DATA 中的所有 ID
    const chainsDataIds = await page.evaluate(() => {
      // @ts-ignore
      return typeof CHAINS_DATA !== 'undefined' 
        // @ts-ignore
        ? CHAINS_DATA.map(c => c.id) 
        : [];
    });
    
    expect(chainsDataIds.length).toBeGreaterThan(0);
    
    // 验证每个卡片 ID 都在 CHAINS_DATA 中
    for (const cardId of cardIds) {
      expect(chainsDataIds).toContain(cardId);
    }
  });

  test('DETAIL_DATA 的 causalChainIds 在 CHAINS_DATA 中存在', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 获取 DETAIL_DATA 中所有引用的 chain ID
    const referencedChainIds = await page.evaluate(() => {
      // @ts-ignore
      if (typeof DETAIL_DATA === 'undefined') return [];
      
      const ids = new Set();
      // @ts-ignore
      for (const detail of DETAIL_DATA) {
        if (detail.causalChainIds) {
          detail.causalChainIds.forEach((id: string) => ids.add(id));
        }
      }
      return Array.from(ids);
    });
    
    // 获取 CHAINS_DATA 中的所有 ID
    const chainsDataIds = await page.evaluate(() => {
      // @ts-ignore
      return typeof CHAINS_DATA !== 'undefined' 
        // @ts-ignore
        ? CHAINS_DATA.map(c => c.id) 
        : [];
    });
    
    expect(chainsDataIds.length).toBeGreaterThan(0);
    
    // 验证每个引用的 ID 都在 CHAINS_DATA 中
    for (const refId of referencedChainIds) {
      expect(chainsDataIds).toContain(refId);
    }
  });

  test('ID 格式一致性：符合 CC-{domain}-{sequence} 规范', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const idFormatRegex = /^CC-[A-Z]+-\d{3}$/;
    
    // 检查 CHAINS_DATA 中的 ID
    const chainsDataIds = await page.evaluate(() => {
      // @ts-ignore
      return typeof CHAINS_DATA !== 'undefined' 
        // @ts-ignore
        ? CHAINS_DATA.map(c => c.id) 
        : [];
    });
    
    for (const id of chainsDataIds) {
      expect(id).toMatch(idFormatRegex);
    }
    
    // 检查 DETAIL_DATA 中的 causalChainIds
    const referencedIds = await page.evaluate(() => {
      // @ts-ignore
      if (typeof DETAIL_DATA === 'undefined') return [];
      
      const ids = new Set();
      // @ts-ignore
      for (const detail of DETAIL_DATA) {
        if (detail.causalChainIds) {
          detail.causalChainIds.forEach((id: string) => ids.add(id));
        }
      }
      return Array.from(ids);
    });
    
    for (const id of referencedIds) {
      expect(id).toMatch(idFormatRegex);
    }
    
    // 检查首页卡片的 ID
    const cardIds = await page.evaluate(() => {
      const cards = document.querySelectorAll('.chain[data-chain-id]');
      return Array.from(cards).map(c => c.getAttribute('data-chain-id'));
    });
    
    for (const id of cardIds) {
      expect(id).toMatch(idFormatRegex);
    }
  });

  test('点击首页 chain 卡片能正常跳转到详情页', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));
    
    const firstChain = page.locator('.chain').first();
    const chainId = await firstChain.getAttribute('data-chain-id');
    
    await firstChain.click();
    
    // 等待链详情页显示
    await page.waitForSelector('#chain-detail-view:not([hidden])', { timeout: 10_000 });
    
    // 验证 URL
    await expect(page).toHaveURL(new RegExp(`#chain/${chainId}`));
    
    // 验证没有 JS 错误
    expect(jsErrors.filter(e => e.includes('ReferenceError') || e.includes('is not defined'))).toHaveLength(0);
    
    // 验证标题渲染
    const title = page.locator('#chain-detail-view .cd-title');
    await expect(title).toBeVisible({ timeout: 5_000 });
  });

  test('点击 prediction 详情页的 chain 链接能正常跳转', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 点击第一个 prediction 卡片进入详情
    const firstPred = page.locator('.p-card').first();
    await firstPred.click();
    await page.waitForSelector('#detail-view:not([hidden])', { timeout: 10_000 });
    
    // 检查是否有 chain 链接
    const chainLink = page.locator('#crosslink-chain-link a').first();
    const hasChainLink = await chainLink.isVisible().catch(() => false);
    
    if (hasChainLink) {
      const jsErrors: string[] = [];
      page.on('pageerror', (err) => jsErrors.push(err.message));
      
      // 获取链接指向的 chain ID
      const href = await chainLink.getAttribute('href');
      expect(href).toMatch(/^#chain\/CC-[A-Z]+-\d{3}$/);
      
      // 点击链接
      await chainLink.click();
      
      // 等待链详情页显示
      await page.waitForSelector('#chain-detail-view:not([hidden])', { timeout: 10_000 });
      
      // 验证没有 JS 错误
      expect(jsErrors.filter(e => e.includes('ReferenceError') || e.includes('is not defined'))).toHaveLength(0);
    }
  });

  test('占位符链显示提示信息', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 获取占位符链
    const placeholderChains = await page.evaluate(() => {
      // @ts-ignore
      if (typeof CHAINS_DATA === 'undefined') return [];
      // @ts-ignore
      return CHAINS_DATA.filter(c => c.type === 'Placeholder');
    });
    
    if (placeholderChains.length > 0) {
      // 点击一个占位符链
      const placeholderId = placeholderChains[0].id;
      
      // 通过 URL 直接导航
      await page.goto(`/#chain/${placeholderId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('#chain-detail-view:not([hidden])', { timeout: 10_000 });
      
      // 应该显示提示信息
      const desc = page.locator('#chain-detail-view .cd-description, #chain-detail-view p').first();
      await expect(desc).toBeVisible({ timeout: 5_000 });
      
      const text = await desc.textContent();
      expect(text?.toLowerCase()).toMatch(/sprint|placeholder|will be added|coming soon/i);
    }
  });
});
