# timeline.js UX 修复工单 — 3 个问题

**优先级**: P0
**文件**: `public/js/timeline.js`
**参考**: `timeline-design-mockup.html`（我写的原始 mockup，因果曲线+交互已实现）

---

## 问题 1：脉络线（因果曲线）缺失

Sprint 3.1 没有渲染因果链曲线。`predictions.json` 里已经有 21 条因果链（`causalChains` 字段），数据已加载到 `causalChains` 变量，但没有任何渲染代码。

### 修复方案

参照 mockup（`timeline-design-mockup.html` 第 320~496 行），新增 `renderCausalChains()` 函数：

**步骤：**

1. 从 `causalChains` 数组提取所有 source→target 节点对
2. 在 `<defs>` 中为每条链创建 `linearGradient`（从源域颜色渐变到目标域颜色）
3. 在 `<defs>` 中添加箭头 marker
4. 在泳道背景和节点之间插入 `<g class="causal-links">` 层
5. 每条链用贝塞尔曲线渲染：

```js
// 贝塞尔曲线（从 mockup 第 484~489 行）
const dx = tx - sx;
const cp1x = sx + dx * 0.4, cp2x = tx - dx * 0.4;
const pathD = `M${sx},${sy} C${cp1x},${sy} ${cp2x},${ty} ${tx},${ty}`;
```

6. 样式：`stroke-width: 2`, `opacity: 0.7`, `fill: none`, 渐变色 stroke, 箭头 marker
7. **域筛选联动**：当激活单域筛选时，只显示两端都在该域的链（跨域链也显示），其余链 opacity 降到 0.05

**渲染顺序**（z-order 从底到顶）：
```
泳道底纹 → 时间轴网格 → 因果曲线 → 回测节点 → 预测节点 → NOW线
```

当前代码的渲染顺序是 `renderLanes → renderTimeAxis → renderNowLine → renderStatsCard → renderBacktestNodes → renderPredictionNodes`。需要在 `renderTimeAxis` 之后、`renderBacktestNodes` 之前插入 `renderCausalChains`。

---

## 问题 2：鼠标滚轮缩放体验差

当前行为：普通滚轮 = 横向缩放时间轴。用户正常滚动页面时会意外触发缩放，体验很差。

### 修复方案

修改 `setupZoom()` 中的滚轮事件处理：

```js
container.addEventListener('wheel', function(event) {
  event.preventDefault();
  
  // Shift + 滚轮 = 横向滚动（不缩放）
  if (event.shiftKey) {
    container.scrollLeft += event.deltaY;
    return;
  }
  
  // Ctrl/Cmd + 滚轮 = 缩放（明确意图才缩放）
  if (event.ctrlKey || event.metaKey) {
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    currentZoom = Math.max(0.5, Math.min(5, currentZoom + delta));
    render();
    return;
  }
  
  // 普通滚轮 = 垂直滚动（让浏览器默认行为处理）
  // 不 preventDefault，让页面正常上下滚动
}, { passive: true });  // 改为 passive: true
```

**关键改动：**
- 普通滚轮 → 垂直滚动（不拦截）
- Shift + 滚轮 → 横向滚动
- Ctrl/Cmd + 滚轮 → 缩放（只有明确按住修饰键才缩放）
- `passive: true`（允许浏览器默认滚动行为）

同时保留键盘缩放（+/- 键）和触屏双指缩放不变。

---

## 问题 3：事件在 domain 内堆叠

当前 `computeYOffsets()` 只处理**完全相同日期**的节点。实际上很多预测的 verificationDate 只差几天，在时间轴上视觉上重叠（因为节点半径 4~12px）。

### 修复方案

把碰撞检测从"同日期"改为"同域 + 水平距离 < 阈值"：

```js
function computeYOffsets() {
  const offsetMap = {};
  const MIN_PX_GAP = 18; // 节点之间最小水平间距（像素）
  
  // 按域分组，域内按日期排序
  const byDomain = {};
  predictions.forEach(p => {
    if (!byDomain[p.domain]) byDomain[p.domain] = [];
    byDomain[p.domain].push(p);
  });
  
  Object.values(byDomain).forEach(preds => {
    preds.sort((a, b) => new Date(a.verificationDate) - new Date(b.verificationDate));
    
    // 贪心分层：每个节点分配到不冲突的层
    const layers = []; // 每层记录最后一个节点的 x 位置
    preds.forEach(p => {
      const px = xScale(new Date(p.verificationDate));
      let assigned = -1;
      for (let li = 0; li < layers.length; li++) {
        if (px - layers[li] >= MIN_PX_GAP) {
          assigned = li;
          layers[li] = px;
          break;
        }
      }
      if (assigned === -1) {
        assigned = layers.length;
        layers.push(px);
      }
      // 层偏移：中心线上下交替
      const sign = assigned % 2 === 0 ? 1 : -1;
      const magnitude = Math.ceil((assigned + 1) / 2) * 12;
      offsetMap[p.id] = sign * magnitude;
    });
  });
  
  // 回测同理
  const byDomainB = {};
  backtests.forEach(b => {
    if (!byDomainB[b.domain]) byDomainB[b.domain] = [];
    byDomainB[b.domain].push(b);
  });
  
  Object.values(byDomainB).forEach(bts => {
    bts.sort((a, b) => new Date(a.resolvedDate) - new Date(b.resolvedDate));
    const layers = [];
    bts.forEach(b => {
      const px = xScale(new Date(b.resolvedDate));
      let assigned = -1;
      for (let li = 0; li < layers.length; li++) {
        if (px - layers[li] >= MIN_PX_GAP) {
          assigned = li;
          layers[li] = px;
          break;
        }
      }
      if (assigned === -1) {
        assigned = layers.length;
        layers.push(px);
      }
      const sign = assigned % 2 === 0 ? 1 : -1;
      const magnitude = Math.ceil((assigned + 1) / 2) * 10;
      offsetMap[b.id] = sign * magnitude;
    });
  });
  
  return offsetMap;
}
```

**关键改进：**
- 按域分组 + 按日期排序
- 贪心分层算法：同域内水平距离 < 18px 的节点分配到不同层
- 层偏移交替上下：第 0 层向上 12px，第 1 层向下 12px，第 2 层向上 24px...
- 泳道高度 72px，中心线上下各 36px 空间，最多支持 ~3 层不溢出

**注意**：`computeYOffsets()` 依赖 `xScale`，需要确保在 `render()` 中 `xScale` 已初始化后再调用。当前代码中 `render()` 先创建 `xScale` 再调用 `computeYOffsets()`，所以顺序是对的。

---

## 验收标准

| # | 验收项 | 标准 |
|---|---|---|
| 1 | 因果曲线渲染 | 21 条因果链全部可见，贝塞尔曲线连接源→目标，渐变色+箭头 |
| 2 | 域筛选联动 | 选择单域时，非相关曲线 opacity < 0.1 |
| 3 | 滚轮行为 | 普通滚轮=垂直滚动，Ctrl+滚轮=缩放，Shift+滚轮=横向滚动 |
| 4 | 无堆叠 | 同域内任意两个节点视觉上不重叠（最小间距 18px） |
| 5 | 不溢出 | 分层偏移后节点不超出泳道边界（±36px 以内） |
| 6 | 现有功能不退化 | 80 预测 + 35 回测 + tooltip + 域筛选 + 键盘导航 全部正常 |

---

## 执行顺序

建议按 **P2 → P1 → P3** 顺序修（先修体验问题，再加新功能）：
1. 先修 P2（滚轮）— 5 分钟
2. 再修 P3（堆叠）— 15 分钟
3. 最后加 P1（因果曲线）— 30 分钟
