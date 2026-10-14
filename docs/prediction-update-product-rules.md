# Prediction Update Mechanism — Product Rules

**Version**: 1.0.0  
**Owner**: 产品扣子  
**Status**: Draft → Awaiting Vincent approval  
**Date**: 2026-10-14

---

## 1. 核心理念

> 预测不是发布就结束的一次性内容，而是持续演进的叙事 🔘

用户打开任意预测详情页 🔘 应该能回答 3 个问题：
1. **现在怎么样？**（当前 status + score + leading signal 状态）
2. **最近变了什么？**（上次更新 vs 上上次，趋势方向）
3. **下次什么时候更新？**（明确的更新时间承诺）

这 3 个问题构成了用户对平台的**信任循环** 🔘

---

## 2. 更新节奏（Update Cadence）

### 2.1 默认节奏

| 预测类型 | 更新频率 | 更新时间（UTC） | 理由 |
|---|---|---|---|
| **Climate / Energy / Demographics** | 每周 | 周二 02:00 UTC | 数据源多为月度/季度发布，周级已足够捕捉变化 |
| **Technology / AI / Quantum** | 每周 | 周二 02:00 UTC | 技术突破偶发，但 benchmark 更新节奏稳定 |
| **Geopolitics / Policy** | 每周 | 周二 02:00 UTC | 事件驱动，但 weekly check 能捕捉舆论拐点 |
| **Economic / Market** | 每周 | 周二 02:00 UTC | 与市场周报对齐 |

**统一时间点的理由**：
- 用户形成固定预期（"每周二早上看一眼 WorldCascade"）
- 数据工程简化（单一 cron job）
- 回测一致性（所有预测在同一时点快照）

### 2.2 特殊情况

| 情况 | 处理 |
|---|---|
| 领先指标数据源断更（>2 周无新数据） | 详情页显示 "Data source paused — last verified: [date]" 🔘 不触发状态变化 |
| 状态发生迁移（如 monitoring → early_signal） | 正常周更 + 触发 "Signal Update" 邮件/推送（如有订阅） |
| 接近验证时点（verificationDate 前 30 天） | 维持周更节奏；如数据源有新数据（检测到 `leadingSignal.currentValue` 变化）则触发即时刷新并更新 `nextScheduledUpdate`；否则维持周更 🔘 不机械转日更（数据源多为月度/季度发布，日更只会重复相同数值） |
| 验证日当天 | 触发 Verdict Flow：confirmed / refuted / inconclusive 🔘 进入 Backtest Archive |

---

## 3. 用户感知层（User-Facing Signals）

### 3.1 详情页必显字段

每条预测详情页（FP-xx）顶部信息栏增加：

```
┌─────────────────────────────────────────┐
│ FP-47 · Arctic Ice-Free Summer          │
│                                         │
│ Status: 🟢 Accelerating   Score: 89.5   │
│ ▲ +12.3 vs last week                    │
│                                         │
│ Last updated: Tue, Oct 14 02:00 UTC     │
│ Next update:  Tue, Oct 21 02:00 UTC     │
│                                         │
│ [View change log →]                     │
└─────────────────────────────────────────┘
```

**字段说明**：
- **Status badge**：颜色编码（见 3.2）
- **Score + delta**：当前分数 + 相对上次更新的变化（绿色正、红色负、灰色零）
- **Last updated**：上次数据抓取 + 评分重算时间
- **Next update**：下次计划更新（基于 2.1 节奏）
- **View change log**：链接到 4. 更新日志页

### 3.2 Status Badge 颜色规范

| Status | 颜色 | 含义 |
|---|---|---|
| `monitoring` | 灰色 #9CA3AF | 在观测范围内，无明显信号 |
| `early_signal` | 淡黄 #FCD34D | 初步迹象出现 |
| `trending` | 橙色 #FB923C | 趋势明确，持续演进 |
| `accelerating` | 绿色 #10B981 | 加速向阈值靠近 |
| `triggered` | 深绿 #059669 | 已突破阈值 / 事件已发生 |

### 3.3 Score Sparkline（迷你趋势线）

在 Score 数字旁边显示过去 8 周（或自发布起）的分数走势：

```
Score: 89.5  ▁▂▃▄▅▆▇█
```

- 用 SVG sparkline 实现（无第三方依赖）
- 宽度 60px，高度 16px
- 颜色跟随 delta（上升绿、下降红、平稳灰）

### 3.4 首页卡片增强

首页每张预测卡片底部新增一行：

```
FP-47 · Arctic Ice-Free Summer     🟢 89.5 ▲   Next: Oct 21
```

- Status dot（小圆点，颜色同 3.2）
- Score + delta 方向箭头
- Next update 日期（MM-DD 短格式，hover 显示完整）

---

## 4. 更新日志页（Change Log / Signal Evolution）

### 4.1 页面定位

`/changelog.html` — 平台的"时间脉络"

用户在这里看到：**所有预测的演进轨迹**，而不是孤立地看单条 🔘

### 4.2 页面结构

```
┌────────────────────────────────────────────────────────┐
│ Signal Evolution                                        │
│                                                         │
│ [Filter: All Domains ▾]  [Filter: All Status ▾]        │
│                                                         │
│ ── Week of Oct 14, 2026 ─────────────────────────────── │
│                                                         │
│ 🟢 FP-47 Arctic Ice-Free Summer                        │
│    early_signal → triggered    39.5 → 100 (+60.5)       │
│    Trigger: Sept Arctic ice extent hit record low       │
│                                                         │
│ 🟡 FP-11 Japan TFR < 1.1                                │
│    early_signal → triggered    66.5 → 93.3 (+26.8)      │
│    Trigger: 2025 provisional TFR released at 1.08       │
│                                                         │
│ ── Week of Oct 7, 2026 ──────────────────────────────── │
│ ...                                                      │
└────────────────────────────────────────────────────────┘
```

### 4.3 日志条目字段

每条更新记录包含：
- **prediction_id**：FP-xx
- **title**：预测标题
- **date**：更新时间（UTC ISO8601）
- **old_status / new_status**：状态迁移
- **old_score / new_score**：分数变化
- **delta**：分数差值
- **trigger**：触发变化的事件（一句话，英文，由数据侧提供或人工补充）

### 4.4 过滤与排序

- **Domain 过滤**：AI / Energy / Demographics / Climate / Biotech / Quantum / Space / Geopolitics / Economics / Finance / Transport / Food（12 域，与 WO-02 对齐；predictions.json 无 Society 域）
- **Status 过滤**：monitoring / early_signal / trending / accelerating / triggered / verdict
- **排序**：默认按更新时间倒序（最新在上）；可切按 delta 绝对值（最大变化优先）

---

## 5. 数据契约（Data Contract）

### 5.1 predictions.json 新增字段

每条预测新增：

```json
{
  "id": "FP-47",
  "lastUpdated": "2026-10-14T02:00:00Z",
  "nextScheduledUpdate": "2026-10-21T02:00:00Z",
  "updateHistory": [
    {
      "date": "2026-10-14T02:00:00Z",
      "oldStatus": "early_signal",
      "newStatus": "triggered",
      "oldScore": 39.5,
      "newScore": 100.0,
      "oldValue": 4.12,
      "newValue": 5.87,
      "trigger": "Sept Arctic ice extent hit record low"
    },
    {
      "date": "2026-10-07T02:00:00Z",
      "oldStatus": "trending",
      "newStatus": "early_signal",
      "oldScore": 30.2,
      "newScore": 39.5,
      "oldValue": 3.89,
      "newValue": 4.12,
      "trigger": "Weekly ice extent data released"
    }
  ],
  "leadingSignal": {
    "indicator": "Arctic September sea ice extent",
    "status": "triggered",
    "source": "NSIDC",
    "currentValue": 5.87,
    "thresholdValue": 5.0,
    "changePct": -4.2,
    "durationMonths": 18,
    "reachedThreshold": true,
    "notes": "Record low reached Sept 2026"
  }
}
```

### 5.2 changelog.json 独立文件

新增 `/public/data/changelog.json`：

```json
{
  "updates": [
    {
      "predictionId": "FP-47",
      "date": "2026-10-14T02:00:00Z",
      "oldStatus": "early_signal",
      "newStatus": "triggered",
      "oldScore": 39.5,
      "newScore": 100.0,
      "trigger": "Sept Arctic ice extent hit record low"
    }
  ],
  "lastGenerated": "2026-10-14T02:05:00Z"
}
```

前端读 changelog.json 渲染更新日志页 🔘 数据由 `update_leading_signals.py` 每次运行时自动 append 🔘

### 5.3 `trigger` 字段生成规则

`updateHistory[].trigger` 和 `changelog.json.updates[].trigger` 是**一句话英文**（如 "Sept Arctic ice extent hit record low"），描述触发本次状态/分数变化的事件 🔘

**生成策略：三级 fallback**

**Level 1（Phase 1 实施）— 模板规则自动生成**：
- 状态迁移（threshold 突破）：`"{Indicator} crossed threshold ({currentValue} vs {thresholdValue})"`
- 状态迁移（加速度变化）：`"{Indicator} acceleration: {oldStatus} → {newStatus}"`
- 显著分数变化（|Δ| > 5，无状态迁移）：`"{Indicator} moved {direction} by {pct}% ({oldValue} → {currentValue})"`
- 其他：`"Periodic data update: {source}"`

**Level 2（Phase 2 可选）— LLM 摘要润色**：
- 把 Level 1 的模板句子丢给 LLM → 生成更自然的表述
- 例："Arctic September sea ice extent crossed threshold (5.87M km² vs 5.0M km²)" → "Sept Arctic ice extent hit record low"
- 需要配置 LLM key；如未配置跳过此层

**Level 3（兜底）**：
- 空字符串 `""`
- 前端显示："— no trigger noted —"

**决策**：Phase 1 仅用 Level 1 模板 🔘 不做 LLM（成本 + 延迟考虑）🔘 Phase 2 再加润色 🔘

---

## 6. 边缘情况处理

| 场景 | 处理 |
|---|---|
| 首次发布，无历史更新 | `updateHistory: []` 🔘 详情页显示 "Initial assessment — tracking begins" |
| 数据源连续 2 周无新数据 | `lastUpdated` 停在最后成功时点 🔘 详情页显示 "Data source paused" 提示 🔘 不触发状态变化 |
| 预测被验证（到达 verificationDate） | 进入 Verdict Flow 🔘 status 变为 `confirmed` / `refuted` / `inconclusive` 🔘 停止周更 🔘 移入 Backtest Archive |
| 预测被撤回（极罕见） | status 变为 `withdrawn` 🔘 详情页显示撤回说明 🔘 不计入统计 |
| 评分计算异常（如 NaN） | 保留上次有效 score 🔘 详情页显示 "Score recalculating" 🔘 触发告警 |

---

## 7. 实施路线图

### Phase 1 — 数据层（Anna，本周）✅
- [x] update_leading_signals.py
- [x] 5 态状态机 + v4.0.0 评分联动
- [x] predictions.json 新增 lastUpdated / nextScheduledUpdate / updateHistory
- [x] 8 预测 × 4 周 demo 跑通

### Phase 2 — 用户感知层（产品扣子，下周）
- [ ] 详情页 Status badge + Score + delta + Next update 文案
- [ ] Score sparkline SVG 组件
- [ ] 首页卡片增强（status dot + score delta + next date）
- [ ] changelog.json 数据契约落地

### Phase 3 — 更新日志页（产品扣子，下周）
- [ ] /changelog.html 页面
- [ ] Domain / Status 过滤
- [ ] 按周分组显示
- [ ] 从 changelog.json 动态渲染

### Phase 4 — 自动化调度（Anna，下下周）
- [ ] Cron job：每周二 02:00 UTC 跑 update_leading_signals.py
- [ ] 输出 changelog.json 增量
- [ ] Git commit + push → Vercel 自动部署

### Phase 5 — 用户触达（产品扣子，下下周）
- [ ] 邮件订阅入口（"Get weekly signal updates"）
- [ ] 状态迁移触发邮件（如 FP-47 进入 triggered 时通知订阅者）
- [ ] RSS feed（/feed.xml）

---

## 8. 成功指标

| 指标 | 目标 | 测量 |
|---|---|---|
| 用户回访率 | 周活用户中 30%+ 在更新日（周二）访问 | GA4 用户行为分析 |
| 详情页停留时长 | 平均 > 45s（说明用户在看更新历史） | GA4 页面分析 |
| changelog 页访问量 | 上线 2 周后占全站 PV 10%+ | GA4 |
| 邮件订阅转化 | 上线 4 周后 100+ 订阅 | 邮件服务商统计 |
| 数据更新成功率 | 每周 80/80 预测更新成功率 > 95% | Cron job 日志 |

---

## 9. 与 5 级语义缩放的关系

本规则是 WO-02（5 级语义缩放时间线）的**前置依赖**：

- **Z0（全局视图）**：changelog 页按周分组的条目 = Z0 的最小形态
- **Z1（域视图）**：未来 changelog 加 "按 domain 分组" 视图
- **Z2（脉络视图）**：时间线 mockup（Anna 正在设计）= Z2 形态，把 changelog 可视化
- **Z3（预测详情）**：FP-xx 详情页 = Z3 形态，单条预测的完整演进
- **Z4（原始数据）**：updateHistory 数组 = Z4 形态，原始数据可下载

**产品节奏**：先把 Phase 2-3（用户感知层 + changelog 页）做完，就是 Z0+Z3 🔘 然后 Anna 的 timeline mockup 实现后，补齐 Z2 🔘 Z1 和 Z4 后续迭代 🔘

---

## 10. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 数据源 API 限制 / 收费 | 无法每周抓取 80 个指标 | Phase 1 先跑通 10 个核心指标，逐步扩展；备选：人工月度录入 |
| 用户觉得"每周更新"太慢 | 回访率低 | 状态迁移触发即时推送；verificationDate 前 30 天转日更 |
| 评分频繁大幅波动 | 用户困惑 | sparkline + changelog 透明展示变化；trigger 字段说明原因 |
| 前端渲染性能（80 卡 × 实时数据） | 首页卡顿 | 周更快照模式，非实时；必要时 SSR |

---

## 11. 决策记录

| 决策 | 选项 | 选择 | 理由 |
|---|---|---|---|
| 更新频率 | 日更 / 周更 / 月更 | **周更** | 平衡数据新鲜度与工程成本；形成固定用户预期 |
| 更新时间 | 周一 / 周二 / ... | **周二 02:00 UTC** | 避开周一数据源拥堵；UTC 02:00 覆盖欧美早间 + 亚洲晚间 |
| changelog 粒度 | 每次数据变化 / 仅状态迁移 | **状态迁移 + 显著分数变化（>5 分）** | 避免噪音，保留有意义的事件 |
| sparkline 长度 | 4 周 / 8 周 / 全部 | **8 周** | 信息密度 vs 视觉长度平衡 |
| 邮件订阅 | 全量 / 仅状态迁移 | **仅状态迁移** | 避免邮件疲劳；迁移是用户最关心的时刻 |

---

**下一步**：Vincent 审批 → 通过后进入 Phase 2 实施 🔘
