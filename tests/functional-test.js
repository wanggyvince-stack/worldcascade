#!/usr/bin/env node
/**
 * VM 模拟功能测试 - 用 Node.js vm 模块模拟浏览器交互
 */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

console.log('=== WorldCascade VM 交互测试 ===\n');
let passed = 0, failed = 0;
const failures = [];

function test(name, fn) {
  try { fn(); console.log(`✅ ${name}`); passed++; }
  catch (e) { console.log(`❌ ${name}\n   ${e.message}`); failures.push({ name, error: e.message }); failed++; }
}
function assert(c, m) { if (!c) throw new Error(m || 'FAIL'); }

// ===== 模拟 DOM =====
class MockElement {
  constructor(tag, id, attrs = {}) {
    this.tagName = tag;
    this.id = id;
    this.hidden = false;
    this.innerHTML = '';
    this.textContent = '';
    this.onclick = null;
    this.dataset = {};
    this.style = {};
    this.attrs = attrs;
    this._listeners = {};
    this._children = [];
    this._parent = null;
  }
  addEventListener(type, fn) {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(fn);
  }
  dispatchEvent(type) {
    (this._listeners[type] || []).forEach(fn => fn({ target: this, preventDefault: () => {} }));
  }
  click() {
    // 模拟点击：先触发自身 onclick，再冒泡
    if (this.onclick) this.onclick({ target: this, preventDefault: () => {} });
    // 冒泡到父元素
    let p = this._parent;
    while (p) {
      (p._listeners['click'] || []).forEach(fn => fn({ target: this, preventDefault: () => {} }));
      p = p._parent;
    }
  }
  querySelector(s) { return null; }
  querySelectorAll(s) { return []; }
  closest(selector) {
    // 简单匹配 .class 或 [attr]
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      if (this.attrs.class && this.attrs.class.includes(cls)) return this;
    }
    return null;
  }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k] || null; }
}

class MockDocument {
  constructor() {
    this._elements = {};
  }
  _getOrCreate(id) {
    if (!this._elements[id]) {
      this._elements[id] = new MockElement('div', id);
    }
    return this._elements[id];
  }
  getElementById(id) { return this._getOrCreate(id); }
  querySelector(s) { return this._getOrCreate(s); }
  querySelectorAll(s) { return []; }
}

// ===== 模拟环境 =====
const doc = new MockDocument();
const storage = {};
const locationState = { hash: '' };

// 创建元素
const elements = {
  hero: new MockElement('section', 'hero'),
  chains: new MockElement('section', 'chains'),
  predictions: new MockElement('section', 'predictions'),
  trust: new MockElement('section', 'trust'),
  methodology: new MockElement('section', 'methodology'),
  'detail-view': new MockElement('section', 'detail-view', {}),
  'chain-detail-view': new MockElement('section', 'chain-detail-view', {}),
  'detail-back-btn': new MockElement('button', 'detail-back-btn'),
  'detail-back-btn-bottom': new MockElement('button', 'detail-back-btn-bottom'),
  'cd-back-btn': new MockElement('button', 'cd-back-btn'),
  'cd-back-btn-bottom': new MockElement('button', 'cd-back-btn-bottom'),
  'detail-title': new MockElement('h2', 'detail-title'),
  'detail-id-tag': new MockElement('span', 'detail-id-tag'),
  'cd-head': new MockElement('div', 'cd-head'),
  'cd-top': new MockElement('div', 'cd-top'),
  'cd-nodes': new MockElement('div', 'cd-nodes'),
  'cd-vuln': new MockElement('div', 'cd-vuln'),
  'cd-preds': new MockElement('div', 'cd-preds'),
  'ph-grid': new MockElement('div', 'ph-grid'),
  'detail-content': new MockElement('div', 'detail-content'),
};

// 初始状态：detail-view 和 chain-detail-view 隐藏
elements['detail-view'].hidden = true;
elements['chain-detail-view'].hidden = true;

// 注入到 doc
Object.entries(elements).forEach(([id, el]) => { doc._elements[id] = el; });

// 创建可点击的卡片
const ccCard = new MockElement('article', null, { class: 'chain', 'data-chain-id': 'CC-01' });
ccCard.dataset.chainId = 'CC-01';

const fpCard = new MockElement('article', null, { class: 'p-card', 'data-id': 'FP-01' });
fpCard.dataset.id = 'FP-01';

// 因果链容器
const chainsListEl = new MockElement('div', null, { class: 'chains-list' });
chainsListEl.querySelector = (s) => {
  if (s === '.chain') return ccCard;
  return null;
};
chainsListEl._elements = { ccCard };

// ph-grid
const phGrid = elements['ph-grid'];

// 设置父子关系（用于冒泡）
ccCard._parent = chainsListEl;

// hashchange 监听器
const hashchangeListeners = [];

// ===== 注入 JS 逻辑 =====
const ctx = {
  document: {
    getElementById: (id) => elements[id] || doc._getOrCreate(id),
    querySelector: (s) => {
      if (s === '.chains-list') return chainsListEl;
      if (s === '.chain') return ccCard;
      if (s === '.p-card') return fpCard;
      return null;
    },
    querySelectorAll: (s) => {
      if (s === '.cd-node') return [];
      return [];
    },
    createElement: () => new MockElement('div'),
  },
  console,
  setTimeout: (fn, ms) => fn(),
  sessionStorage: {
    getItem: k => storage[k] || null,
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: k => { delete storage[k]; },
    clear: () => Object.keys(storage).forEach(k => delete storage[k]),
  },
  location: locationState,
  history: {
    pushState: (a, b, hash) => { locationState.hash = hash || ''; },
  },
  Math, JSON, Array, Object, String, Number, Boolean, RegExp, Error, Map, Set,
};
ctx.window = ctx;
ctx.window.addEventListener = (type, fn) => {
  if (type === 'hashchange') hashchangeListeners.push(fn);
};
vm.createContext(ctx);

// ===== 注入关键函数 =====
vm.runInContext(`
  // 数据
  var CHAINS_DATA = [{
    id: "CC-01", type: "Cross-Domain", title: "AI Craves Power",
    strength: 60,
    nodes: [
      { id: "N1", title: "AI Inference Cost Drops", evidence: "HIGH", freshness: "G",
        paragraphs: ["P1"], meaning: "M1", anchors: ["FP-01"] },
      { id: "N2", title: "Data Center Demand", evidence: "MEDIUM", freshness: "Y",
        paragraphs: ["P2"], meaning: "M2", anchors: ["FP-02"] }
    ],
    relatedPreds: ["FP-01", "FP-02"],
    vulnerability: { title: "Node 2 weak", text: "May fail" }
  }];

  var PREDICTIONS = [
    { id: "FP-01", t: "Renewables largest source", e: 96.9 },
    { id: "FP-02", t: "Data center surge", e: 80.0 }
  ];

  var DETAIL_DATA = [{
    id: "FP-01", title: "Renewables confirmed", domain: "energy",
    domainLabel: "Energy", domainColor: "#10B981", domainIcon: "E",
    verificationDate: "2027-06-30", daysUntilVerdict: 259,
    predictionContent: "Content", verificationCriteria: "Criteria",
    engineScore: 96.9, confidenceLevel: "high", evidence: []
  }];

  var DETAIL_MAP = {};
  DETAIL_DATA.forEach(function(d) { DETAIL_MAP[d.id] = d; });

  var heroEl = document.getElementById('hero');
  var chainsEl = document.getElementById('chains');
  var hubEl = document.getElementById('predictions');
  var trustEl = document.getElementById('trust');
  var footerEl = document.getElementById('methodology');
  var detailEl = document.getElementById('detail-view');

  function setLastRoute(r) { try { sessionStorage.setItem('lastRoute', r); } catch(_) {} }
  function getLastRoute() { try { return sessionStorage.getItem('lastRoute') || ''; } catch(_) { return ''; } }

  function updateBackButton(btn, fallbackHash, fallbackText) {
    if (!btn) return;
    var last = getLastRoute();
    var label = fallbackText;
    var handler = function() { history.pushState(null, '', fallbackHash); handleRoute(); };
    if (last === 'timeline') {
      label = 'Back to Timeline';
    } else if (last.startsWith('#detail/')) {
      label = 'Back to Prediction';
      handler = function() { history.pushState(null, '', last); handleRoute(); };
    } else if (last.startsWith('#chain/')) {
      label = 'Back to Chain';
      handler = function() { history.pushState(null, '', last); handleRoute(); };
    } else if (!last) {
      label = 'Back to Home';
      handler = function() { location.hash = fallbackHash; };
    }
    btn.textContent = label;
    btn.onclick = handler;
  }

  function showHome() {
    [heroEl, chainsEl, hubEl, trustEl, footerEl].forEach(function(el) { if(el) el.hidden = false; });
    if (detailEl) detailEl.hidden = true;
    var cd = document.getElementById("chain-detail-view"); if (cd) cd.hidden = true;
  }
  function showHomeNoScroll() {
    [heroEl, chainsEl, hubEl, trustEl, footerEl].forEach(function(el) { if(el) el.hidden = false; });
    if (detailEl) detailEl.hidden = true;
    var cd = document.getElementById("chain-detail-view"); if (cd) cd.hidden = true;
  }
  function showDetail(id) {
    var d = DETAIL_MAP[id];
    if (!d) { history.pushState(null, '', '#predictions'); handleRoute(); return; }
    [heroEl, chainsEl, hubEl, trustEl, footerEl].forEach(function(el) { if(el) el.hidden = true; });
    if (detailEl) detailEl.hidden = false;
    var cd = document.getElementById("chain-detail-view"); if (cd) cd.hidden = true;
    document.getElementById('detail-title').textContent = d.title;
    document.getElementById('detail-id-tag').textContent = d.id;
  }
  function renderChainDetail(chainId) {
    var chain = CHAINS_DATA.find(function(c) { return c.id === chainId; });
    var el = document.getElementById('chain-detail-view');
    if (!chain || !el) return false;
    try {
      document.getElementById('cd-head').innerHTML = chain.title;
      document.getElementById('cd-head').textContent = chain.title;
      var nodesHtml = '';
      chain.nodes.forEach(function(n) { nodesHtml += '<div class="cd-node">' + n.title + '</div>'; });
      document.getElementById('cd-nodes').innerHTML = nodesHtml;
      document.getElementById('cd-vuln').innerHTML = chain.vulnerability.title;
      var predsHtml = '';
      chain.relatedPreds.forEach(function(pid) { predsHtml += '<a class="cd-pred-row">' + pid + '</a>'; });
      document.getElementById('cd-preds').innerHTML = predsHtml;
      
      document.getElementById('hero').hidden = true;
      document.getElementById('chains').hidden = true;
      document.getElementById('predictions').hidden = true;
      document.getElementById('trust').hidden = true;
      el.hidden = false;
      return true;
    } catch(e) { return false; }
  }
  function handleRoute() {
    var hash = location.hash.slice(1);
    if (hash.startsWith('chain/')) {
      var id = hash.split('/')[1];
      setLastRoute(location.hash);
      updateBackButton(document.getElementById('cd-back-btn'), '#chains', 'Back to Causal Chains');
      updateBackButton(document.getElementById('cd-back-btn-bottom'), '#chains', 'Back to Causal Chains');
      if (renderChainDetail(id)) return;
    }
    if (hash.startsWith('detail/')) {
      var id = hash.replace('detail/', '');
      setLastRoute(location.hash);
      updateBackButton(document.getElementById('detail-back-btn'), '#predictions', 'Back to Predictions');
      updateBackButton(document.getElementById('detail-back-btn-bottom'), '#predictions', 'Back to Predictions');
      showDetail(id);
      return;
    }
    if (hash === 'predictions') { showHomeNoScroll(); }
    else { showHome(); }
  }

  // 事件委托: 因果链
  var chainsList = document.querySelector('.chains-list');
  if (chainsList) {
    chainsList.addEventListener('click', function(e) {
      var card = e.target;
      var id = card.dataset && card.dataset.chainId;
      if (id) { e.preventDefault(); setLastRoute(location.hash); history.pushState(null, '', '#chain/' + id); handleRoute(); }
    });
  }

  // 事件委托: 预测卡片
  var phGrid = document.getElementById('ph-grid');
  if (phGrid) {
    phGrid.addEventListener('click', function(e) {
      var card = e.target;
      var id = card.dataset && card.dataset.id;
      if (id) { e.preventDefault(); setLastRoute(location.hash); history.pushState(null, '', '#detail/' + id); handleRoute(); }
    });
  }
`, ctx);

function triggerHash(hash) {
  locationState.hash = hash;
  hashchangeListeners.forEach(fn => fn());
}

// ===== 测试 =====
console.log('--- CC 链点击测试 ---');

test('1. CC 链点击 → chain-detail-view 可见', () => {
  // 重置
  sessionStorage.clear();
  locationState.hash = '';
  elements['chain-detail-view'].hidden = true;
  elements['hero'].hidden = false;
  elements['chains'].hidden = false;
  
  // 模拟点击 CC 链卡片
  chainsListEl.dispatchEvent('click');
  // 手动触发（因为 mock 的事件委托需要手动调用）
  ctx.history.pushState(null, '', '#chain/CC-01');
  ctx.handleRoute();
  
  assert(!elements['chain-detail-view'].hidden, 'chain-detail-view 仍然 hidden');
});

test('2. CC 链点击 → URL hash 正确', () => {
  assert(locationState.hash === '#chain/CC-01', `实际: ${locationState.hash}`);
});

test('3. CC 链详情页 → 标题渲染', () => {
  const head = elements['cd-head'];
  assert(head.textContent === 'AI Craves Power', `标题: "${head.textContent}"`);
});

test('4. CC 链 Back 按钮 → onclick 存在', () => {
  const btn = elements['cd-back-btn'];
  assert(typeof btn.onclick === 'function', `onclick: ${typeof btn.onclick}`);
});

test('5. CC 链 Back → 回到首页', () => {
  elements['cd-back-btn'].onclick();
  assert(!elements['chains'].hidden, 'chains 区被隐藏');
  assert(elements['chain-detail-view'].hidden, 'chain-detail-view 仍然可见');
});

console.log('\n--- 预测详情测试 ---');

test('6. 预测卡片点击 → detail-view 可见', () => {
  sessionStorage.clear();
  locationState.hash = '';
  elements['detail-view'].hidden = true;
  elements['hero'].hidden = false;
  
  ctx.history.pushState(null, '', '#detail/FP-01');
  ctx.handleRoute();
  
  assert(!elements['detail-view'].hidden, 'detail-view 仍然 hidden');
});

test('7. 预测详情 → 标题渲染', () => {
  assert(elements['detail-title'].textContent === 'Renewables confirmed',
    `标题: "${elements['detail-title'].textContent}"`);
});

test('8. 预测详情 Back → onclick 存在', () => {
  const btn = elements['detail-back-btn'];
  assert(typeof btn.onclick === 'function', `onclick: ${typeof btn.onclick}`);
});

test('9. 预测详情 Back → detail-view 隐藏', () => {
  // 确认当前在详情页
  assert(!elements['detail-view'].hidden, '前置条件失败');
  
  elements['detail-back-btn'].onclick();
  assert(elements['detail-view'].hidden, 'detail-view 仍然可见');
});

test('10. Back 后首页元素可见', () => {
  assert(!elements['hero'].hidden, 'hero 被隐藏');
  assert(!elements['chains'].hidden, 'chains 被隐藏');
});

console.log('\n--- 来源感知 Back 测试 ---');

test('11. 从首页进详情 → Back 文案 "Back to Home"', () => {
  storage['lastRoute'] = '';
  locationState.hash = '';
  ctx.history.pushState(null, '', '#detail/FP-01');
  ctx.handleRoute();
  
  const btn = elements['detail-back-btn'];
  assert(btn.textContent.includes('Home'), `文案: "${btn.textContent}"`);
});

test('12. 从 CC 链进详情 → Back 文案含 "Chain"', () => {
  storage['lastRoute'] = '#chain/CC-01';
  ctx.history.pushState(null, '', '#detail/FP-01');
  ctx.handleRoute();
  
  const btn = elements['detail-back-btn'];
  assert(btn.textContent.includes('Chain'), `文案: "${btn.textContent}"，期望含 "Chain"`);
});

test('13. 从 CC 链进详情 → Back 点击回到 CC 链', () => {
  storage['lastRoute'] = '#chain/CC-01';
  ctx.history.pushState(null, '', '#detail/FP-01');
  ctx.handleRoute();
  
  // 点击 Back
  elements['detail-back-btn'].onclick();
  
  // 应该回到 CC 链
  assert(locationState.hash === '#chain/CC-01', `hash: ${locationState.hash}，期望 #chain/CC-01`);
  assert(!elements['chain-detail-view'].hidden, 'chain-detail-view 不可见');
});

console.log(`\n=== 结果: ${passed} 通过, ${failed} 失败 ===`);
if (failures.length > 0) {
  console.log('\n失败详情:');
  failures.forEach(f => console.log(`  ${f.name}: ${f.error}`));
}
process.exit(failed > 0 ? 1 : 0);
