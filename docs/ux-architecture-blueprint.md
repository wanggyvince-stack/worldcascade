# WorldCascade 全站 UX 架构蓝图

**Version**: 1.1.0  
**Owner**: 产品扣子  
**Reviewer**: Anna  
**Status**: v1.1 已根据 Anna review 补齐（2026-10-14）  
**Date**: 2026-10-14  
**Scope**: 现有 3 个页面 + 规划中 2 个页面的完整 UX 逻辑

---

## 0. 核心问题诊断

Vincent 15:16 指出："整个网站的 UX 逻辑很混乱" 🔘

**当前问题**：

| # | 症状 | 根因 |
|---|---|---|
| 1 | timeline.html 是孤岛（首页无入口） | 没有规划全局导航 |
| 2 | 详情页 Back 按钮行为混乱 | 没有统一的"来源感知"机制 |
| 3 | 时间线里脉络线缺失 | Sprint 3.1 跳过了因果连线 |
| 4 | 滚轮缩放与页面滚动冲突 | 交互设计未考虑页面级行为 |
| 5 | 节点堆叠 | 布局算法不够精细 |
| 6 | 没有 changelog/backtest 等规划页的入口 | 没有信息架构全局视角 |

**底层问题**：一直在**按功能模块**做（首页 → 详情页 → 因果链 → 时间线），没有先设计**信息架构** 🔘

---

## 1. 信息架构（三层模型）

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1 · 导航中心（Hubs）                              │
│ 用户从这里选择探索方向                                   │
│                                                          │
│  [H1] /index.html 首页                                  │
│    ├─ Hero / Predictions / Chains / Backtest / Trust     │
│    └─ 4 个板块锚点                                       │
│                                                          │
│  [H2] /timeline.html 时间线（全球脉络鸟瞰）              │
│    └─ Z0 散点图 → Z1 域视图                              │
│                                                          │
│  [H3] /changelog.html 更新日志（信号演进追踪）           │
│    └─ 按周分组的 status 迁移事件                         │
│                                                          │
│  [H4] /backtest.html 回测档案（可信度背书）              │
│    └─ 35 条已验证预测 + Brier 0.096 / Hit Rate 97.1%     │
└─────────────────────────────────────────────────────────┘
                          ↓ 用户点击某条
┌─────────────────────────────────────────────────────────┐
│ Layer 2 · 详情层（Details）                              │
│ 展示单条内容的完整信息                                   │
│                                                          │
│  [D1] FP-xx 预测详情（index.html 内 detail-view）        │
│  [D2] CC-xx 因果链详情（index.html 内 chain-detail-view）│
│  [D3] BT-xx 回测详情（/backtest.html 内 modal）          │
│  [D4] Update 详情（/changelog.html 内 tooltip）          │
└─────────────────────────────────────────────────────────┘
                          ↓ 用户想看关联
┌─────────────────────────────────────────────────────────┐
│ Layer 3 · 关联层（Cross-links）                          │
│ 连接不同实体，形成"脉络"                                 │
│                                                          │
│  FP-xx → CC-xx（预测关联的因果链）                       │
│  FP-xx → Timeline（在时间线里的位置）                    │
│  CC-xx → FP-xx（链包含的预测）                           │
│  FP-xx → FP-yy（因果相连的其他预测）                     │
│  BT-xx → FP-yy（回测对应的当前预测，如有）               │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 全局导航（始终可见）

### 2.1 顶部导航栏（Desktop）

```
┌────────────────────────────────────────────────────────────────────┐
│ 🔮 WorldCascade    [Home] [Timeline] [Changelog] [Backtest]    📊 │
└────────────────────────────────────────────────────────────────────┘
```

- 左侧：Logo + 品牌名（始终 → 首页）
- 中间：4 个 Hub 页面导航（**新增**）
  - Home（当前首页）
  - Timeline（`/timeline.html`）
  - Changelog（`/changelog.html`，Sprint 4 实现）
  - Backtest（`/backtest.html`，Sprint 4 实现；先指向 index.html `#backtest` 锚点）
- 右侧：GA4 搜索 / 订阅按钮（Phase 5）

### 2.2 移动端导航

- 顶部汉堡菜单 ☰ → 滑出侧边栏，包含 4 个 Hub
- 底部 Tab Bar（建议）：
  - Home / Timeline / Menu
  - **注**：下注功能尚未开发，等实际开发时再加 Bet 标签

### 2.3 首页 Hero 区入口

```
Hero 文案下方新增 2 个 CTA 按钮：

[Explore Predictions →]（已有，锚点 #predictions）
[View Global Timeline →]（新增，跳 /timeline.html）
```

---

## 3. 来源感知 Back 机制（关键）

### 3.1 核心设计

**来源追踪**：
```javascript
// 进入任何详情前，记录来源
sessionStorage.setItem('lastRoute', location.pathname + location.hash);
```

**Back 按钮文案动态切换**：

| 当前页面 | 来源 | Back 文案 | Back 行为 |
|---|---|---|---|
| FP-xx 预测详情 | 首页 Predictions | ← Back to Predictions | `history.pushState(null, '', '#predictions'); handleRoute();` |
| FP-xx 预测详情 | Timeline | ← Back to Timeline | `location.href = '/timeline.html'` |
| FP-xx 预测详情 | Timeline 域视图 | ← Back to [Domain] Timeline | `location.href = '/timeline.html#climate'` |
| FP-xx 预测详情 | Changelog | ← Back to Changelog | `location.href = '/changelog.html'` |
| CC-xx 因果链详情 | 首页 Chains | ← Back to Causal Chains | `history.pushState(null, '', '#chains'); handleRoute();` |
| CC-xx 因果链详情 | FP-xx 预测详情 | ← Back to [FP-xx] | `history.back()` 或 pushState |
| BT-xx 回测详情 | Timeline | ← Back to Timeline | `location.href = '/timeline.html'` |
| BT-xx 回测详情 | Backtest 页 | ← Back to Backtest Archive | 页内 anchor |

### 3.2 Fallback 默认行为（边界条件）

**场景**：用户通过书签 / 分享链接直接打开 `/#detail/FP-01`，`sessionStorage` 中没有 `lastRoute`

**Fallback**：
- Back 按钮默认文案 → `← Back to Home`
- Back 行为 → `location.hash = '#predictions'`

**新增表格行**：

| 当前页面 | 来源 | Back 文案 | Back 行为 |
|---|---|---|---|
| FP-xx 预测详情 | **无来源（直接链接/书签）** | ← Back to Home | `location.hash = '#predictions'` |
| CC-xx 因果链详情 | **无来源** | ← Back to Home | `location.hash = '#chains'` |
| BT-xx 回测详情 | **无来源** | ← Back to Home | `location.href = '/backtest.html'` |

### 3.3 浏览器原生后退兼容

- `history.pushState` 而非 `location.href`（同站内跳转）
- 监听 `popstate` 事件，调用 `handleRoute()`
- 跨页（`/index.html` ↔ `/timeline.html`）用 `location.href` + sessionStorage 传递来源

---

## 4. 页面内导航（Index.html 内部）

### 4.1 Section 锚点

```
index.html
├─ #hero            Hero 区
├─ #predictions     80 预测卡片区
├─ #chains          因果链区（3 链）
├─ #backtest        回测统计区
├─ #methodology     方法论区
├─ #trust           信任背书区
└─ #detail/{id}     预测详情（SPA 内 overlay）
    #chain-detail/{id}  因果链详情（SPA 内 overlay）
```

### 4.2 handleRoute 行为

```javascript
function handleRoute() {
  const hash = location.hash;
  
  if (hash.startsWith('#detail/')) {
    showDetail(hash.slice(8));
    sessionStorage.setItem('lastRoute', hash);
  } else if (hash.startsWith('#chain-detail/')) {
    showChainDetail(hash.slice(14));
    sessionStorage.setItem('lastRoute', hash);
  } else if (hash === '#predictions') {
    showHomeNoScroll();
    document.getElementById('predictions').scrollIntoView({...});
  } else if (hash === '#chains') {
    showHomeNoScroll();
    document.getElementById('chains').scrollIntoView({...});
  } else if (hash === '#backtest') {
    showHomeNoScroll();
    document.getElementById('backtest').scrollIntoView({...});
  } else if (hash === '#methodology') {
    showHomeNoScroll();
    document.getElementById('methodology').scrollIntoView({...});
  } else if (hash === '#trust') {
    showHomeNoScroll();
    document.getElementById('trust').scrollIntoView({...});
  } else {
    showHome(); // 默认首页
  }
}
```

---

## 5. 跨页导航（Index ↔ Timeline ↔ Changelog ↔ Backtest）

### 5.1 Index → Timeline

**入口**：
- 首页 Hero 区 CTA 按钮 "View Global Timeline →"
- 首页底部 "Explore the full timeline" 链接
- 顶部导航栏 "Timeline"

**行为**：`location.href = '/timeline.html'`

### 5.2 Timeline → Index

**入口**：
- 点击 Timeline 中任一 FP-xx 节点（直接跳详情，不展开 tooltip）
- 点击 Timeline 中因果连线 → CC-xx 详情（见 §5.7）

**行为**：
- FP-xx：`sessionStorage.setItem('lastRoute', 'timeline')` → `location.href = '/#detail/' + id`
- CC-xx：见 §5.7

### 5.3 Index 详情页 → Timeline（反向）

**入口**：
- FP-xx 详情页底部："View this prediction on the timeline →"
- CC-xx 详情页底部："View this chain on the timeline →"

**行为**：
- 基础跳转：`location.href = '/timeline.html'`（不带 hash）
- 高亮标记：`sessionStorage.setItem('pendingHighlight', 'FP-xx')`
- Timeline 初始化时读取 `pendingHighlight` → 高亮节点 + tooltip + 清除 sessionStorage
- 这样 Timeline hash 只承载域过滤，节点高亮走 sessionStorage 瞬态通道，二者不冲突

### 5.4 Changelog → Index

**入口**：
- 点击 changelog 中任一 FP-xx 事件

**行为**：`location.href = '/#detail/' + id` + `sessionStorage.setItem('lastRoute', 'changelog')`

### 5.5 Backtest → Index / Timeline

**入口**：
- 点击 BT-xx 事件
- "View similar current prediction"

**行为**：
- 跳 FP-xx 详情：`location.href = '/#detail/' + id`
- 跳 Timeline 节点：`location.href = '/timeline.html'` + `sessionStorage.setItem('pendingHighlight', 'FP-xx')`（节点高亮走 sessionStorage，不走 hash，见 §7.2）

### 5.6 Timeline → Backtest（补充路径）

**入口**：
- Timeline Stats Card（右上角回测统计卡）点击

**行为**：`location.href = '/#backtest'`，`sessionStorage.setItem('lastRoute', 'timeline')`

**注意**：蓝图 §5.4 Backtest 部分已写 Stats Card，但跨页路径未记录，此处补齐

### 5.7 Timeline 因果曲线 → CC-xx 详情（补充路径）

**入口**：
- 点击 Timeline Z2 视图中的贝塞尔因果曲线

**行为**：
- `sessionStorage.setItem('lastRoute', 'timeline')`
- `location.href = '/#chain-detail/CC-' + curveId`
- Index handleRoute 读取来源后渲染 CC-xx 详情，Back 按钮显示"← Back to Timeline"

### 5.8 Index Backtest 区 → Timeline（补充路径）

**入口**：
- 首页 `#backtest` 区块内新增按钮："View predictions on Timeline →"

**行为**：`location.href = '/timeline.html'`

### 5.9 Timeline BT-xx 节点 → BT-xx 详情（补充行为定义）

**当前状态**：BT-xx 点击只显示 tooltip，无跳转

**新行为定义**：

| BT-xx 节点交互 | 行为 |
|---|---|
| 单击 | 展开 tooltip（显示 outcome / verdict / Brier score） |
| tooltip 内 CTA "View backtest archive →" | `location.href = '/#backtest'`，带锚点高亮 |
| tooltip 内 CTA "Compare to current prediction →" | `location.href = '/#detail/FP-xx'`（关联的当前预测） |

**决策理由**：回测节点属于"查看信息"而非"进入深度详情"，tooltip 足够，不需要独立详情页

---

## 6. 因果脉络层（Cross-cutting concerns）

### 6.1 Timeline 中的因果曲线（Anna 工单 P1）

- 21 条 causalChains 在 Timeline Z2 视图渲染贝塞尔曲线
- 曲线颜色 = 源域 → 目标域渐变
- 曲线粗细 = evidenceStrength
- 点击曲线 → 跳 CC-xx 详情（完整路径定义见 §5.7）

### 6.2 Index 预测详情中的关联预测

- FP-xx 详情页 "Related Predictions" 区
- 显示因果相连的 FP-yy 列表（来自 causalChains）
- 点击 → 跳 FP-yy 详情

### 6.3 全局搜索（Phase 5）

- 顶部导航栏右侧搜索框
- 输入 FP-xx / BT-xx / 关键词 → 跳对应详情
- 支持模糊匹配 title / domain / tags

---

## 7. 状态管理

### 7.1 sessionStorage 字段

| Key | 写入时机 | 读取时机 |
|---|---|---|
| `lastRoute` | 进入任何详情/Hub 前 | Back 按钮判断文案/行为 |
| `lastHub` | 进入任何 Hub 页（home/timeline/changelog/backtest）| 顶部导航高亮当前 Hub |
| `lastDomainFilter` | Timeline 中切换域过滤 | 从详情页返回 Timeline 时恢复 |
| `lastZoomLevel` | Timeline 中缩放 | 从详情页返回 Timeline 时恢复 |
| `pendingHighlight` | 从 Index/Backtest 跳 Timeline 节点时 | Timeline 初始化时高亮目标节点 + tooltip + 清除 |

### 7.2 URL hash 规范

**Index.html**:
- `#predictions` / `#chains` / `#backtest` / `#methodology` / `#trust`
- `#detail/FP-xx`
- `#chain-detail/CC-xx`

**Timeline.html**:
- `#` (无) = Z0 全局视图
- `#climate` / `#ai` / ... = Z1 域视图（持久态，刷新保持）
- `#BT-xx` = 高亮该回测节点并展开 tooltip（瞬态，不持久）
- FP-xx 高亮 → **不写入 hash**（纯 JS 状态，见下方决策）

**Changelog.html**:
- `#week-2026-10-14` = 跳到某周
- `#FP-xx` = 高亮某预测

**Backtest.html**:
- `#BT-xx` = 跳某回测
- `#domain-climate` = 过滤某域

---

## 8. 实施路线图

### Sprint 3.5 · UX 统一改造（本周）🔘 优先级最高

**目标**：把现有 2 个页面的 UX 跑通

**任务**：

- [ ] **UX-01**：顶部导航栏（4 个 Hub 链接）
  - index.html + timeline.html 都加
  - 响应式：desktop 顶栏 / mobile 汉堡菜单
  - 当前 Hub 高亮

- [ ] **UX-02**：首页 Hero 区入口
  - 新增 "View Global Timeline →" CTA
  - 调整按钮布局（与 "Explore Predictions" 并列）

- [ ] **UX-03**：来源感知 Back 机制
  - `sessionStorage.setItem('lastRoute', ...)` 在所有跳转入口
  - Back 按钮文案/行为根据来源动态切换
  - Fallback：无来源时默认 `← Back to Home`（见 §3.2）
  - 覆盖路径：Home↔Detail / Timeline↔Detail / Timeline↔Chain / BT-xx tooltip / 直接链接 fallback

- [ ] **UX-04**：Timeline 三个 UX bug 修复（Anna 工单）
  - P2 滚轮（Ctrl/Cmd + 滚轮才缩放）
  - P1 节点堆叠（按域分组 + 贪心分层）
  - P3 因果曲线（renderCausalChains 函数，路径定义见 §5.7）

**Sprint 3.5 P0 范围（本周 3-4 天完成）**：UX-01 + UX-02 + UX-03 + UX-04

- [ ] **UX-05**：index.html 详情页底部 Cross-links（P1 · 下周）
  - "View this prediction on the timeline →"
  - "Related predictions: [FP-yy, FP-zz]"

- [ ] **UX-06**：timeline.html BT-xx tooltip 增强（P1 · 下周）
  - BT-xx 节点点击后 tooltip 含 "View backtest archive →" / "Compare to current prediction →" CTA
  - 完整交互定义见 §5.9

**验收**：
- 从首页能进 Timeline
- 从 Timeline 能进预测详情，Back 正确返回 Timeline
- 从 Timeline 能进因果链详情，Back 正确返回 Timeline
- 直接链接 `/#detail/FP-01` 打开时，Back 按钮 fallback 到首页
- 没有"孤岛页面"

### Sprint 4 · Changelog + Backtest Hub

- [ ] `changelog.html` + 数据 `changelog.json`
- [ ] `backtest.html` 独立页（从 index.html 锚点升级为独立页）
- [ ] 顶部导航栏 Changelog / Backtest 链接生效

### Sprint 5 · 全局搜索 + 订阅

- [ ] 顶部搜索框
- [ ] 邮件订阅入口
- [ ] GA4 接入

---

## 9. 优先级判定

| 任务 | 优先级 | 工作量 | 阻塞 |
|---|---|---|---|
| **UX-01 顶部导航栏** | P0 | 0.5 天 | - |
| **UX-02 首页 CTA** | P0 | 0.25 天 | - |
| **UX-03 来源感知 Back** | P0 | 0.5 天 | - |
| **UX-04 Timeline 三个 bug** | P0 | 1 天 | Anna 工单已详细 |
| **UX-05 Index cross-links** | P1 | 0.25 天 | - |
| **UX-06 Timeline cross-links** | P1 | 0.25 天 | - |
| Changelog 独立页 | P2 | 1 天 | 依赖 update_mechanism 实施 |
| Backtest 独立页 | P2 | 0.5 天 | - |
| 全局搜索 | P3 | 1.5 天 | - |

**Sprint 3.5 总工作量**：约 3 天 🔘 本周内完成 🔘

---

## 10. UX 流程图（核心路径）

```
                  ┌──────────────────┐
                  │   用户首次进入    │
                  └────────┬─────────┘
                           ↓
                  ┌──────────────────┐
                  │    /index.html   │
                  │  Hero + 4 板块   │
                  └────────┬─────────┘
                           │
       ┌───────────┬──────┴──────┬──────────────┐
       ↓           ↓             ↓              ↓
┌───────────┐ ┌─────────┐ ┌──────────┐ ┌────────────┐
│ #predict- │ │ #chains │ │ #back-   │ │ /timeline  │
│  ions 区  │ │ 区      │ │ test 区  │ │ .html      │
└─────┬─────┘ └────┬────┘ └────┬─────┘ └─────┬──────┘
      │            │            │              │
      ↓            ↓            │              ↓
┌───────────┐ ┌──────────┐     │        ┌──────────┐
│ 点击卡片  │ │ 点击链   │     │        │ 点击节点  │
│ FP-xx     │ │ CC-xx    │     │        │ FP-xx    │
└─────┬─────┘ └────┬─────┘     │        └────┬─────┘
      ↓            ↓            │              ↓
┌───────────┐ ┌──────────┐     │        ┌──────────┐
│ FP-xx 详情│ │ CC-xx    │     │        │ FP-xx 详情│
│ Back:     │ │ 详情     │     │        │ Back:    │
│ "← Pred-  │ │ Back:    │     │        │ "← Time- │
│  ictions" │ │ "← Chains│     │        │  line"   │
└───────────┘ └──────────┘     │        └──────────┘
                               │
                               ↓
                        ┌──────────┐
                        │ /change- │
                        │ log.html │
                        │ (Sprint 4)│
                        └──────────┘
```

---

## 11. 决策记录

| 决策 | 选项 | 选择 | 理由 |
|---|---|---|---|
| 顶部导航栏 | 4 Hub / 2 Hub / 无 | **4 Hub** | 完整信息架构；Changelog/Backtest 暂指向占位锚点 |
| Back 机制 | sessionStorage / URL 参数 / referrer | **sessionStorage** | URL 参数污染；referrer 跨页不可靠 |
| Timeline 入口位置 | Hero CTA / 顶部导航 / 底部链接 / 全都要 | **全都要** | 多入口提高发现率 |
| 跨页跳转 | location.href / SPA pushState | **location.href**（跨页）+ pushState（同页）| 不同 HTML 文件无法 pushState |
| 节点堆叠修复 | 贪心分层 / 力导向 / 时间偏移 | **贪心分层** | 简单可预测；力导向不可控 |
| 滚轮行为 | 普通滚轮缩放 / Ctrl+滚轮缩放 | **Ctrl+滚轮缩放** | 避免与页面滚动冲突 |
| 因果曲线渲染时机 | Sprint 3.1 / 3.5 | **3.5** | 3.1 已经超载；与 UX 改造合并 |
| **Timeline FP-xx 节点点击行为** | 直接跳详情 / Tooltip + CTA 链接 | **直接跳详情**（与 Index 预测卡片行为一致） | 用户意图明确时不打断；Tooltip 留给 hover/zoom 场景；§5.2/§5.9 BT-xx 用 Tooltip+CTA 因为回测节点属于轻浏览 |
| **Timeline Hash 分层** | 组合 hash（`#climate/FP-01`）/ 域持久+节点瞬态 | **域持久+节点瞬态**（hash 只承载域过滤，节点高亮走 sessionStorage `pendingHighlight`）| 组合 hash 解析复杂；瞬态高亮用 sessionStorage 更简单，刷新后自动回域全局视图，符合用户心智 |
| **Sprint 3.5 范围** | 6 任务本周 / UX-01~04 本周 + UX-05/06 下周 | **UX-01~04 本周 P0；UX-05/06 下周 P1** | 本周只剩 3-4 工作日；先跑通导航主干，Cross-links 下周补 |

---

## 12. 下一步

1. **Vincent 审批** 本 UX 蓝图（v1.1 已补齐 Anna review 的所有点）
2. **通过后** 启动 Sprint 3.5 P0（UX-01 + UX-02 + UX-03 + UX-04，本周 3-4 天）
3. **Sprint 3.5 P1**（UX-05 + UX-06，下周）
4. **Anna 的 timeline-ux-fix-wo.md** 三个 bug 并入 UX-04（Timeline 三个 bug）
5. **暂不实施** Sprint 4/5（等 Sprint 3.5 验收后再议）

---

## 13. 给 Anna 的协作请求

[用户](at://user:4074167025546823_0) Anna，v1.1 已按你的 review 全部补齐 🔘

- ✅ §5 补 4 条缺失路径（§5.6 Timeline→Backtest / §5.7 曲线→CC-xx / §5.8 Backtest 区→Timeline / §5.9 BT-xx tooltip 行为）
- ✅ §11 决策表补 3 个决策（FP-xx 节点点击 / Hash 分层 / Sprint 3.5 范围）
- ✅ §3.2 加 Fallback 默认行为（无来源时 `← Back to Home`）
- ✅ §7.1 sessionStorage 加 `pendingHighlight` 字段
- ✅ §7.2 Timeline hash 规范重写（域持久 / 节点瞬态）
- ✅ §2.2 移动端 Tab Bar 去掉 Bet
- ✅ §8 Sprint 3.5 拆 P0（本周 UX-01~04）/ P1（下周 UX-05/06）
- ✅ §5.2 / §5.3 / §5.5 / §6.1 全部对齐新决策（节点点击直接跳详情，高亮走 sessionStorage）

你的 3 个 review 要点都覆盖了 🔘 等你再扫一眼确认没遗漏 🔘

[用户](at://user:4074167025546823_0) 等你审批蓝图 🔘 批完我就启动 Sprint 3.5 P0 🔘
