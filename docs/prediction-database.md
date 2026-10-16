# WorldCascade 预测数据库

**最后更新**: 2026-10-16  
**引擎版本**: v4.0.0  
**总预测数**: 80  
**回测 Brier Score**: 0.096  
**生成者**: Anna（Agent，2026-10-12 用 prediction-engine skill 生成）  
**数据质量**: 经过 validate_data.py 验证（0 errors）

---

## 预测总览

| ID | 标题 | 域 | 验证日期 | 置信度 | 引擎分 | 等级 | 生成批次 |
|---|---|---|---|---|---|---|---|
| FP-01 | 可再生能源确认为全球最大电力来源 | energy | 2027-06-30 | 82 | 96.9 | high | v1 |
| FP-02 | 全球城市人口占比超60% | demographics | 2031-06-30 | 50 | 64.5 | medium | v1 |
| FP-03 | 中国65岁以上人口超2.4亿 | demographics | 2027-12-31 | 45 | 55.2 | medium | v1 |
| FP-04 | AI在至少5个领域达专家级共识 | AI | 2030-12-31 | 60 | 54.0 | medium | v1 |
| FP-05 | AI替代美国至少100万工作岗位 | demographics | 2030-12-31 | 68 | 52.6 | high | v1 |
| FP-06 | 全球65岁以上人口占比超15% | demographics | 2030-12-31 | 72 | 65.4 | high | v1 |
| FP-07 | 全球电动车保有量超5亿 | energy | 2030-12-31 | 55 | 53.8 | medium | v1 |
| FP-08 | AI创造的新岗位超过制造业替代 | AI | 2031-01-31 | 50 | 45.5 | medium | v1 |
| FP-09 | 全球太阳能发电超核电 | energy | 2030-12-31 | 50 | 57.5 | medium | v1 |
| FP-10 | 中国新能源车销量占比超70% | energy | 2030-12-31 | 80 | 71.0 | high | v1 |
| FP-11 | 日本TFR跌破1.1 | demographics | 2028-06-30 | 70 | 66.5 | high | v1 |
| FP-12 | 美国初级技术岗位招聘降50%+ | AI | 2028-06-30 | 68 | 75.6 | high | v1 |
| FP-13 | 氢能占全球一次能源超5% | energy | 2030-12-31 | 30 | 33.5 | low | v1 |
| FP-14 | AI独立产出最高法院级别裁决 | AI | 2030-12-31 | 65 | 49.2 | high | v1 |
| FP-15 | 全球海上风电装机超200GW | energy | 2031-03-31 | 50 | 50.5 | medium | v1 |
| FP-16 | 中国自然人口减少超500万 | demographics | 2028-03-31 | 65 | 64.2 | high | v1 |
| FP-17 | 日本年出生人口跌破60万 | demographics | 2028-06-30 | 65 | 51.2 | high | v1 |
| FP-18 | 至少一个G7国家宣布技术紧急状态 | cross-domain | 2030-12-31 | 40 | 45.0 | medium | v1 |
| FP-19 | 尼日利亚成世界第三人口大国 | demographics | 2030-07-01 | 60 | 74.0 | medium | v1 |
| FP-20 | 超80%测试AI系统通过标准化图灵测试 | AI | 2030-12-31 | 50 | 40.5 | medium | v1 |
| FP-21 | 人口萎缩国家AI自动化速度2倍于全球均值 | AI | 2028-12-31 | 60 | 84.0 | medium | v1 |
| FP-22 | AI驱动人均用电量在人口萎缩国持续上升 | energy | 2029-06-30 | 55 | 62.8 | medium | v1 |
| FP-23 | AI生成内容超互联网新内容50% | AI | 2030-12-31 | 60 | 62.0 | medium | v1 |
| FP-24 | 韩国TFR回升至1.0 | demographics | 2027-12-31 | 35 | 37.8 | low | v1 |
| FP-25 | 固态电池能量密度超500Wh/kg | energy | 2030-12-31 | 45 | 48.2 | medium | v1 |
| FP-26 | 全球锂供应缺口超20% | energy | 2030-12-31 | 45 | 29.2 | medium | v1 |
| FP-27 | 首个AI系统通过严格定义图灵测试 | AI | 2027-12-31 | 30 | 42.5 | low | v1 |
| FP-28 | 至少3国颁布技术公民身份法 | cross-domain | 2030-12-31 | 55 | 37.8 | medium | v1 |
| FP-29 | 至少一国维持UBI项目3年以上 | cross-domain | 2030-12-31 | 25 | 29.2 | low | v1 |
| FP-30 | 韩国TFR回升停滞或逆转 | demographics | 2029-06-30 | 30 | 47.5 | low | v1 |
| FP-31 | 美国通过UAP披露法案 | space-alien | 2030-12-31 | 50 | 47.5 | medium | v1 |
| FP-32 | NASA对系外行星大气发出"强生物信号"声明 | space | 2028-06-30 | 35 | 45.8 | low | v1 |
| FP-33 | 火星样本中发现古代微生物化石证据 | space-alien | 2028-12-31 | 25 | 29.2 | low | v1 |
| FP-34 | 系外行星大气中检测到生物信号 | space-alien | 2030-06-30 | 50 | 47.5 | medium | v1 |
| FP-35 | 首个被广泛接受的星际访客显示非太阳同位素 | space | 2029-12-31 | 20 | 18.0 | low | v1 |
| FP-36 | 美国正式解密并发布非人类起源UAP影像 | space | 2027-06-30 | 25 | 28.2 | low | v1 |
| FP-37 | 首个私人资助星际探测器发射 | space-economy | 2029-12-31 | 15 | 22.8 | low | v1 |
| FP-38 | 月球南极发现大规模可开采水冰沉积 | space | 2028-12-31 | 65 | 49.2 | high | v1 |
| FP-39 | 首个AI设计合成酶实现工业级PFAS降解 | biotech | 2028-12-31 | 60 | 36.0 | medium | v1 |
| FP-40 | 首个抗衰老药物获FDA批准 | biotech | 2030-12-31 | 45 | 49.2 | medium | v1 |
| FP-41 | 首个AI驱动抗衰老疗法逆转3+衰老标志 | biotech | 2028-12-31 | 45 | 52.2 | medium | v1 |
| FP-42 | 量子计算机达100万逻辑量子比特 | quantum | 2030-12-31 | 50 | 43.5 | medium | v1 |
| FP-43 | 量子计算机实现100万逻辑量子比特里程碑 | quantum | 2030-12-31 | 20 | 41.0 | low | v1 |
| FP-44 | 量子计算在药物发现中实现100倍加速 | quantum | 2029-12-31 | 15 | 33.8 | low | v1 |
| FP-45 | 全球平均温升首次超1.5°C | climate | 2028-01-31 | 70 | 79.5 | high | v1 |
| FP-46 | 全球珊瑚礁首次5级大规模白化 | climate | 2028-12-31 | 50 | 46.5 | medium | v1 |
| FP-47 | 2030年前出现无冰北极夏季 | climate | 2030-10-31 | 50 | 39.5 | medium | v1 |
| FP-48 | 首次轨在轨加注100kg+推进剂 | space-economy | 2028-06-30 | 30 | 47.5 | low | v1 |
| FP-49 | 全球太空旅游市场超10亿美元 | space-economy | 2028-12-31 | 40 | 51.0 | medium | v1 |
| FP-50 | 中国完成月球南极科研站建设 | space | 2030-12-31 | 50 | 39.5 | medium | v1 |
| FP-51 | AI推理成本降至2024年1/100 | AI | 2027-12-31 | 78 | 95.1 | high | v1 |
| FP-52 | 印度人口正式超越中国 | demographics | 2027-06-30 | 75 | 92.8 | high | v1 |
| FP-53 | 全球电池储能部署超500GW | energy | 2028-12-31 | 72 | 66.4 | high | v1 |
| FP-54 | AI编码代理产出50%+新代码 | AI | 2028-06-30 | 72 | 66.4 | high | v1 |
| FP-55 | AI触发G7国家首次国家安全紧急声明 | cross-domain | 2028-12-31 | 72 | 60.4 | high | v1 |
| FP-56 | 主权AI国家项目启动（投资>$100亿） | AI | 2028-06-30 | 71 | 91.0 | high | v1 |
| FP-57 | 首个EU AI法案执法罚款超$5000万 | AI | 2028-06-30 | 68 | 38.6 | high | v1 |
| FP-58 | 全球电池储能累计部署超1TWh | energy | 2029-12-31 | 65 | 64.2 | high | v1 |
| FP-59 | 日本总人口跌破1.2亿 | demographics | 2029-06-30 | 65 | 61.2 | high | v1 |
| FP-60 | AI气候模型触发国际适应-移民协定 | cross-domain | 2029-12-31 | 62 | 52.9 | medium | v1 |
| FP-61 | 首个自主航天器成功偏转小行星轨道 | space | 2028-12-31 | 60 | 44.0 | medium | v1 |
| FP-62 | 个性化mRNA癌症疫苗进入III期临床 | biotech | 2028-12-31 | 58 | 65.1 | medium | v1 |
| FP-63 | 天基太阳能在轨验证 | space-economy | 2029-06-30 | 55 | 52.8 | medium | v1 |
| FP-64 | 量子传感器商业化用于无GPS导航 | quantum | 2029-12-31 | 55 | 57.8 | medium | v1 |
| FP-65 | 大西洋经向翻转环流持续减速 | climate | 2029-06-30 | 52 | 57.4 | medium | v1 |
| FP-66 | AI生成内容占社交媒体30%+ | AI | 2029-06-30 | 50 | 50.5 | medium | v1 |
| FP-67 | CRISPR基因驱动蚊子灭绝项目野外释放 | biotech | 2028-06-30 | 48 | 44.6 | medium | v1 |
| FP-68 | 首个拓扑量子比特实验验证 | quantum | 2029-06-30 | 45 | 47.2 | medium | v1 |
| FP-69 | 首个商业空间站模块独立在轨运行 | space-economy | 2029-12-31 | 42 | 49.9 | medium | v1 |
| FP-70 | 韩国TFR回升逆转 | demographics | 2029-12-31 | 40 | 61.0 | medium | v1 |
| FP-71 | 首个商业浮动海上风电项目上线 | energy | 2029-12-31 | 38 | 45.1 | low | v1 |
| FP-72 | 木卫二热液活动直接观测证据 | space | 2030-06-30 | 38 | 34.1 | low | v1 |
| FP-73 | 国际地球工程治理条约签署 | cross-domain | 2030-06-30 | 38 | 38.1 | low | v1 |
| FP-74 | 合成生物学创造工程生物用于生态恢复 | biotech | 2029-06-30 | 35 | 32.8 | low | v1 |
| FP-75 | 量子互联网协议在城市级网络演示 | quantum | 2029-12-31 | 32 | 42.4 | low | v1 |
| FP-76 | 小行星采矿样本返回确认铂族金属 | space-economy | 2030-06-30 | 28 | 27.6 | low | v1 |
| FP-77 | AI系统通过图灵测试（>70%评判率） | AI | 2028-12-31 | 25 | 38.2 | low | v1 |
| FP-78 | 累计异种移植存活超100例 | biotech | 2029-12-31 | 22 | 29.9 | low | v1 |
| FP-79 | 量子计算机破解实用级加密密钥 | quantum | 2030-06-30 | 18 | 34.1 | low | v1 |
| FP-80 | 南极冰架崩塌加速海平面上升 | climate | 2030-12-31 | 15 | 23.8 | low | v1 |

---

## 按域统计

| 域 | 数量 | high | medium | low |
|---|---|---|---|---|
| AI | 14 | 5 | 6 | 3 |
| demographics | 13 | 6 | 5 | 2 |
| energy | 12 | 3 | 7 | 2 |
| space | 7 | 1 | 3 | 3 |
| biotech | 7 | 0 | 4 | 3 |
| quantum | 7 | 0 | 4 | 3 |
| cross-domain | 6 | 1 | 3 | 2 |
| space-economy | 6 | 0 | 4 | 2 |
| climate | 5 | 1 | 3 | 1 |
| space-alien | 3 | 0 | 2 | 1 |

## 按年份统计

| 年份 | 数量 |
|---|---|
| 2026 | 0 |
| 2027 | 7 |
| 2028 | 23 |
| 2029 | 19 |
| 2030 | 28 |
| 2031 | 3 |

## 字段说明

### 核心字段

| 字段 | 含义 | 来源 |
|---|---|---|
| id | 预测唯一标识（FP-01 ~ FP-80） | 自动生成 |
| title | 英文标题 | LLM 生成 |
| titleZh | 中文标题 | LLM 生成 |
| domain | 所属领域 | 生成时指定 |
| verificationDate | 验证截止日期 | 生成时指定 |
| originalConfidence | 原始置信度（0-100） | LLM 评估 |
| engineScore | 引擎评分（0-100） | v4.0.0 计算 |
| confidenceLevel | 等级（high/medium/low） | 基于 engineScore |
| leadingSignal | 先行信号 | 人工/LLM 混合 |
| causalChainNodes | 因果链步骤 | LLM 生成 |
| causalChainIds | 所属因果链 | 引擎生成 |
| evidence | 证据列表 | LLM 生成 |
| consensusStatus | 共识状态 | 计算得出 |
| currentValue | 当前值 | 动态更新 |
| thresholdValue | 阈值 | 生成时指定 |

### 新增字段（2026-10-16）

| 字段 | 类型 | 含义 | 当前值 |
|---|---|---|---|
| generatedBy | string | 生成者 | "Anna (Agent)" |
| generatedAt | ISO timestamp | 生成时间 | "2026-10-12T12:00:00Z" |
| engineVersion | string | 引擎版本 | "v4.0.0" |
| updatedAt | ISO timestamp \| null | 最后更新时间 | null |
| verdict | object | 验证结果 | 见下方结构 |
| confidenceHistory | array | 置信度变化轨迹 | 见下方结构 |
| evidence[].fetchedAt | ISO timestamp \| null | 证据获取时间 | null |

**verdict 结构：**
```json
{
  "status": "pending",  // pending | confirmed | refuted | partial
  "verifiedAt": null,   // 实际验证日期
  "source": null,       // 验证依据
  "actualValue": null,  // 实际值
  "notes": ""           // 备注
}
```

**confidenceHistory 结构：**
```json
[{
  "ts": "2026-10-12T12:00:00Z",
  "score": 96.9,
  "source": "engine",  // "engine" | "manual"
  "reason": "Initial generation by Anna using prediction-engine v4.0.0"
}]
```

---

## 版本历史

| 批次 | 日期 | 引擎版本 | 数量 | 生成者 | 说明 |
|---|---|---|---|---|---|
| v1 | 2026-10-12 | v4.0.0 | 80 | Anna | MVP 全量预测，含 21 条因果链（后修正为 17 条） |
| schema-v1.1 | 2026-10-16 | v4.0.0 | 80 | - | 新增字段：generatedBy, generatedAt, engineVersion, updatedAt, verdict, confidenceHistory, evidence[].fetchedAt |

---

## 数据源

- 主文件: `public/data/predictions.json`
- 自动生成链: `public/data/causal_chains_auto.json`
- 回测数据: `public/data/backtests.json`
- 验证脚本: `scripts/validate_data.py`
- 因果链引擎: `scripts/generate_causal_chains.py`
