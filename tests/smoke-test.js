#!/usr/bin/env node
/**
 * 轻量级功能验证脚本
 * 用 Node.js + JSDOM 模拟浏览器环境，验证关键功能
 */

const fs = require('fs');
const path = require('path');

// 读取 HTML 文件
const htmlPath = path.join(__dirname, '../index.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

console.log('=== WorldCascade 功能验证 ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}`);
    console.log(`   错误: ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// ============================================
// 测试 1: CC 链卡片结构
// ============================================
test('CC 链卡片有 data-chain-id 属性', () => {
  const match = html.match(/data-chain-id="CC-\d+"/);
  assert(match, '未找到 data-chain-id 属性');
});

test('CC 链 ID 格式正确 (CC-01, CC-02, CC-03)', () => {
  const ids = html.match(/data-chain-id="(CC-\d+)"/g);
  assert(ids && ids.length >= 3, '至少需要 3 个因果链');
  assert(ids.includes('data-chain-id="CC-01"'), '缺少 CC-01');
  assert(ids.includes('data-chain-id="CC-02"'), '缺少 CC-02');
  assert(ids.includes('data-chain-id="CC-03"'), '缺少 CC-03');
});

// ============================================
// 测试 2: CHAINS_DATA 结构
// ============================================
test('CHAINS_DATA 定义存在', () => {
  assert(html.includes('const CHAINS_DATA = ['), 'CHAINS_DATA 未定义');
});

test('CHAINS_DATA 包含 CC-01', () => {
  const match = html.match(/id:\s*"CC-01"/);
  assert(match, 'CHAINS_DATA 缺少 CC-01');
});

test('CHAINS_DATA ID 与卡片 data-chain-id 匹配', () => {
  const dataIds = html.match(/id:\s*"(CC-\d+)"/g) || [];
  const cardIds = html.match(/data-chain-id="(CC-\d+)"/g) || [];
  
  const dataIdSet = new Set(dataIds.map(s => s.match(/CC-\d+/)[0]));
  const cardIdSet = new Set(cardIds.map(s => s.match(/CC-\d+/)[0]));
  
  for (const id of cardIdSet) {
    assert(dataIdSet.has(id), `卡片 ${id} 在 CHAINS_DATA 中不存在`);
  }
});

// ============================================
// 测试 3: renderChainDetail 函数
// ============================================
test('renderChainDetail 函数存在', () => {
  assert(html.includes('function renderChainDetail(chainId)'), 'renderChainDetail 未定义');
});

test('renderChainDetail 正常返回 true', () => {
  const fnMatch = html.match(/function renderChainDetail\(chainId\)[\s\S]*?return true;[\s\S]*?\}/);
  assert(fnMatch, 'renderChainDetail 没有 return true');
});

test('renderChainDetail 没有错误的 d.id 引用', () => {
  const fnMatch = html.match(/function renderChainDetail\(chainId\)[\s\S]*?\n    \}/);
  assert(fnMatch, '无法提取 renderChainDetail 函数');
  
  const fnBody = fnMatch[0];
  // 检查是否有 d.id 引用（但排除合法的如 pred.id, chain.id 等）
  const lines = fnBody.split('\n');
  for (const line of lines) {
    // 跳过注释
    if (line.trim().startsWith('//')) continue;
    // 检查 d.id 引用（但排除 pid, pred.id, chain.id 等）
    if (/\bd\.id\b/.test(line) && !/pid|pred\.id|chain\.id|detailEl/.test(line)) {
      throw new Error(`发现可疑的 d.id 引用: ${line.trim()}`);
    }
  }
});

test('renderChainDetail 设置 detailEl.hidden = false', () => {
  const fnMatch = html.match(/function renderChainDetail\(chainId\)[\s\S]*?\n    \}/);
  assert(fnMatch, '无法提取 renderChainDetail 函数');
  assert(fnMatch[0].includes('detailEl.hidden = false'), '没有设置 detailEl.hidden = false');
});

// ============================================
// 测试 4: 事件监听器
// ============================================
test('chainsList 事件监听器存在', () => {
  assert(html.includes("chainsList.addEventListener('click'"), 'chainsList 事件监听器未定义');
});

test('事件监听器调用 handleRoute()', () => {
  const listenerMatch = html.match(/chainsList\.addEventListener\('click'[\s\S]*?\}\);/);
  assert(listenerMatch, '无法提取事件监听器');
  assert(listenerMatch[0].includes('handleRoute()'), '事件监听器没有调用 handleRoute()');
});

test('事件监听器使用 history.pushState', () => {
  const listenerMatch = html.match(/chainsList\.addEventListener\('click'[\s\S]*?\}\);/);
  assert(listenerMatch, '无法提取事件监听器');
  assert(listenerMatch[0].includes("history.pushState"), '事件监听器没有使用 history.pushState');
});

// ============================================
// 测试 5: handleRoute 函数
// ============================================
test('handleRoute 函数存在', () => {
  assert(html.includes('function handleRoute()'), 'handleRoute 未定义');
});

test('handleRoute 处理 chain/ 路由', () => {
  const fnMatch = html.match(/function handleRoute\(\)[\s\S]*?\n    \}/);
  assert(fnMatch, '无法提取 handleRoute 函数');
  assert(fnMatch[0].includes("hash.startsWith('chain/')"), 'handleRoute 没有处理 chain/ 路由');
});

test('handleRoute 调用 renderChainDetail', () => {
  const fnMatch = html.match(/function handleRoute\(\)[\s\S]*?\n    \}/);
  assert(fnMatch, '无法提取 handleRoute 函数');
  assert(fnMatch[0].includes('renderChainDetail(chainId)'), 'handleRoute 没有调用 renderChainDetail');
});

// ============================================
// 测试 6: chain-detail-view 元素
// ============================================
test('chain-detail-view 元素存在', () => {
  assert(html.includes('id="chain-detail-view"'), 'chain-detail-view 元素不存在');
});

test('chain-detail-view 初始 hidden', () => {
  const match = html.match(/<section id="chain-detail-view"[^>]*hidden/);
  assert(match, 'chain-detail-view 初始状态不是 hidden');
});

test('cd-back-btn 按钮存在', () => {
  assert(html.includes('id="cd-back-btn"'), 'cd-back-btn 不存在');
});

// ============================================
// 测试 7: predictions.json 数据
// ============================================
test('predictions.json 文件存在', () => {
  const jsonPath = path.join(__dirname, '../public/data/predictions.json');
  assert(fs.existsSync(jsonPath), 'predictions.json 不存在');
});

test('predictions.json 包含 80 条预测', () => {
  const jsonPath = path.join(__dirname, '../public/data/predictions.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  assert(data.predictions.length === 80, `预测数量不是 80，实际: ${data.predictions.length}`);
});

test('predictions.json 包含因果链', () => {
  const jsonPath = path.join(__dirname, '../public/data/predictions.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  assert(data.causalChains && data.causalChains.length > 0, '没有因果链数据');
});

test('因果链 linkedPredictions 按时间排序', () => {
  const jsonPath = path.join(__dirname, '../public/data/predictions.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  
  const dateMap = {};
  for (const pred of data.predictions) {
    dateMap[pred.id] = pred.verificationDate;
  }
  
  let outOfOrder = 0;
  for (const chain of data.causalChains) {
    const linked = chain.linkedPredictions || [];
    for (let i = 0; i < linked.length - 1; i++) {
      const d1 = dateMap[linked[i]] || '9999';
      const d2 = dateMap[linked[i + 1]] || '9999';
      if (d1 > d2) outOfOrder++;
    }
  }
  
  assert(outOfOrder === 0, `${outOfOrder} 条链的 linkedPredictions 没有按时间排序`);
});

// ============================================
// 测试结果
// ============================================
console.log('\n=== 测试结果 ===');
console.log(`通过: ${passed}`);
console.log(`失败: ${failed}`);
console.log(`总计: ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n✅ 所有测试通过！');
  process.exit(0);
}
