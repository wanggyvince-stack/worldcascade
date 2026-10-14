# WorldCascade UX 实施状态报告

**Owner**: 产品扣子  
**Reviewer**: Anna  
**Date**: 2026-10-14  
**Status**: 开发完成，待 Anna 审阅验收

---

## 一、UX Blueprint 承诺 vs 实际完成

| 任务 | 承诺 | 状态 | 备注 |
|---|---|---|---|
| **UX-01** 顶部导航栏 | index + timeline 双页 5 Hub 链接，响应式 | ✅ 完成 | 5 个 Hub: Home/Timeline/Changelog/Backtest/Methodology |
| **UX-02** Hero CTA | 新增 View Global Timeline 按钮 | ✅ 完成 | 与 Explore Predictions 并列 |
| **UX-03** 来源感知 Back | sessionStorage lastRoute + 动态 Back 文案 | ✅ 完成 | 覆盖 8 种场景 + fallback |
| **UX-04** Timeline 三 bug | 滚轮/堆叠/因果曲线 | ✅ 完成 | 因果曲线改为阶梯式 + 起点终点圆点 |
| **UX-05** 详情页 Cross-links | View on timeline + Related predictions/chains | ✅ 完成 | 本次新增 |
| **UX-06** BT-xx tooltip 增强 | View backtest + Compare to prediction CTA | ✅ 完成 | 已实现 |

---

## 二、关键 UX 决策

### 2.1 详情页返回逻辑

**原则**：Back 按钮文案和行为根据来源动态切换

| 当前页面 | 来源 | Back 文案 | Back 行为 |
|---|---|---|---|
| FP-xx 详情 | 首页 Predictions | ← Back to Predictions | `#predictions` 锚点滚动 |
| FP-xx 详情 | Timeline | ← Back to Timeline | `location.href = '/timeline.html'` |
| FP-xx 详情 | Changelog | ← Back to Changelog | `location.href = '/changelog.html'` |
| FP-xx 详情 | Backtest | ← Back to Backtest | `#backtest` 锚点滚动 |
| FP-xx 详情 | 直接链接/书签 | ← Back to Home | `#predictions` 锚点滚动 |
| CC-xx 详情 | 首页 Chains | ← Back to Causal Chains | `#chains` 锚点滚动 |
| CC-xx 详情 | FP-xx 详情 | ← Back to Prediction | `history.back()` 或 `#detail/FP-xx` |
| CC-xx 详情 | Timeline | ← Back to Timeline | `location.href = '/timeline.html'` |
| CC-xx 详情 | 直接链接/书签 | ← Back to Home | `#chains` 锚点滚动 |

**实现机制**：
```javascript
// 进入详情前记录来源
sessionStorage.setItem('lastRoute', location.hash);  // 站内
sessionStorage.setItem('lastRoute', 'timeline');  // 跨站

// Back 按钮根据 lastRoute 动态切换文案和行为
function updateBackButton(btn, fallbackHash, fallbackText) {
  const last = sessionStorage.getItem('lastRoute') || '';
  // ... 根据 last 切换文案和行为
}
```

### 2.2 因果脉络线视觉设计

**问题**：21 条链全显示必然重叠混乱

**解决方案**：
1. **只显示核心链**：strength ≥ 60 的链才显示（约 7-8 条）
2. **垂直段错开**：每条链的垂直段在 35%、41%、47%、53%、59% 位置，不再挤在中点
3. **起点终点标识**：起点圆点 (r=4) + 终点圆点 (r=5)，颜色继承 domain
4. **hover 高亮**：鼠标悬停时当前链加粗+100% opacity，其他链淡到 15%
5. **箭头标识**：末端 SVG marker 箭头，颜色继承 target domain

**路径形状**：阶梯式三段路径（水平→垂直→水平），像电路图一样清晰

### 2.3 URL Hash 规范

**Index.html**:
- `#predictions` / `#chains` / `#backtest` / `#methodology` / `#trust` — 锚点滚动
- `#detail/FP-xx` — 预测详情 (SPA overlay)
- `#chain/CC-xx` — 因果链详情 (SPA overlay)

**Timeline.html**:
- `#` (无) = Z0 全局视图
- `#climate` / `#ai` / ... = Z1 域视图（持久态，刷新保持）
- FP-xx 高亮 → **不写入 hash**（纯 JS 状态，通过 sessionStorage.pendingHighlight 传递）

---

## 三、待 Anna 验收项

### 3.1 功能验收

- [ ] **首页导航栏**：5 个 Hub 链接是否清晰？当前 Hub 高亮是否正确？
- [ ] **Hero CTA**：View Global Timeline 按钮是否显眼？点击是否跳 Timeline？
- [ ] **预测卡片点击**：点击 FP-xx 卡片是否进入详情页？
- [ ] **因果链卡片点击**：点击 CC-xx 卡片是否进入 chain-detail 页？
- [ ] **详情页 Cross-links**：
  - View on timeline 链接是否显示？
  - Related Predictions 是否显示（如果有）？
  - Related Causal Chain 是否显示（如果有）？
- [ ] **Back 按钮**：
  - 从首页点击→Back 显示"← Back to Predictions"？
  - 从 Timeline 点击→Back 显示"← Back to Timeline"？
  - 直接访问 `/#detail/FP-01`→Back 显示"← Back to Home"？
- [ ] **Timeline 脉络线**：
  - 起点终点圆点是否清晰？
  - 阶梯式路径是否比之前的曲线更易读？
  - hover 高亮是否有效？
- [ ] **Timeline 节点点击**：点击 FP-xx 节点是否进入详情页？
- [ ] **Timeline BT-xx tooltip**：CTA 按钮是否显示？点击是否跳转正确？

### 3.2 视觉验收

- [ ] 导航栏样式是否与整体设计一致？
- [ ] 详情页 Cross-links 区块布局是否合理？
- [ ] 脉络线颜色/粗细/箭头是否清晰可辨？
- [ ] 响应式：移动端导航栏是否正常？

### 3.3 边界场景

- [ ] 直接访问 `/#detail/FP-01`（无来源）→ 页面是否正常显示？Back 是否正确？
- [ ] 直接访问 `/#chain/CC-01`（无来源）→ 页面是否正常显示？Back 是否正确？
- [ ] Timeline 域过滤后点击节点→返回后是否恢复过滤状态？（待 Sprint 4 实现）

---

## 四、已知限制 & 后续优化

### 4.1 当前限制

1. **Timeline 域过滤状态恢复**：从详情页返回 Timeline 时，域过滤状态会重置（需 Sprint 4 实现 sessionStorage.lastDomainFilter）
2. **Timeline 节点高亮**：从首页点击"View on timeline"后，Timeline 需手动找节点（需实现 pendingHighlight 机制）
3. **移动端导航**：当前只有 desktop 顶栏，mobile 汉堡菜单待实现

### 4.2 后续优化建议

1. **脉络线分层显示**：提供"显示全部链"开关，默认只显示核心链
2. **详情页返回动画**：添加页面切换过渡动画
3. **全局搜索**：Phase 5 实现顶部搜索框
4. **Breadcrumb 导航**：详情页顶部添加面包屑（Home > Predictions > FP-xx）

---

## 五、Commit 记录

| Commit | 内容 |
|---|---|
| `6b36552` | UX-01 导航栏 + UX-02 Hero CTA + UX-03 Back 机制 (初版) |
| `dc36e9c` | UX-04 Timeline 三 bug (滚轮/堆叠/曲线) |
| `01ded4b` | 修复 handleRoute return bug (BUG-1/4) + navigateToPrediction URL (BUG-3) |
| `696a06a` | 脉络线改为阶梯式三段路径 |
| `8ab5465` | 脉络线 v3: 只显核心链 + 垂直段错开 + hover 高亮 |
| `12e3d7b` | UX-05 Cross-links + 脉络线起点终点圆点 + setLastRoute 补全 |

---

**Anna 请审阅以上验收项，有任何问题随时反馈。** 🙏
