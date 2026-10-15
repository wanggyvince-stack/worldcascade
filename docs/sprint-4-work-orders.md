# Sprint 4 工单

**日期**: 2026-10-15  
**目标交付**: 2026-10-22（一周内）  
**工单分配**: 产品扣子执行，Anna 审阅

---

## WO-S4-01: 修复 FP-79 leadingSignal

**优先级**: 🔴 P0  
**预估**: 0.5h  
**状态**: 待执行

### 问题描述
数据验证脚本发现 FP-79 "Quantum computer breaks a practical-grade encryption key" 的 leadingSignal 为空：
```json
{
  "indicator": "",
  "status": "none",
  "source": "",
  "currentValue": null,
  "thresholdValue": null
}
```

### 修复要求
1. 补充 indicator（如 "Quantum computing key-breaking capability"）
2. 补充 source（如 "IBM/Google quantum roadmap"）
3. 设置合理 status（建议 "monitoring" 或 "early_signal"）
4. 更新 predictions.json 并重新跑 `validate_data.py` 确认通过

### 验收标准
- `python3 scripts/validate_data.py` 输出 0 errors
- FP-79 详情页 leadingSignal 区域正常显示

---

## WO-S4-02: 数据验证管线 CI 集成

**优先级**: 🔴 P0  
**预估**: 2h  
**状态**: 待执行

### 任务描述
将 `scripts/validate_data.py` 集成到 GitHub Actions，确保数据变更后自动验证。

### 实现要求

1. 新增 workflow 文件 `.github/workflows/data-validation.yml`：
```yaml
name: Data Validation

on:
  push:
    paths:
      - 'public/data/**'
      - 'scripts/validate_data.py'
  pull_request:
    paths:
      - 'public/data/**'

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

2. 在 `generate_causal_chains.py`（WO-S4-03 创建）导出前调用验证：
```python
def export():
    data = generate()
    errors = validate(data)
    if errors:
        print(f"VALIDATION FAILED: {len(errors)} errors")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
    write_json(data)
```

### 验收标准
- GitHub Actions 自动跑数据验证
- 验证失败时 CI 标红，阻止合并
- 验证通过时输出 summary

---

## WO-S4-03: 因果链引擎核心算法

**优先级**: 🔴 P0  
**预估**: 8h  
**状态**: 待执行

### 任务描述
实现因果链自动生成引擎，使用贪心最长路径算法替代手工编排。

### 算法规格

**输入**：80 个 FP（含 causalChainNodes、verificationDate、domain）

**Step 1: 计算因果边权重矩阵**
```python
def calc_edge_weight(fp_a, fp_b, domain_affinity):
    # 时间约束（硬约束）
    date_diff = (fp_b.date - fp_a.date).days
    if date_diff < 0:
        return 0  # 原因必须早于结果
    
    # 同域同日放行，跨域要求 ≥ 365 天
    if fp_a.domain != fp_b.domain and date_diff < 365:
        return 0
    
    # 域亲和度（40%）
    affinity = domain_affinity[fp_a.domain][fp_b.domain]
    
    # 语义相似度（40%）— TF-IDF 余弦
    last_node_a = fp_a.causalChainNodes[-1]['step']
    first_node_b = fp_b.causalChainNodes[0]['step']
    similarity = tfidf_cosine(last_node_a, first_node_b)
    
    # 时间衰减（20%）— 越近越好
    time_decay = 1.0 / (1.0 + date_diff / 3650)  # 10年半衰期
    
    return affinity * 0.4 + similarity * 0.4 + time_decay * 0.2
```

**Step 2: 贪心构建因果链**
```python
def build_chains(edges, max_len=7):
    chains = []
    used_nodes = set()
    
    # 按权重降序排序
    sorted_edges = sorted(edges, key=lambda e: e.weight, reverse=True)
    
    for edge in sorted_edges:
        if edge.source in used_nodes or edge.target in used_nodes:
            continue
        
        # 初始化新链
        chain = [edge.source, edge.target]
        used_nodes.add(edge.source)
        used_nodes.add(edge.target)
        
        # 向前扩展
        while len(chain) < max_len:
            best = find_best_extension(chain[-1], used_nodes, 'forward')
            if best:
                chain.append(best)
                used_nodes.add(best)
            else:
                break
        
        # 向后扩展
        while len(chain) < max_len:
            best = find_best_extension(chain[0], used_nodes, 'backward')
            if best:
                chain.insert(0, best)
                used_nodes.add(best)
            else:
                break
        
        chains.append(chain)
    
    return chains
```

**Step 3: 验证**
- V1: 时间单调性（所有相邻 FP 日期递增）
- V2: 域连贯性（域转换 ≤ 3 次）
- V3: 证据强度 ≥ 60
- V4: 语义连贯性（相邻 FP 节点相似度 > 0.3）

### 输出文件
- `scripts/generate_causal_chains.py`
- `scripts/domain_affinity.json`
- `public/data/causal_chains_auto.json`

### 验收标准
- 生成 15-25 条因果链
- 100% 时间单调（验证通过）
- 与旧手工链重叠度 ≥ 40%
- 运行时间 < 5 秒

---

## WO-S4-04: 生成新因果链数据

**优先级**: 🔴 P0  
**预估**: 2h  
**状态**: 依赖 WO-S4-03

### 任务描述
运行因果链引擎，生成新的因果链数据并替换旧数据。

### 步骤
1. 运行 `python3 scripts/generate_causal_chains.py`
2. 检查输出 `causal_chains_auto.json`
3. 对比旧手工链，计算重叠度
4. 提交给 Anna 审阅
5. 审阅通过后替换 `predictions.json` 中的 causalChains

### 验收标准
- Anna 审阅通过
- 数据验证脚本通过
- Timeline 脉络线无回流

---

## WO-S4-05: Timeline 脉络线重做

**优先级**: 🟡 P1  
**预估**: 6h  
**状态**: 依赖 WO-S4-04

### 任务描述
将 Timeline 的因果脉络线从阶梯式改为贝塞尔曲线，恢复设计稿风格。

### 实现要求

**1. 贝塞尔曲线路径**
```javascript
// timeline.js
function renderCausalChains(chains) {
  // 按强度排序，默认显示 top 5
  const visibleChains = chains
    .sort((a, b) => b.strength - a.strength)
    .slice(0, maxVisible || 5);
  
  visibleChains.forEach(chain => {
    const linkedFPs = chain.linkedPredictions;
    
    // 每段画贝塞尔曲线
    for (let i = 0; i < linkedFPs.length - 1; i++) {
      const source = getPos(linkedFPs[i]);
      const target = getPos(linkedFPs[i+1]);
      const dx = target.x - source.x;
      
      // 贝塞尔控制点（设计稿风格）
      const cp1x = source.x + dx * 0.4;
      const cp2x = target.x - dx * 0.4;
      
      pathGroup.append('path')
        .attr('d', `M${source.x},${source.y} C${cp1x},${source.y} ${cp2x},${target.y} ${target.x},${target.y}`)
        .attr('stroke', `url(#grad-${chain.id})`)
        .attr('stroke-width', 2)
        .attr('opacity', 0.7)
        .attr('marker-end', 'url(#arrow)');
    }
  });
}
```

**2. 渐变定义**
```javascript
// 每条链一个渐变
defs.selectAll('.chain-gradient')
  .data(visibleChains)
  .enter()
  .append('linearGradient')
  .attr('id', d => `grad-${d.id}`)
  .attr('x1', '0%').attr('y1', '0%')
  .attr('x2', '100%').attr('y2', '0%')
  .selectAll('stop')
  .data((d, i) => [
    {offset: '0%', color: domainColor(d.domains[0])},
    {offset: '100%', color: domainColor(d.domains[d.domains.length-1])}
  ])
  .enter()
  .append('stop')
  .attr('offset', d => d.offset)
  .attr('stop-color', d => d.color);
```

**3. 数量控制**
- 默认显示 top 5 核心链
- 侧边栏可调整（WO-S4-06）

### 验收标准
- 曲线平滑，无尖角
- 每段曲线连接相邻 FP
- 默认显示 5 条
- hover 时显示完整链信息

---

## WO-S4-06: 因果链侧边栏

**优先级**: 🟡 P1  
**预估**: 4h  
**状态**: 依赖 WO-S4-05

### 任务描述
在 Timeline 页面增加侧边栏，支持因果链筛选和详情查看。

### 功能要求

**1. 域过滤**
- 10 个域复选框
- 勾选后只显示包含该域的链

**2. 强度筛选**
- 滑块：50-100
- 只显示强度 ≥ 阈值的链

**3. 链列表**
- 显示所有可见链
- 每项：ID + 标题 + 强度 + FP 数量
- 点击高亮该链

**4. 链详情面板**
- 点击链后右侧显示详情
- 包含：标题、类型、域、节点步骤、关联 FP 列表

### 验收标准
- 筛选联动 Timeline 曲线显示
- 详情面板信息完整
- 移动端可折叠

---

## WO-S4-07: 集成测试 + 回归测试

**优先级**: 🟡 P1  
**预估**: 4h  
**状态**: 依赖全部完成

### 任务描述
确保所有新功能都有测试覆盖，现有功能无回归。

### 测试要求

**1. 数据验证测试**
- 因果链引擎输出的链 100% 时间单调
- 所有字段完整性验证通过

**2. Timeline 测试**
- 脉络线渲染正确（贝塞尔曲线）
- 筛选联动正确
- 点击链跳转到详情页

**3. 侧边栏测试**
- 域过滤联动
- 强度筛选联动
- 详情面板显示

**4. 回归测试**
- 所有现有 Playwright 测试通过
- 新增测试覆盖新功能

### 验收标准
- `npx playwright test` 全部通过
- 数据验证脚本通过
- 无 JS 错误

---

## 排期汇总

| 工单 | 任务 | 预估 | 依赖 | 状态 |
|---|---|---|---|---|
| WO-S4-01 | 修复 FP-79 | 0.5h | 无 | ⏳ 待执行 |
| WO-S4-02 | 数据验证 CI | 2h | 无 | ⏳ 待执行 |
| WO-S4-03 | 因果链引擎算法 | 8h | 无 | ⏳ 待执行 |
| WO-S4-04 | 生成新因果链数据 | 2h | WO-S4-03 | ⏳ 待执行 |
| WO-S4-05 | Timeline 脉络线重做 | 6h | WO-S4-04 | ⏳ 待执行 |
| WO-S4-06 | 因果链侧边栏 | 4h | WO-S4-05 | ⏳ 待执行 |
| WO-S4-07 | 集成测试 | 4h | 全部 | ⏳ 待执行 |
| | **总计** | **26.5h** | | |

**建议执行顺序**：
1. Day 1: WO-S4-01 + WO-S4-02 + WO-S4-03（并行）
2. Day 2: WO-S4-03 完成 + WO-S4-04
3. Day 3: WO-S4-05
4. Day 4: WO-S4-06 + WO-S4-07
5. Day 5: Anna 审阅 + 修复反馈 + 部署

---

**工单下发**: 产品扣子  
**审阅**: Anna  
**确认**: Vincent
