# 因果链推导规则引擎 - 产品方案

**版本**: v1.0  
**日期**: 2026-10-15  
**作者**: 产品扣子  
**审阅**: Anna

---

## 1. 问题背景

### 现状
- 80 条预测（FP）各自独立生成，每条有自己的因果链节点（3-5 steps）
- 21 条"宏观因果链"（CC）是手工编排的，把多个 FP 串成跨时间/跨域的传导链
- 手工编排问题：
  - 没按时间排序 → Timeline 脉络线回流
  - 没有系统性验证 → 因果关系可能不成立
  - 无法扩展 → 新增 FP 后无法自动加入因果链

### 目标
建立规则引擎，**自动生成 + 验证**因果链，替代手工编排。

---

## 2. 数据模型

### 输入
| 数据 | 来源 | 字段 |
|---|---|---|
| 预测列表 | fixtures/fp01-80.json | id, domain, verification_date, causal_chain.nodes, title |
| 因果步骤 | 每个 FP 的 causal_chain.nodes | step, evidence_strength |

### 输出
| 数据 | 字段 |
|---|---|
| 因果链列表 | id, title, type, domains, linked_predictions, nodes |

---

## 3. 推导规则设计

### 3.1 候选配对规则（哪些 FP 之间可能有因果关系？）

**规则 R1: 时间约束**
```
如果 FP-A 可能导致 FP-B，则：
  FP-A.verification_date <= FP-B.verification_date
```
- 原因先于结果，这是硬约束
- 允许相同日期（同日发生的多米诺效应）

**规则 R2: 域相关性**
```
FP-A 和 FP-B 的域必须满足以下之一：
  a) 同域（intra-domain）: FP-A.domain == FP-B.domain
  b) 跨域传导（cross-domain）: 域对存在于"允许跨域表"中
```

允许跨域表（基于现有数据分析）:
```
AI → demographics (4次)
AI → cross-domain (2次)  
AI → energy (待验证)
demographics → AI (4次)
energy → demographics (1次)
biotech → health (待验证)
```

**规则 R3: 语义相似度**
```
FP-A 的因果链最后一个节点 与 FP-B 的因果链第一个节点 存在语义关联
```
- 使用关键词重叠或 LLM 判断
- 示例：FP-01 "AI Agent 商业化" → FP-06 "数据中心用电量" → 关键词 "AI/数据/算力" 重叠

### 3.2 链构建规则（如何把多个 FP 串成链？）

**规则 R4: 最小链长度**
```
一条有效因果链至少包含 2 个 FP
```

**规则 R5: 最大链长度**
```
一条因果链最多包含 7 个 FP（避免过长导致混乱）
```

**规则 R6: 时间单调性**
```
链中 FP 的 verification_date 必须单调递增（非递减）
  FP[0].date <= FP[1].date <= ... <= FP[n].date
```

**规则 R7: 域连贯性**
```
链的域转换不能超过 3 次（避免跳跃过多）
```

### 3.3 验证规则（生成的链是否有效？）

**规则 V1: 时间验证**
```
对所有相邻 FP 对 (A, B):
  assert A.verification_date <= B.verification_date
```

**规则 V2: 因果步骤验证**
```
链的 nodes 必须能够覆盖所有 FP 的因果传导逻辑
  - 链的 nodes 数量 >= 链中 FP 数量 - 1
  - 每个 FP 至少对应一个节点步骤
```

**规则 V3: 证据强度验证**
```
链的整体强度 = 所有节点 evidence_strength 的加权平均
  HIGH = 3, MEDIUM = 2, LOW = 1
  
链强度 >= 60 才显示在 Timeline（与现有阈值一致）
```

---

## 4. 算法设计

### 4.1 候选配对生成
```python
def generate_candidate_pairs(fixtures):
    pairs = []
    for fp_a in fixtures:
        for fp_b in fixtures:
            if fp_a.id == fp_b.id:
                continue
            # R1: 时间约束
            if fp_a.date > fp_b.date:
                continue
            # R2: 域相关性
            if not is_domain_related(fp_a.domain, fp_b.domain):
                continue
            # R3: 语义相似度（可选，需要 LLM）
            if not has_semantic_link(fp_a, fp_b):
                continue
            pairs.append((fp_a.id, fp_b.id))
    return pairs
```

### 4.2 链构建（图算法）
```python
def build_chains(pairs, fixtures):
    # 构建有向图
    graph = defaultdict(list)
    for a, b in pairs:
        graph[a].append(b)
    
    # 找出所有路径（DFS）
    chains = []
    for start in fixtures:
        paths = dfs(graph, start.id, max_length=7)
        for path in paths:
            if len(path) >= 2:  # R4: 最小长度
                chains.append(path)
    
    return chains
```

### 4.3 链验证
```python
def validate_chain(chain, fixtures):
    # V1: 时间验证
    dates = [fixtures[fp].date for fp in chain]
    if not all(dates[i] <= dates[i+1] for i in range(len(dates)-1)):
        return False, "时间非单调"
    
    # V2: 因果步骤验证
    # V3: 证据强度验证
    strength = calc_chain_strength(chain)
    if strength < 60:
        return False, f"强度不足 ({strength})"
    
    return True, "通过"
```

---

## 5. 实现方案

### 5.1 模块设计
```
prediction-engine/
├── scripts/
│   ├── export_mvp_data.py       # 现有：导出
│   └── generate_causal_chains.py # 新增：生成因果链
├── core/
│   ├── chain_generator.py        # 新增：候选配对 + 链构建
│   ├── chain_validator.py        # 新增：验证规则
│   └── domain_rules.py           # 新增：域相关性规则
└── references/
    ├── causal_chains.json        # 现有：手工编排（保留作为参考）
    └── domain_affinity.json      # 新增：域亲和度矩阵
```

### 5.2 配置文件
```json
// domain_affinity.json
{
  "AI": {"AI": 1.0, "demographics": 0.7, "energy": 0.6, "cross-domain": 0.5},
  "demographics": {"demographics": 1.0, "AI": 0.6, "energy": 0.4},
  "energy": {"energy": 1.0, "AI": 0.5, "climate": 0.8},
  ...
}
```

### 5.3 运行流程
```
1. python generate_causal_chains.py --input fixtures/ --output causal_chains_auto.json
2. 人工审阅 top 20 链（可选）
3. python export_mvp_data.py --chains causal_chains_auto.json --output predictions.json
```

---

## 6. 与现有系统的兼容

### 渐进式迁移
| 阶段 | 方案 | 风险 |
|---|---|---|
| Phase 1 | 自动生成 + 人工审阅，输出到 `causal_chains_auto.json` | 低 |
| Phase 2 | 对比手工 vs 自动，差异超过 30% 则人工复核 | 中 |
| Phase 3 | 完全切换，手工文件仅作备份 | 中 |

### 短期止血（本周）
在自动引擎完成前，先修复排序问题：
```python
# export_mvp_data.py
'linkedPredictions': sorted(
    chain.get('linked_predictions', []),
    key=lambda fp: fixtures_date.get(fp, '9999')
)
```

---

## 7. 验收标准

| 指标 | 目标 |
|---|---|
| 生成链数 | 15-25 条（与现有 21 条相当） |
| 时间约束通过率 | 100% |
| 证据强度 >= 60 | 100% |
| 与手工链重叠度 | >= 50%（说明规则合理） |
| Timeline 脉络线回流 | 0 条 |

---

## 8. 待讨论问题

1. **语义相似度判断**：用关键词重叠还是 LLM？
   - 关键词：快，但可能漏
   - LLM：准，但成本高
   
2. **跨域亲和度矩阵**：怎么确定哪些域可以跨？
   - 方案 A：基于现有数据分析（频率）
   - 方案 B：领域专家定义
   
3. **链的粒度**：要不要允许"分支因果链"（A → B → C，同时 A → D → E）？
   - 当前是线性链，分支会增加复杂度

---

## 9. 排期建议

| 任务 | 工时 | 优先级 |
|---|---|---|
| 短期止血（排序修复） | 0.5h | P0 本周 |
| 域亲和度矩阵设计 | 2h | P1 |
| 候选配对算法 | 4h | P1 |
| 链构建算法 | 4h | P1 |
| 验证规则实现 | 3h | P1 |
| 人工审阅流程 | 2h | P2 |
| **总计** | ~15h | Sprint 4 |

---

**下一步**：
1. Vincent 确认方案方向
2. Anna 审阅技术可行性
3. 确认后我开始实现
