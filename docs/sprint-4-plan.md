# Sprint 4 方案 — 因果链引擎 + 数据质量管线

**版本**: v1.0  
**日期**: 2026-10-15  
**作者**: Anna (Code Review Agent)  
**技术审阅**: 已完成  
**状态**: 待 Vincent 确认

---

## 0. Sprint 3 遗留问题（Sprint 4 开始前必须修复）

| 编号 | 问题 | 严重程度 | 当前状态 |
|---|---|---|---|
| S3-BUG-1 | FP-79 leadingSignal 为空（status='none', indicator='', source=''） | 🔴 P0 | 数据验证已发现，待修复 |
| S3-BUG-2 | 因果链 ID 格式不统一（产品扣子改为 CC-{domain}-{seq}，但 timeline 链接仍指向旧格式） | 🔴 P0 |  Vincent 反馈 timeline 链接错误 |
| S3-BUG-3 | 首页 chain 卡片 data-chain-id 与 timeline.js 中 DETAIL_DATA.causalChainIds 不一致 | 🟡 P1 | 需全链路验证 |

**验收标准**：数据验证脚本 `python3 scripts/validate_data.py` 通过（0 errors）。

---

## 1. Sprint 4 目标

| 优先级 | 目标 | 交付物 |
|---|---|---|
| **P0** | 因果链引擎 | `generate_causal_chains.py` + 自动生成的因果链数据 |
| **P0** | 数据验证管线 | CI 集成 + 生成脚本内建验证 |
| **P1** | Timeline 脉络线重做 | 贝塞尔曲线 + 多段渲染 + 数量控制 |
| **P2** | 因果链侧边栏 | 域过滤 + 强度筛选 + 链详情面板 |

---

## 2. 因果链引擎（核心交付）

### 2.1 设计原则

基于 Sprint 3 的数据质量复盘，因果链引擎遵循三个原则：

1. **时间硬约束**：原因必须早于结果 ≥ 1 年（同域可放宽至同日）
2. **算法可控**：贪心最长路径，不用 DFS（80 节点规模下 DFS 路径数 12.8 亿，必爆）
3. **验证内建**：生成即验证，不通过就不输出

### 2.2 算法流程

```
输入：80 个 FP（含 causalChainNodes、verificationDate、domain）
              ↓
    Step 1: 计算因果边权重矩阵
    ├─ 时间约束：FP-A.date + 1年 ≤ FP-B.date
    ├─ 域亲和度：domain_affinity.json 查表
    └─ 语义相似度：TF-IDF 余弦（causalChainNodes 末节点 ↔ 首节点）
              ↓
    Step 2: 贪心构建因果链
    ├─ 从权重最高的边 (A→B) 开始
    ├─ 向前扩展：找 C 使 B→C 权重最高
    ├─ 向后扩展：找 X 使 X→A 权重最高
    └─ 重复直到无法扩展或达到最大长度（7 FP）
              ↓
    Step 3: 输出链 + 移除已用节点
              ↓
    Step 4: 验证
    ├─ V1: 时间单调性
    ├─ V2: 域连贯性（域转换 ≤ 3 次）
    ├─ V3: 证据强度 ≥ 60
    └─ V4: 语义连贯性（相邻 FP 节点有语义关联）
              ↓
输出：causal_chains_auto.json（通过验证的因果链）
```

### 2.3 复杂度

- 边权重矩阵：80 × 80 = 6,400 次计算
- 贪心构建：O(N² × max_len) = 80² × 7 = 44,800 次操作
- 总计：毫秒级完成

### 2.4 实现文件

```
scripts/
├── generate_causal_chains.py    # 主脚本：生成因果链
├── validate_data.py             # 已有：数据验证
└── domain_affinity.json         # 新增：域亲和度矩阵

references/
├── causal_chains.json           # 保留：旧手工链（备份）
└── causal_chains_auto.json      # 新增：自动生成的链
```

### 2.5 域亲和度矩阵（初始值）

基于领域知识定义，不依赖手工 CC 数据：

| From \ To | AI | demographics | energy | climate | space | biotech | quantum | space-economy | space-alien | cross-domain |
|---|---|---|---|---|---|---|---|---|---|---|
| AI | 1.0 | 0.7 | 0.6 | 0.3 | 0.2 | 0.4 | 0.3 | 0.2 | 0.1 | 0.5 |
| demographics | 0.6 | 1.0 | 0.4 | 0.3 | 0.1 | 0.3 | 0.1 | 0.2 | 0.1 | 0.4 |
| energy | 0.5 | 0.4 | 1.0 | 0.8 | 0.1 | 0.2 | 0.1 | 0.3 | 0.1 | 0.5 |
| climate | 0.3 | 0.3 | 0.8 | 1.0 | 0.1 | 0.3 | 0.1 | 0.2 | 0.1 | 0.4 |
| space | 0.2 | 0.1 | 0.1 | 0.1 | 1.0 | 0.2 | 0.2 | 0.7 | 0.6 | 0.3 |
| biotech | 0.4 | 0.3 | 0.2 | 0.3 | 0.2 | 1.0 | 0.2 | 0.1 | 0.1 | 0.3 |
| quantum | 0.3 | 0.1 | 0.1 | 0.1 | 0.2 | 0.2 | 1.0 | 0.2 | 0.1 | 0.3 |
| space-economy | 0.2 | 0.2 | 0.3 | 0.2 | 0.7 | 0.1 | 0.2 | 1.0 | 0.3 | 0.4 |
| space-alien | 0.1 | 0.1 | 0.1 | 0.1 | 0.6 | 0.1 | 0.1 | 0.3 | 1.0 | 0.3 |
| cross-domain | 0.5 | 0.4 | 0.5 | 0.4 | 0.3 | 0.3 | 0.3 | 0.4 | 0.3 | 1.0 |

**说明**：
- 同域 = 1.0（最高亲和度）
- AI ↔ energy = 0.6（算力需求驱动能源需求）
- energy ↔ climate = 0.8（能源转型影响气候）
- space ↔ space-economy = 0.7（太空基础设施带动太空经济）

### 2.6 验收标准

| 指标 | 目标 | 说明 |
|---|---|---|
| 生成链数 | 15-25 条 | 与现有 21 条相当 |
| 时间约束通过率 | 100% | 验证脚本 V1 通过 |
| 证据强度 ≥ 60 | 100% | 验证脚本 V3 通过 |
| 与旧手工链重叠度 | ≥ 40% | 说明规则合理 |
| Timeline 脉络线回流 | 0 条 | 视觉验证 |
| 运行时间 | < 5 秒 | 性能验证 |

---

## 3. 数据验证管线

### 3.1 当前状态

- `scripts/validate_data.py` ✅ 已写好，能跑
- 发现 1 个真实 bug：FP-79 leadingSignal 为空

### 3.2 Sprint 4 目标

```
生成数据 (LLM/脚本)
       ↓
python3 validate_data.py  ← 自动生成后立刻跑
       ↓
  ┌─ 通过 → 可以部署
  └─ 失败 → 报告问题，修完再跑
       ↓
git push → GitHub Actions 再跑一次（双重保险）
```

### 3.3 CI 集成

```yaml
# .github/workflows/data-validation.yml
name: Data Validation

on:
  push:
    paths:
      - 'public/data/**'
      - 'scripts/validate_data.py'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Run data validation
        run: python3 scripts/validate_data.py
```

### 3.4 验证规则清单

| 规则 | 检查内容 | 阻断级别 |
|---|---|---|
| V1 | 因果链时间单调性 | ERROR |
| V2 | 必填字段非空 | ERROR |
| V3 | 域一致性 | ERROR |
| V4 | 评分合理性（0-100） | ERROR |
| V5 | 因果步骤质量（非占位符） | ERROR |
| V6 | 因果链覆盖率 | INFO（不阻断） |
| V7 | 因果链字段完整性 | ERROR |
| V8 | 证据质量（URL 格式） | ERROR |
| V9 | leadingSignal 完整性 | ERROR |
| V10 | 预测 ID 连续性 | ERROR |
| V11 | 元数据一致性 | ERROR |
| V12 | 回测数据完整性 | ERROR |

---

## 4. Timeline 脉络线重做（P1）

### 4.1 当前问题

- 阶梯式路径（L + Q 圆角），视觉粗糙
- 只连首尾 FP，中间节点被忽略
- 21 条链全部显示，视觉混乱

### 4.2 目标效果

回到设计稿风格：
- 贝塞尔曲线（平滑 S 形）
- 多段短曲线（相邻 FP 之间各画一段）
- 默认显示 top 5 核心链，侧边栏可筛选

### 4.3 实现方案

```javascript
// timeline.js 改造
function renderCausalChains(chains) {
  // 1. 按强度排序，只取 top N
  const visibleChains = chains
    .sort((a, b) => b.strength - a.strength)
    .slice(0, maxVisible);
  
  // 2. 每段画贝塞尔曲线
  visibleChains.forEach(chain => {
    const linkedFPs = chain.linkedPredictions;
    for (let i = 0; i < linkedFPs.length - 1; i++) {
      const source = getPos(linkedFPs[i]);
      const target = getPos(linkedFPs[i+1]);
      const dx = target.x - source.x;
      
      // 贝塞尔控制点
      const cp1x = source.x + dx * 0.4;
      const cp2x = target.x - dx * 0.4;
      
      pathGroup.append('path')
        .attr('d', `M${source.x},${source.y} C${cp1x},${source.y} ${cp2x},${target.y} ${target.x},${target.y}`)
        .attr('stroke', `url(#grad-${chain.id})`)
        .attr('stroke-width', 2)
        .attr('opacity', 0.7);
    }
  });
}
```

### 4.4 验收标准

- 曲线平滑，无尖角
- 每段曲线连接相邻 FP
- 默认显示 5 条核心链
- hover 时显示完整链信息

---

## 5. 排期

| 阶段 | 任务 | 负责人 | 预估工时 | 依赖 |
|---|---|---|---|---|
| **Week 1** | 修复 S3 遗留问题（FP-79、ID 格式） | 产品扣子 | 2h | 无 |
| **Week 1** | 数据验证 CI 集成 | 产品扣子 | 2h | validate_data.py 已完成 |
| **Week 2** | 域亲和度矩阵定义 | Anna 审阅 + Vincent 确认 | 2h | 无 |
| **Week 2** | 因果链引擎核心算法 | 产品扣子 | 8h | 域亲和度矩阵 |
| **Week 2** | 因果链引擎验证规则 | 产品扣子 | 4h | 核心算法 |
| **Week 3** | 生成新因果链数据 | 产品扣子 | 2h | 引擎完成 |
| **Week 3** | Anna 审阅生成结果 | Anna | 2h | 新数据 |
| **Week 3** | Timeline 脉络线重做 | 产品扣子 | 6h | 新因果链数据 |
| **Week 4** | 集成测试 + 回归测试 | 产品扣子 + Anna | 4h | 全部完成 |
| **Week 4** | 部署上线 | 产品扣子 | 2h | 测试通过 |
| | **总计** | | **~34h** | |

---

## 6. 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|---|---|---|---|
| 自动生成的因果链质量不如手工 | 中 | 高 | 保留手工链作为参考，对比重叠度 |
| 域亲和度矩阵不准确 | 中 | 中 | Vincent 审阅 + 迭代调整 |
| Timeline 性能问题（曲线太多） | 低 | 中 | 默认只显示 top 5，懒加载其余 |
| 验证规则太严导致生成失败 | 低 | 低 | 分级阻断（ERROR/INFO） |

---

## 7. 验收标准（整体）

Sprint 4 完成时，以下条件必须全部满足：

- [ ] `python3 scripts/validate_data.py` 通过（0 errors）
- [ ] 因果链引擎生成的链 100% 时间单调
- [ ] Timeline 脉络线无回流
- [ ] CI 每次 push 自动跑数据验证
- [ ] 所有现有 Playwright 测试通过
- [ ] 新增测试覆盖因果链引擎

---

**下一步**：
1. Vincent 确认方案方向和排期
2. 产品扣子先修 S3 遗留问题（FP-79、ID 格式）
3. 确认域亲和度矩阵初始值
4. 开始 Week 2 因果链引擎开发
