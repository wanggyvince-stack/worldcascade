# Sprint 4 方案 — 因果链引擎 + 数据质量管线

**版本**: v1.1  
**日期**: 2026-10-15  
**作者**: Anna (方案框架) + 产品扣子 (技术审阅 + 实现补充)  
**技术审阅**: 产品扣子已完成  
**状态**: Vincent 确认后开干  
**目标交付**: 2026-10-22（一周内全部完成）

---

## 0. Sprint 3 遗留问题（Sprint 4 开始前必须修复）

| 编号 | 问题 | 严重程度 | 当前状态 |
|---|---|---|---|
| S3-BUG-1 | FP-79 leadingSignal 为空（status='none', indicator='', source=''） | 🔴 P0 | 数据验证已发现，待修复 |
| S3-BUG-2 | 因果链 ID 格式不统一（产品扣子改为 CC-{domain}-{seq}，但 timeline 链接仍指向旧格式） | 🔴 P0 | ✅ 已修复 commit `fc31c2d` — predictions.json 全量更新 |
| S3-BUG-3 | 首页 chain 卡片 data-chain-id 与 timeline.js 中 DETAIL_DATA.causalChainIds 不一致 | 🟡 P1 | ✅ 已修复 commit `e27d86d` |

**已完成修复**：
- `index.html`：var 作用域修复（`5b352a4`）、window 暴露函数（`150abc8`）、ID 格式统一（`0e11457`）、占位符补 relatedPreds（`b4e398c`）
- `predictions.json`：21 条因果链 ID 全量更新为新格式（`fc31c2d`）

**验收标准**：数据验证脚本 `python3 scripts/validate_data.py` 通过（0 errors）。

---

## 1. Sprint 4 目标

| 优先级 | 目标 | 交付物 | 预估 |
|---|---|---|---|
| **P0** | 因果链引擎 | `generate_causal_chains.py` + 自动生成的因果链数据 | Day 1-2 |
| **P0** | 数据验证管线 | CI 集成 + 生成脚本内建验证 | Day 1 |
| **P1** | Timeline 脉络线重做 | 贝塞尔曲线 + 多段渲染 + 数量控制 | Day 3 |
| **P1** | 因果链侧边栏 | 域过滤 + 强度筛选 + 链详情面板 | Day 4 |

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

**产品扣子审阅意见**：
- AI ↔ biotech 建议从 0.4 调到 0.5（AI 制药是当前热点，AlphaFold 等）
- AI ↔ energy 从 0.6 调到 0.7（数据中心能耗暴增，更贴切）
- space ↔ space-alien = 0.6 合理（太空探索自然关联）
- cross-domain 行偏高（全 0.3-0.5），建议降到 0.3-0.4，避免跨域链过多

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

## 3. 因果链引擎实现方案（产品扣子补充）

### 3.1 数据结构分析

**现有数据**（`predictions.json`）：
- 80 个预测（FP），每个包含：
  - `id`: "FP-01" ~ "FP-80"
  - `domain`: 10 个域之一
  - `verificationDate`: "2027-06-30" ~ "2031-06-30"
  - `causalChainNodes`: [{step, stepEn, evidence_strength}] — 因果步骤描述
- 21 条手工因果链，每条包含：
  - `linkedPredictions`: ["FP-01", "FP-22", ...] — 链上的 FP ID 列表
  - `nodes`: [{step, evidence_strength}] — 链节点描述
  - `domains`: ["AI", "energy", ...] — 涉及域

**关键发现**：
- `verificationDate` 只有 3 个值：2027-06-30、2028-06-30、2029-06-30、2030-06-30、2031-06-30
- 同日期 FP 数量很多 → 时间约束"≥ 1 年"会过滤大量边
- 同域内同日 FP 可放宽约束（Anna 方案已提到）

### 3.2 权重计算公式

```python
def edge_weight(fp_a, fp_b, affinity_matrix):
    """计算 FP-A → FP-B 的因果边权重"""
    
    # 1. 时间约束（硬约束）
    date_a = parse_date(fp_a['verificationDate'])
    date_b = parse_date(fp_b['verificationDate'])
    year_gap = (date_b - date_a).days / 365.0
    
    if year_gap < 0:
        return 0  # 时间倒流，不可接受
    if year_gap < 1 and fp_a['domain'] != fp_b['domain']:
        return 0  # 非同域且间隔不足 1 年
    # 同域同日允许（year_gap >= 0）
    
    # 2. 域亲和度（0-1）
    affinity = affinity_matrix[fp_a['domain']][fp_b['domain']]
    
    # 3. 语义相似度（TF-IDF 余弦，0-1）
    # 取 A 的最后一个 causalChainNode 与 B 的第一个
    text_a = fp_a['causalChainNodes'][-1]['stepEn']
    text_b = fp_b['causalChainNodes'][0]['stepEn']
    similarity = tfidf_cosine(text_a, text_b)
    
    # 4. 时间衰减（越早的因越"自然"）
    time_factor = 1.0 / (1.0 + year_gap * 0.1)
    
    # 综合权重
    weight = affinity * 0.4 + similarity * 0.4 + time_factor * 0.2
    return weight
```

### 3.3 贪心构建伪代码

```python
def build_chains(weight_matrix, fps, max_chains=25, max_len=7):
    """贪心构建因果链"""
    used_nodes = set()
    chains = []
    
    # 按权重降序遍历所有边
    edges = sorted(
        [(i, j, w) for i in range(80) for j in range(80) 
         if i != j and weight_matrix[i][j] > 0],
        key=lambda x: -x[2]
    )
    
    for (i, j, w) in edges:
        if i in used_nodes or j in used_nodes:
            continue
        if len(chains) >= max_chains:
            break
        
        # 以 (i→j) 为种子链
        chain = [i, j]
        used_nodes.add(i)
        used_nodes.add(j)
        
        # 向前扩展（找 X → chain[0]）
        while len(chain) < max_len:
            best = find_best_predecessor(chain[0], weight_matrix, used_nodes)
            if best is None or weight_matrix[best][chain[0]] < 0.2:
                break
            chain.insert(0, best)
            used_nodes.add(best)
        
        # 向后扩展（找 chain[-1] → Y）
        while len(chain) < max_len:
            best = find_best_successor(chain[-1], weight_matrix, used_nodes)
            if best is None or weight_matrix[chain[-1]][best] < 0.2:
                break
            chain.append(best)
            used_nodes.add(best)
        
        chains.append(chain)
    
    return chains
```

### 3.4 验证规则实现

```python
def validate_chain(chain, fps):
    """验证因果链是否合格"""
    
    # V1: 时间单调性
    dates = [fps[i]['verificationDate'] for i in chain]
    for k in range(len(dates) - 1):
        if parse_date(dates[k]) > parse_date(dates[k+1]):
            return False, "V1: 时间非单调"
    
    # V2: 域连贯性（域转换 ≤ 3 次）
    domains = [fps[i]['domain'] for i in chain]
    transitions = sum(1 for k in range(len(domains)-1) if domains[k] != domains[k+1])
    if transitions > 3:
        return False, f"V2: 域转换 {transitions} 次 > 3"
    
    # V3: 证据强度 ≥ 60
    strengths = []
    for i in chain:
        for node in fps[i]['causalChainNodes']:
            s = node.get('evidence_strength', 'LOW')
            strengths.append({'HIGH': 100, 'MEDIUM': 60, 'LOW': 30}.get(s, 30))
    avg_strength = sum(strengths) / len(strengths) if strengths else 0
    if avg_strength < 60:
        return False, f"V3: 平均证据 {avg_strength:.0f} < 60"
    
    # V4: 语义连贯性（相邻节点相似度 > 0.15）
    for k in range(len(chain) - 1):
        text_a = fps[chain[k]]['causalChainNodes'][-1]['stepEn']
        text_b = fps[chain[k+1]]['causalChainNodes'][0]['stepEn']
        sim = tfidf_cosine(text_a, text_b)
        if sim < 0.15:
            return False, f"V4: 语义断裂 {sim:.2f}"
    
    return True, "PASS"
```

### 3.5 实现风险与缓解

| 风险 | 缓解 |
|---|---|
| verificationDate 只有 5 个离散值，时间约束太严 | 同域同日允许；跨域间隔 < 1 年用时间衰减降权而非硬过滤 |
| TF-IDF 在短文本上效果差 | 用 sentence-transformers 替代（如果依赖允许），或退回关键词重叠 |
| 生成链与手工链重叠度低 | 先跑一版看重叠度，低于 30% 则调权重参数 |

---

## 4. 数据验证管线

### 4.1 当前状态

- `scripts/validate_data.py` ✅ 已写好，能跑
- 发现 1 个真实 bug：FP-79 leadingSignal 为空

### 4.2 Sprint 4 目标

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

### 4.3 CI 集成

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

### 4.4 验证规则清单

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

## 5. Timeline 脉络线重做（P1）

### 5.1 当前问题

- 阶梯式路径（L + Q 圆角），视觉粗糙
- 只连首尾 FP，中间节点被忽略
- 21 条链全部显示，视觉混乱

### 5.2 目标效果

回到设计稿风格：
- 贝塞尔曲线（平滑 S 形）
- 多段短曲线（相邻 FP 之间各画一段）
- 默认显示 top 5 核心链，侧边栏可筛选

### 5.3 实现方案

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

### 5.4 验收标准

- 曲线平滑，无尖角
- 每段曲线连接相邻 FP
- 默认显示 5 条核心链
- hover 时显示完整链信息

---

## 6. 排期（压缩版 — 一周交付）

| 日期 | 任务 | 负责人 | 工时 | 依赖 |
|---|---|---|---|---|
| **Day 1（10/16 周三）** | 修复 FP-79 leadingSignal | 产品扣子 | 1h | 无 |
| | 数据验证 CI 集成（.github/workflows） | 产品扣子 | 1h | validate_data.py 已完成 |
| | domain_affinity.json 定义 | 产品扣子 | 1h | 无 |
| **Day 2（10/17 周四）** | 因果链引擎核心算法 `generate_causal_chains.py` | 产品扣子 | 6h | affinity matrix |
| | 验证规则实现（V1-V4） | 产品扣子 | 2h | 核心算法 |
| **Day 3（10/18 周五）** | 生成新因果链数据 + 与手工链对比 | 产品扣子 | 2h | 引擎完成 |
| | Anna 审阅生成结果 | Anna | 2h | 新数据 |
| | Timeline 脉络线重做（贝塞尔曲线） | 产品扣子 | 4h | 新因果链数据 |
| **Day 4（10/19 周六）** | 因果链侧边栏（域过滤 + 强度筛选） | 产品扣子 | 4h | 新数据 |
| | 集成测试 + 回归测试 | 产品扣子 + Anna | 2h | 全部完成 |
| **Day 5（10/20 周日）** | 修复审阅反馈 | 产品扣子 | 2h | Anna 审阅 |
| | 部署上线 | 产品扣子 | 1h | 测试通过 |
| | **总计** | | **~28h** | |

---

## 7. 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|---|---|---|---|
| 自动生成的因果链质量不如手工 | 中 | 高 | 保留手工链作为参考，对比重叠度 |
| 域亲和度矩阵不准确 | 中 | 中 | Vincent 审阅 + 迭代调整 |
| Timeline 性能问题（曲线太多） | 低 | 中 | 默认只显示 top 5，懒加载其余 |
| 验证规则太严导致生成失败 | 低 | 低 | 分级阻断（ERROR/INFO） |
| 一周时间太紧 | 中 | 中 | P2 侧边栏可推迟到 Sprint 5 |

---

## 8. 验收标准（整体）

Sprint 4 完成时，以下条件必须全部满足：

- [ ] `python3 scripts/validate_data.py` 通过（0 errors）
- [ ] 因果链引擎生成的链 100% 时间单调
- [ ] Timeline 脉络线无回流
- [ ] CI 每次 push 自动跑数据验证
- [ ] 所有现有 Playwright 测试通过
- [ ] 新增测试覆盖因果链引擎

---

**下一步**：
1. Vincent 确认排期（一周 vs 四周）
2. 产品扣子立即开始 Day 1 任务
