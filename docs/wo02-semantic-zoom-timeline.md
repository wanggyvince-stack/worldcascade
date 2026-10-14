# WO-02: 5-Level Semantic Zoom Timeline

**Work Order ID**: WO-02  
**Version**: 1.1.0  
**Owner**: 产品扣子  
**Status**: Draft → Awaiting implementation  
**Date**: 2026-10-14  
**Dependencies**: Anna's timeline mockup ✅ (v2 reviewed), Prediction Update Mechanism (Phase 2-3)

### v1.1.0 变更记录（2026-10-14）

基于 Anna v2 mockup review + Vincent 审批：

1. **Domain 扩展到 12 个**（原 8 域 + Geopolitics/Economics/Finance/Transport/Food）—— backtest 数据驱动
2. **Status 视觉编码改为光晕 + 边框**（不用形状）—— 12 域 × 5 status 用形状会视觉爆炸
3. **交互补全**：domain 单选 / 全选、事件点击、zoom 控制、Back to Predictions/Timeline 多来源
4. **视觉调整**：斑马纹交替底纹 + 左侧 3px 域色条 + 淡化分割线（替代域颜色底纹）
5. **数据源动态加载**：predictions.json + backtest_timeline.json + causalChains，不硬编码

---

## 1. 背景与目标

### 1.1 产品承诺

WorldCascade 的核心差异化体验：

> **"Google Maps 式的语义缩放"** —— 用户可以从全球宏观视角一路缩放到单条预测的原始数据 🔘

这是产品在 PRD / Pitch Deck 里承诺的体验 🔘 Sprint 1-2 没动这块 🔘 现在 Sprint 3 补齐 🔘

### 1.2 当前状态

- ✅ 80 预测卡片（按 domain 分组）
- ✅ 详情页（FP-xx 完整信息）
- ✅ 21 条因果链（3 跨域 + 18 域内）
- ❌ **没有跨预测的脉络视图** —— 用户看不出 FP-47 → FP-11 → FP-17 之间的关联
- ❌ **没有时间演进视图** —— 用户看不到预测从 monitoring → triggered 的演进轨迹
- ❌ **没有全局鸟瞰** —— 用户只能看单条预测或单条链，看不到 80 条的全貌

### 1.3 WO-02 目标

交付 5 级语义缩放的时间线体验 🔘 每一级回答不同的问题 🔘

| 层级 | 视图 | 用户问题 | 形态 |
|---|---|---|---|
| **Z0** | 全局鸟瞰 | "这个世界现在有多少事在发生？" | 时间轴上 80 点的散点图（按 domain 着色） |
| **Z1** | 域视图 | "Climate 这个域最近怎么样？" | 单域放大，显示该域所有预测 |
| **Z2** | 脉络视图 | "这些预测之间有什么关系？" | 因果连线 + 状态迁移轨迹（Anna mockup 的层级） |
| **Z3** | 预测详情 | "FP-47 这一条具体怎么样？" | 现有详情页（FP-xx） |
| **Z4** | 原始数据 | "数据在哪？怎么算的？" | updateHistory 数组 + backtest 原始数据 |

### 1.4 Z0 最小验证版的定义

**不是一次性做完 5 级** 🔘 先做 Z0 验证核心价值 🔘

**Z0 最小验证版 = 时间轴散点图 + 交互缩放 + 跳详情**

验收标准：
1. 用户打开 `/timeline.html` 看到一条横轴（时间）+ 80 个散点
2. 每个散点按 domain 着色 + 按 status 大小编码
3. 横轴可滚动（过去 2 年 → 未来 5 年）
4. 点击散点 → 跳到 Z3（FP-xx 详情页）
5. 缩放（Ctrl+滚轮 或 pinch）→ 进入 Z1 / Z2 层级（先占位，后续迭代）

---

## 2. 用户故事

### US-02.1 全局鸟瞰

**作为** 第一次访问的用户  
**我想** 一眼看到"这个世界有多少事在发生"  
**以便** 判断 WorldCascade 是不是值得继续关注

**验收**：
- 打开 /timeline.html → 看到 80 个散点分布在时间轴上
- 横轴：2024-01 → 2031-12（过去 2 年 + 未来 5 年）
- 纵轴：domain 分组（12 域：AI / Energy / Demographics / Climate / Biotech / Quantum / Space / Health / Geopolitics / Economics / Finance / Transport / Food）
- 每个散点颜色 = domain color（复用 domainMap）
- 每个散点大小 = score（30 分小点 → 100 分大点）
- 每个散点形状 = status（圆形=monitoring, 三角=early_signal, 菱形=trending, 方形=accelerating, 星形=triggered）
- 散点 hover → tooltip 显示 `FP-xx · Title · Score: xx · Status: xxx · Verdict: 202x`
- 散点 click → 跳 FP-xx 详情页

### US-02.2 缩放进入 Z1（域视图）

**作为** 对某个域感兴趣的用户  
**我想** 只看 Climate 域的所有预测  
**以便** 不被其他域的噪音干扰

**验收**：
- 在 Z0 视图双击某个 domain 泳道 → 放大到该域全屏
- 或：顶部 domain 过滤器点击 Climate → 只显示该域
- 缩放后散点重新排布（横向占满，纵向按时间）
- 显示该域的统计摘要：X predictions · Y triggered · Z trending · Avg score: N

### US-02.3 缩放进入 Z2（脉络视图）

**作为** 想看因果关系的用户  
**我想** 看到 FP-47 → FP-11 → FP-17 之间的连线  
**以便** 理解"脉络感"

**验收**：
- 在 Z1 视图点击某个散点 → 显示该点的所有因果连线
- 连线 = causalChains 数据（21 条链）
- 连线颜色 = 源域 → 目标域渐变
- 连线粗细 = 关联强度（causalChain.evidenceStrength）
- 点击连线 → 跳链详情页（/chains.html#chain-xx）

### US-02.4 跳 Z3（预测详情）

**作为** 想看具体信息的用户  
**我想** 点击任意散点看详情  
**以便** 了解这条预测的完整信息

**验收**：
- 散点 click → `history.pushState(null, '', '#FP-xx'); handleRoute();`
- 复用现有详情页（FP-xx）
- 详情页顶部增加 "← Back to Timeline" 按钮（新）

### US-02.5 下钻 Z4（原始数据）

**作为** 分析师 / 数据爱好者  
**我想** 看 updateHistory 数组 + backtest 原始数据  
**以便** 自己验证评分逻辑

**验收**：
- 详情页底部 "View raw data" 折叠面板
- 展开显示 updateHistory 数组（JSON 格式 + 表格格式）
- 提供 "Download JSON" 按钮

---

## 3. 信息架构

### 3.1 路由

```
/timeline.html                → Z0 全局视图（默认入口）
/timeline.html#climate        → Z1 Climate 域视图
/timeline.html#technology     → Z1 Technology 域视图
/timeline.html#FP-47          → Z3 预测详情
/timeline.html#chain-climate  → Z2 链详情（已有 /chains.html 复用）
```

### 3.2 导航入口

- 首页 Hero 区增加按钮：`Explore the Timeline →` 跳 /timeline.html
- 首页底部 Causal Chains 区增加链接：`See full timeline →`
- 详情页 Back 按钮：`← Back to Predictions` / `← Back to Timeline`（取决于来源）

### 3.3 与现有页面的关系

```
Homepage (/index.html)
├── Hero
├── Predictions section (80 cards) → 点击卡片 → Z3 详情
├── Causal Chains section (3 chains) → 点击链 → 链详情
├── Backtest section
├── Place Your Bet section
└── [NEW] "Explore Timeline" CTA → /timeline.html

Timeline (/timeline.html) [NEW]
├── Z0: 80 散点 + 时间轴 + domain 泳道
├── Z1: 单域放大（点击 domain 泳道）
├── Z2: 因果连线（点击散点显示连线）
├── Z3: 预测详情（点击散点跳）
└── Z4: 原始数据（详情页底部折叠面板）

Detail (existing FP-xx section in index.html)
├── [MODIFY] Add "← Back to Timeline" variant
└── [NEW] Z4: "View raw data" collapse panel
```

---

## 4. 技术设计

### 4.1 渲染技术选型

| 选项 | 优点 | 缺点 | 选择 |
|---|---|---|---|
| D3.js + SVG | 灵活、可交互、Anna mockup 已用 D3 | 80 点 + 21 链 + 动画 → 性能边界 | ✅ 选用 |
| Canvas | 性能最好 | 交互复杂度高时难维护 | ❌ |
| Three.js | 3D 酷炫 | 学习成本 + 移动端兼容 | ❌ |
| 纯 CSS + HTML | 简单 | 做不出缩放/连线效果 | ❌ |

**决策**：D3.js v7 + SVG，与 Anna mockup 技术栈对齐 🔘

### 4.2 数据结构

```typescript
interface TimelineNode {
  id: string;                    // "FP-47"
  title: string;                 // "Arctic Ice-Free Summer"
  domain: string;                // "climate"
  domainLabel: string;           // "Climate & Weather"
  domainColor: string;           // "#3B82F6"
  score: number;                 // 89.5
  status: SignalStatus;          // "triggered"
  verdictDate: string;           // "2030-09-01"
  x: number;                     // 时间轴位置（verdictDate 转像素）
  y: number;                     // domain 泳道位置
  radius: number;                // 按 score 计算
}

interface TimelineLink {
  source: string;                // "FP-47"
  target: string;                // "FP-11"
  chainId: string;               // "chain-climate-demo"
  strength: "HIGH" | "MEDIUM" | "LOW";
  color: string;                 // 渐变 ID
}

interface TimelineState {
  zoomLevel: 0 | 1 | 2 | 3 | 4;
  activeDomain: string | null;   // Z1 时非 null
  selectedNode: string | null;   // Z2 时显示连线
  timeRange: [Date, Date];       // 当前可见时间范围
}
```

### 4.3 核心交互流程

```
用户进入 /timeline.html
  └─ 渲染 Z0（80 散点 + 时间轴 + 8 泳道）
      └─ 用户 hover 散点
          └─ 显示 tooltip
      └─ 用户 click 散点
          └─ 跳 FP-xx 详情（Z3）
      └─ 用户 dblclick domain 泳道
          └─ 过渡动画 → Z1（该域全屏）
              └─ 用户 click 散点
                  └─ 显示该点因果连线（Z2 叠加）
                      └─ 用户 click 连线
                          └─ 跳链详情
              └─ 用户 click "← Back to Global View"
                  └─ 过渡动画 → Z0
```

### 4.4 性能预算

| 指标 | 目标 |
|---|---|
| 首屏渲染（Z0 80 散点） | < 800ms |
| 缩放过渡动画 | < 300ms |
| hover tooltip 延迟 | < 50ms |
| 内存占用 | < 50MB |
| 移动端 pinch 缩放 | 60fps |

### 4.5 移动端适配

- 桌面：鼠标滚轮缩放 + 双击进入 Z1
- 移动：pinch 缩放 + 长按进入 Z1 + swipe 横向滚动时间轴
- 移动端 tooltip 改为 tap 显示（非 hover）

---

## 5. 视觉规范

### 5.1 颜色系统（12 域，与 Anna v2 mockup 对齐）

```javascript
const DOMAIN_COLORS = {
  // 主 8 域（predictions.json + backtest_timeline.json 都覆盖）
  AI:            "#3B82F6",  // Blue
  Energy:        "#10B981",  // Green
  Demographics:  "#8B5CF6",  // Purple
  Climate:       "#06B6D4",  // Cyan
  Biotech:       "#EF4444",  // Red
  Quantum:       "#A78BFA",  // Violet
  Space:         "#6366F1",  // Indigo
  Health:        "#14B8A6",  // Teal
  // Backtest-only 4 域（仅历史回测数据有）
  Geopolitics:   "#F59E0B",  // Amber
  Economics:     "#84CC16",  // Lime
  Finance:       "#E879F9",  // Fuchsia（避免与 Geopolitics 琥珀色撞）
  Transport:     "#0EA5E9",  // Sky
  Food:          "#A3E635",  // Lime-300（与 Economics Lime 区分）
};
```

**12 域 vs 8 域统一**：
- predictions.json 的 80 条预测映射到这 12 域（可能需要部分 domainLabel 调整）
- backtest_timeline.json 的 35 条回测覆盖全部 12 域
- 主 8 域在上半区，backtest-only 4 域在下半区，中间用虚线分隔（Anna mockup line 360-364）

### 5.2 Status 视觉编码（光晕 + 边框，不用形状）

**决策**：用**光晕强度 + 边框粗细 + 外环**编码 status，不增加形状维度 🔘 12 域 × 5 status 用形状会视觉爆炸 🔘

| Status | 光晕 (glow) | 边框 | 外环 | 视觉效果 |
|---|---|---|---|---|
| `monitoring` | 无 | 1px | 无 | 最暗最小，融入背景 |
| `early_signal` | 弱 (4px blur, 0.3 opacity) | 1.5px | 无 | 微微发光 |
| `trending` | 中 (6px blur, 0.5 opacity) | 2px | 无 | 明显发光 |
| `accelerating` | 强 (8px blur, 0.7 opacity) | 2.5px | 1 层 (r+4) | 强烈发光 + 外环 |
| `triggered` | 极强 (12px blur, 0.9 opacity) | 3px | 2 层 (r+4, r+8) | 最亮 + 双外环 + 脉冲动画 |

**尺寸编码**（保留 mockup 现有）：
- 节点半径 = 基础 4px + score × 0.08（30 分 ≈ 6.4px，100 分 ≈ 12px）
- 颜色 = 域颜色（12 域之一）

**交互动画**：
- `triggered` 节点脉冲动画（scale 1.0 ↔ 1.15，周期 2s）
- hover 时放大 1.2 倍 + tooltip
- 光晕用 SVG `<filter>`（`<feGaussianBlur>` + `<feMerge>`）

### 5.2.1 泳道背景（Anna v2 视觉方案）

**替代原域颜色底纹**，改为更克制的方案：
- **斑马纹交替**：偶数行 `rgba(255,255,255,0.012)`，奇数行透明
- **左侧 3px 色条**：每条泳道左侧一个域颜色的竖条（opacity 0.5）
- **分割线淡化**：泳道间 `rgba(255,255,255,0.03)` 1px 线
- **主/backtest-only 域分隔**：虚线 `rgba(255,255,255,0.08)` 1px

**视觉叙事**：
- 节点是视觉主角，底纹只做最弱的分层指引
- 左侧色条保留域识别，但不像整行底纹那样抢戏

### 5.3 背景与网格

- 背景：`#0F172A`（暗色主题，复用现有 detail view）
- 时间轴网格：每月一条细线（`#1E293B`），每年一条粗线（`#334155`）
- domain 泳道分隔：虚线（`#1E293B`）
- 当前时间指示线：琥珀色竖线（`#F59E0B`）+"NOW" 标签（中性时间标记，不用红色避免被误读为错误/危险）

### 5.4 动画

- 进入 Z1：散点从 80 → 该域 N 个，其他淡出（300ms）
- 显示因果连线：贝塞尔曲线从 0 长度画到完整（400ms）
- hover tooltip：100ms 淡入
- 时间轴滚动：惯性滚动（移动端）+ easing（桌面）
- triggered 节点脉冲：scale 1.0 ↔ 1.15，周期 2s

### 5.5 完整交互逻辑（Vincent 12:55 补充）

基于 Anna v2 mockup + Vincent 反馈，需要实现的完整交互：

#### 5.5.1 Domain 过滤（单选 + 全选）

**图例位置**：顶部浮动 legend bar（12 个域按钮 + 1 个 "All" 按钮）

**交互状态机**：
```
初始状态：All 选中，12 域全选
  ↓
点击任一域按钮（如 "Climate"）
  ↓
进入"单选模式"：其他 11 域淡出（opacity 0.15），Climate 保持
All 按钮变为"未选中"视觉
  ↓
再次点击同一域 → 回到全选模式
  ↓
或者：点击其他域（如 "AI"）→ 切换到 AI 单选
  ↓
或者：点击 "All" 按钮 → 回到全选模式
```

**联动效果**：
- 域过滤同时作用于：
  - 预测节点（predictions.json）
  - 回测节点（backtest_timeline.json）
  - 因果连线（causalChains）
- 顶部统计卡数字实时更新（"34 ✓ · Brier 0.096" 动态变）
- URL hash 同步：`#climate` / `#ai` / `#all`（可分享）

#### 5.5.2 节点点击事件

**预测节点（FP-xx）点击**：
- 跳转到对应预测详情页：`history.pushState(null, '', '#FP-xx'); handleRoute();`
- 复用现有 `index.html` 详情页渲染逻辑
- 详情页顶部 Back 按钮显示 "← Back to Timeline"（如果来源是 timeline）

**回测节点（BT-xx）点击**：
- 显示回测详情 tooltip（不跳转）：
  - Title
  - Predicted: YYYY-MM-DD
  - Resolved: YYYY-MM-DD
  - Outcome: ✓ correct / ✗ incorrect
  - Brier: 0.007
  - Engine score: 84.9
  - Verification method: "UN official statistics"
- tooltip 尺寸较大，定位在节点右侧（避免遮挡）

**因果连线点击**：
- 跳转到链详情页：`/chains.html#chain-xx`
- 复用现有链详情页渲染

#### 5.5.3 缩放控制

**桌面端**：
- 鼠标滚轮：横向缩放时间轴（放大/缩小时间范围）
- Ctrl + 滚轮：纵向缩放（放大/缩小域间距）
- 双击域泳道：进入该域 Z1 全屏视图（过渡动画 300ms）
- Esc 键：退出 Z1 → 回到 Z0

**移动端**：
- 横向 swipe：滚动时间轴
- Pinch：缩放时间范围
- 长按域泳道：进入 Z1（无 hover，长按替代）
- 左上角 "← Global View" 按钮：退出 Z1

**缩放动画**：
- 所有缩放过渡 300ms，easing: `d3.easeCubicOut`
- 缩放时保持被点击域/点在屏幕中央（zoomTo 目标坐标）

#### 5.5.4 Hover 效果

**预测节点**：
- 放大 1.2 倍
- 光晕强度临时 +50%
- Tooltip 显示：`FP-xx · Title · Score: xx · Status: xxx · Verdict: YYYY-MM-DD`

**回测节点**：
- 放大 1.2 倍
- Tooltip 显示回测详情（见 5.5.2）

**因果连线**：
- 线条加粗 2 倍
- 高亮源域和目标域节点（其他节点淡出）

**域泳道**：
- 左侧 3px 色条亮度提升到 opacity 0.8
- 整行背景微弱提亮

#### 5.5.5 回测区（NOW 线左侧）

**浮动统计卡**：
- 固定在回测区左上角
- 显示：
  ```
  VERIFIED TRACK RECORD
  ─────────────────────
  ✓ 34 correct  ✗ 1 incorrect
  Brier Score: 0.096
  Hit Rate: 97.1%
  Period: 2024-01 → 2025-06
  ```
- 点击卡片 → 跳 `/backtest.html`（现有 Backtest 页）

**NOW 线**：
- 琥珀色竖线 `#F59E0B`，2px，从顶到底（中性时间标记，不用红色避免被误读为错误/危险）
- 顶部标签 "NOW" + 当前日期
- 两侧标注：`◀ VERIFIED | PREDICTIONS ▶`

#### 5.5.6 Back 导航多来源

详情页 Back 按钮根据来源切换文案和行为：

| 来源 | Back 文案 | Back 行为 |
|---|---|---|
| 首页 Predictions 区 | "← Back to Predictions" | `history.pushState(null, '', '#predictions'); handleRoute();` |
| 时间线 Z0 | "← Back to Timeline" | `history.pushState(null, '', '#timeline'); handleRoute();` |
| 时间线 Z1（域视图）| "← Back to Climate Timeline" | `history.pushState(null, '', '#timeline#climate'); handleRoute();` |
| 因果链页 | "← Back to Causal Chains" | `history.pushState(null, '', '#chains'); handleRoute();` |

**来源检测**：
- 通过 `document.referrer` 或 `sessionStorage` 记录上一个 URL
- 实现：在 `handleRoute()` 入口处把 `location.hash` 存入 `sessionStorage.setItem('lastRoute', hash)`

#### 5.5.7 键盘导航（无障碍）

- `←` / `→`：时间轴左右平移
- `+` / `-`：时间轴缩放
- `1` - `9`, `0`, `-`, `=`：快速切换到对应域（按 laneOrder 索引）
- `A`：全选（All 模式）
- `Esc`：退出 Z1 → Z0 / 关闭 tooltip
- `Tab`：焦点循环（节点 → 节点 → 统计卡）
- `Enter` / `Space`：触发当前焦点节点的点击事件

#### 5.5.8 移动端折叠（响应式补充）

移动端 viewport < 768px 时：
- 默认只显示预测区（NOW 线右侧）
- 回测区折叠，顶部显示按钮 "📊 View Verified Track Record"
- 点击按钮 → 平滑滚动到回测区
- 统计卡跟随滚动，始终可见

---

## 6. 实施拆分

### Sprint 3.1 — Z0 最小验证版（本周）

**目标**：能看 80 散点 + 时间轴 + hover + click 跳详情

**任务**：
- [ ] T-01：创建 `/timeline.html` 骨架（D3.js 引入 + 容器）
- [ ] T-02：动态加载数据源（predictions.json 80 条 + backtest_timeline.json 35 条 + causalChains）
- [ ] T-03：渲染时间轴（2024-01 → 2031-12）+ 月份/年份网格 + NOW 线（琥珀色竖线 #F59E0B）
- [ ] T-04：渲染 12 个 domain 泳道（斑马纹 + 左侧 3px 色条 + 主/backtest-only 虚线分隔）
- [ ] T-05：渲染散点（颜色=域，大小=score，光晕=status，按 5.2 表）
- [ ] T-06：NOW 线两侧分区（`◀ VERIFIED | PREDICTIONS ▶`）+ 回测统计卡
- [ ] T-07：顶部 domain 图例 + 单选/全选逻辑（5.5.1）
- [ ] T-08：节点 hover tooltip（5.5.4）
- [ ] T-09：节点 click 事件（FP-xx 跳详情，BT-xx 显示回测 tooltip）（5.5.2）
- [ ] T-10：缩放控制（鼠标滚轮 / 双击泳道 / 移动端 pinch / 长按）（5.5.3）
- [ ] T-11：Back 导航多来源（5.5.6）+ sessionStorage 来源检测
- [ ] T-12：键盘导航（5.5.7）+ 无障碍 ARIA
- [ ] T-13：响应式（mobile / tablet / desktop 三档 + 回测区折叠 5.5.8）

**交付**：
- `/Coze/Drive/cathealthsignal/worldcascade/timeline.html`
- `/Coze/Drive/cathealthsignal/worldcascade/public/js/timeline.js`（D3 逻辑）
- `/Coze/Drive/cathealthsignal/worldcascade/public/css/timeline.css`

**验收**：
- 打开 /timeline.html 看到 80 散点
- hover 显示 tooltip
- click 跳详情页
- mobile 下可横向滚动

### Sprint 3.2 — Z1 + Z2 叠加（下周）

**目标**：双击 domain 泳道进入 Z1，点击散点显示因果连线（Z2）

**任务**：
- [ ] T-10：dblclick domain 泳道 → 过渡动画 → Z1
- [ ] T-11：Z1 视图散点重排布（横向占满，纵向按时间）
- [ ] T-12：Z1 顶部显示域统计摘要
- [ ] T-13：Z1 点击散点 → 显示因果连线（从 causalChains 数据读）
- [ ] T-14：连线贝塞尔曲线（源域 → 目标域颜色渐变）
- [ ] T-15：click 连线 → 跳链详情

**交付**：
- timeline.js 扩展 Z1 / Z2 渲染逻辑
- 新增 `/public/js/timeline-links.js`（连线渲染模块）

### Sprint 3.3 — Z4 原始数据 + Z3 增强（下下周）

**目标**：详情页底部增加 "View raw data" 折叠面板 + "← Back to Timeline" 按钮

**任务**：
- [ ] T-16：index.html 详情页底部增加 Z4 折叠面板（updateHistory 渲染）
- [ ] T-17：详情页 Back 按钮支持 "← Back to Timeline" 变体（根据来源判断）
- [ ] T-18：Z4 提供 "Download JSON" 按钮
- [ ] T-19：Z4 表格视图（非 JSON 原文，转可读表格）

### Sprint 3.4 — 性能优化 + 边缘情况（下下下周）

**目标**：性能达标 + 边缘情况处理

**任务**：
- [ ] T-20：性能 profiling（Lighthouse + Chrome DevTools）
- [ ] T-21：80 点 + 21 链渲染性能优化（SVG 虚拟化）
- [ ] T-22：移动端 pinch 缩放 + swipe 滚动
- [ ] T-23：边缘情况（数据源缺失、NaN 分数、未来预测时间 > 10 年）
- [ ] T-24：无障碍（keyboard navigation + ARIA labels）

---

## 7. 与 Anna 设计的对接

### 7.1 Anna 已交付

- ✅ `timeline-design-rationale.md`：设计思路 + Z0-Z4 视觉转换方案
- ⏳ `timeline-design-mockup.html`：D3.js 静态 mockup（20 节点 + 8 因果连线）

### 7.2 对接计划

1. **等 Anna mockup 完成** → 产品扣子 review
2. **review 通过** → 提取设计 token（颜色、形状、尺寸、动效参数）
3. **实现时复用 mockup 的 D3 代码**（不重写，直接 copy + 改造）
4. **mockup 是 Z2 形态** → 我们 Z0 实现后再叠加 Z2 时对齐视觉

### 7.3 差异点（需与 Anna 沟通）

| 项 | mockup 现状 | 实现需要 |
|---|---|---|
| 节点数量 | 20 个（代表性） | 80 个（全量） |
| 数据源 | 静态硬编码 | 从 predictions.json 动态加载 |
| 交互 | hover only | hover + click + dblclick + pinch |
| 缩放 | 单层级 | 5 级语义缩放 |
| 响应式 | 未考虑 | mobile / tablet / desktop |
| 路由 | 独立 HTML | 与 index.html 共享 handleRoute |

---

## 8. 成功指标

| 指标 | 目标 | 测量 |
|---|---|---|
| /timeline.html PV | 上线 2 周后占全站 PV 20%+ | GA4 |
| 平均停留时长 | > 60s（说明用户在探索） | GA4 |
| 缩放交互使用率 | 30%+ 访问触发过缩放 | GA4 event |
| 散点 click → 详情转化率 | 50%+ 访问至少 click 1 次 | GA4 event |
| Core Web Vitals | LCP < 2.5s, INP < 200ms | Lighthouse |

---

## 9. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 80 散点 + 21 连线 SVG 渲染慢 | LCP 超标 | 分批渲染（先 Z0，延迟加载连线）；必要时用 Canvas 替代 |
| Anna mockup 与实现差距大 | 返工 | review 阶段尽早发现；mockup 是 Z2，Z0 实现可独立推进 |
| 5 级缩放实现复杂度超预期 | Sprint 3 无法交付全部 | Z0 最小验证版先行，Z1-Z4 分阶段迭代 |
| 移动端 pinch 缩放体验差 | 用户流失 | 优先保证桌面体验；移动端降级为"点击 zoom in"按钮 |
| 时间轴跨度太大（2024-2031） | 散点太密或太稀 | 默认显示 2024-2031 全量（含回测历史 + 预测未来，NOW 线自然分割）；提供范围选择器允许用户聚焦特定时期 |

---

## 10. 决策记录

| 决策 | 选项 | 选择 | 理由 |
|---|---|---|---|
| 渲染技术 | D3 / Canvas / Three.js / CSS | **D3 + SVG** | 与 Anna mockup 对齐，交互灵活 |
| 默认时间范围 | 全量 / 近期聚焦 | **2024-2031 全量** | 包含回测历史（2024-2025）+ 预测未来（至 2031），NOW 线自然分割 |
| Domain 数量 | 8 / 12 | **12** | backtest_timeline.json 引入 4 个新域（Geopolitics/Economics/Finance/Transport/Food），保留完整性 |
| Z0 最小验证范围 | 5 级全做 / 仅 Z0 | **仅 Z0 + 基础交互** | 验证核心价值，避免过度工程 |
| 实现节奏 | 一次交付 / 分阶段 | **4 个 Sprint 分阶段** | 每周都有可演示产物 |
| 与 Anna 设计的关系 | 重写 / 复用 | **复用 + 扩展** | 减少返工，保持视觉一致性 |
| Status 视觉编码 | 形状 / 光晕 + 边框 + 外环 | **光晕 + 边框 + 外环**（v1.1.0） | 12 域 × 5 status 用形状会视觉爆炸；光晕渐进更优雅 |
| 泳道底纹 | 域颜色底纹 / 斑马纹 + 左侧色条 | **斑马纹 + 3px 色条**（v1.1.0） | Anna v2 mockup 方案，节点作为视觉主角 |
| 交互完整度 | 基础 / 完整（含单选全选/键盘/来源切换） | **完整**（v1.1.0） | Vincent 12:55 明确要求；专业产品应有的体验 |

---

## 11. 依赖项

| 依赖 | 状态 | 提供方 |
|---|---|---|
| `timeline-design-mockup.html` | ✅ 已交付（v2 + 回测区） | Anna |
| `predictions.json` 含 `updateHistory` 字段 | ✅ 已就绪 | Anna |
| `causalChains` 数据（21 条链） | ✅ 已就绪 | Anna |
| `domainMap` 颜色配置 | ✅ 已就绪 | 已有 |
| Vercel 部署 + GA4 | ⏳ Vincent 处理 | Vincent |

---

## 12. 下一步

1. **等 Anna mockup 完成** → 产品扣子 review
2. **review 通过** → 启动 Sprint 3.1（Z0 最小验证版）
3. **本周内**：完成 T-01 ~ T-09，交付可演示的 /timeline.html
4. **下周**：启动 Sprint 3.2（Z1 + Z2 叠加）

---

**Vincent 审批点**：
- [ ] Z0 最小验证版的定义（80 散点 + 时间轴 + 基础交互）
- [ ] 4 个 Sprint 的分阶段节奏
- [ ] D3 + SVG 技术选型
- [ ] 默认时间范围 2024-2031 全量（含回测历史 + 预测未来，NOW 线自然分割）
