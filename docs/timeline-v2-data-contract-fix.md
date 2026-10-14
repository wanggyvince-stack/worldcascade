# timeline.js 数据兼容修复 — v2 domain 格式适配

**优先级**: P0（阻塞 timeline 显示）
**文件**: `public/js/timeline.js`
**预计改动量**: ~30 行，纯 JS 修改，无 CSS/HTML 变更

---

## 问题

`export_mvp_data.py` 已升级输出格式，`predictions.json` 中 `domain` 字段从字符串变为嵌套对象：

```json
// 旧格式（v1）— timeline.js 当前只支持这种
{ "domain": "energy", "domainColor": "#10B981", "domainLabel": "Energy", "domainIcon": "⚡" }

// 新格式（v2）— 当前 timeline.js 读不了，导致全部预测被 filter 过滤 → 空泳道
{ "domain": { "key": "energy", "label": "Energy", "color": "#10B981", "icon": "⚡" } }
```

**backtest_timeline.json 同理**，`domain` 字段也可能变成嵌套对象。

---

## 修改说明

### 1. 提取 DOMAIN_KEY_MAP 常量（第 28 行附近）

把原来 `normalizeDomain()` 内部的 `map` 对象提取为模块级常量 `DOMAIN_KEY_MAP`，新增 `extractDomainKey()` 辅助函数：

```js
const DOMAIN_KEY_MAP = {
  'ai': 'AI', 'AI': 'AI',
  'energy': 'Energy',
  'demographics': 'Demographics',
  'climate': 'Climate',
  'biotech': 'Biotech',
  'quantum': 'Quantum',
  'space': 'Space', 'space-alien': 'Space', 'space-economy': 'Space',
  'health': 'Health',
  'geopolitics': 'Geopolitics',
  'economics': 'Economics',
  'finance': 'Finance',
  'transport': 'Transport',
  'food': 'Food',
  'cross-domain': 'Geopolitics', 'cross_domain': 'Geopolitics', 'Cross-Domain': 'Geopolitics'
};

function normalizeDomain(raw) {
  if (!raw) return null;
  // v2: domain is nested object { key, label, color, icon }
  if (typeof raw === 'object' && raw.key) {
    return DOMAIN_KEY_MAP[raw.key] || null;
  }
  // v1: domain is plain string
  return DOMAIN_KEY_MAP[raw] || null;
}

function extractDomainKey(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw.key || null;
  return raw;
}
```

### 2. 修改 loadData() 中 predictions 处理逻辑（第 96 行附近）

```js
// Process predictions — support both v1 (flat) and v2 (nested domain object)
predictions = (predData.predictions || []).map(p => {
  const canonDomain = normalizeDomain(p.domain);
  const rawKey = extractDomainKey(p.domain);
  const domainObj = (typeof p.domain === 'object') ? p.domain : null;
  return {
    id: p.id,
    title: p.title,
    domain: canonDomain || rawKey || (typeof p.domain === 'string' ? p.domain : null),
    domainLabel: p.domainLabel || (domainObj && domainObj.label) || canonDomain || rawKey || '',
    domainColor: DOMAIN_COLORS[canonDomain] || (domainObj && domainObj.color) || p.domainColor || '#94A3B8',
    domainIcon: p.domainIcon || (domainObj && domainObj.icon) || '',
    verificationDate: p.verificationDate,
    originalConfidence: p.originalConfidence || 0,
    engineScore: p.engineScore || 0,
    confidenceLevel: p.confidenceLevel || 'unknown',
    status: (p.leadingSignal && p.leadingSignal.status) || 'none'
  };
}).filter(p => p.domain && LANE_ORDER.includes(p.domain));
```

### 3. 修改 loadData() 中 backtests 处理逻辑（第 114 行附近）

同样的模式，把 `b.domain` 的读取改为双格式兼容：

```js
// Process backtests — same dual-format support
backtests = (btData.entries || []).map(b => {
  const canonDomain = normalizeDomain(b.domain);
  const rawKey = extractDomainKey(b.domain);
  const domainObj = (typeof b.domain === 'object') ? b.domain : null;
  return {
    id: b.id,
    title: b.title,
    domain: canonDomain || rawKey || (typeof b.domain === 'string' ? b.domain : null),
    domainLabel: b.domainLabel || (domainObj && domainObj.label) || canonDomain || rawKey || '',
    domainColor: DOMAIN_COLORS[canonDomain] || (domainObj && domainObj.color) || b.domainColor || '#94A3B8',
    domainIcon: b.domainIcon || (domainObj && domainObj.icon) || '',
    predictedDate: b.predictedDate,
    resolvedDate: b.resolvedDate,
    outcome: b.outcome,
    brierScore: b.brierScore,
    engineScore: b.engineScore,
    originalConfidence: b.originalConfidence,
    verificationMethod: b.verificationMethod
  };
}).filter(b => b.domain && LANE_ORDER.includes(b.domain));
```

### 4. 更新文件头注释

```js
/**
 * WorldCascade Timeline - Z0 Minimum Viable Version
 * Sprint 3.1 - WO-02 v1.1.0 (data-contract v2 compatible)
 * D3.js v7 timeline with domain swim lanes, NOW line, backtest + prediction nodes
 * Supports both v1 (flat domain string) and v2 (nested domain object) data formats
 */
```

---

## 验收标准

1. **v1 数据格式**（当前线上）：timeline 正常显示 80 条预测 + 35 条回测 ✅ 不变
2. **v2 数据格式**（新 export 输出）：timeline 同样正常显示，所有 12 泳道有节点 ✅ 新增
3. **混合格式**：同一份 JSON 中部分预测用 v1、部分用 v2，也能正确渲染 ✅
4. **cross-domain → Geopolitics 映射**：6 条跨域预测在 Geopolitics 泳道显示 ✅
5. **space-alien / space-economy → Space 映射**：9 条太空预测在 Space 泳道显示 ✅
6. **edge case**：`domain: null` / `domain: undefined` / `domain: {}` → 被 filter 过滤，不报错 ✅

---

## 注意事项

- **不要改 predictions.json 或 backtest_timeline.json 的数据格式**，只改 timeline.js 的读取逻辑
- **不要改 CSS / HTML**，本次纯 JS 修复
- Anna 已经在本地 `/Coze/Drive/cathealthsignal/worldcascade/public/js/timeline.js` 完成了修改并通过测试，你可以直接参考或复制
- 修改完成后 commit message 建议：`fix(timeline): support v2 nested domain object format`
