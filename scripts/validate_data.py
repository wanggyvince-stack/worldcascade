#!/usr/bin/env python3
"""
WorldCascade Data Validation Suite
验证 predictions.json 的数据质量，发现 LLM 生成数据的结构性问题。

用法: python3 validate_data.py [--json predictions.json] [--strict]

验证规则:
  V1: 时间单调性 — 因果链 linkedPredictions 按 verificationDate 排序
  V2: 字段完整性 — 必填字段非空
  V3: 域一致性 — 因果链的 domains 必须在 domainMap 中
  V4: 评分合理性 — engineScore 在 0-100，originalConfidence 在 0-100
  V5: 因果步骤质量 — causalChainNodes 非占位符，有实质内容
  V6: 因果链覆盖 — 所有 FP 至少出现在一条因果链中（或标记为孤立项）
  V7: 回测数据完整性 — backtests 有 outcome/brier/method
  V8: 证据质量 — evidence 有 name/institution/url，url 格式合法
  V9: leadingSignal 完整性 — 有 status/indicator/source
  V10: 预测 ID 连续性 — FP-01 到 FP-80 无缺失无重复
"""

import json
import sys
import os
import re
from datetime import datetime
from typing import List, Dict, Tuple, Any
from collections import Counter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
DEFAULT_DATA = os.path.join(PROJECT_ROOT, 'public/data/predictions.json')
DEFAULT_BACKTESTS = os.path.join(PROJECT_ROOT, 'public/data/backtests.json')

# Placeholder patterns that indicate incomplete data
PLACEHOLDER_PATTERNS = [
    r'\[domain\]',
    r'\[placeholder\]',
    r'\[todo\]',
    r'\[TBD\]',
    r'placeholder',
    r'^test\s',
    r'^TODO',
    r'^FIXME',
    r'lorem ipsum',
]


class ValidationResult:
    def __init__(self):
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.info: List[str] = []
    
    def error(self, rule: str, msg: str):
        self.errors.append(f"[{rule}] {msg}")
    
    def warn(self, rule: str, msg: str):
        self.warnings.append(f"[{rule}] {msg}")
    
    def add_info(self, rule: str, msg: str):
        self.info.append(f"[{rule}] {msg}")
    
    @property
    def passed(self) -> bool:
        return len(self.errors) == 0
    
    def summary(self) -> str:
        lines = []
        lines.append("=" * 60)
        lines.append("WorldCascade Data Validation Report")
        lines.append(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")
        lines.append("=" * 60)
        
        if self.errors:
            lines.append(f"\n🔴 ERRORS: {len(self.errors)}")
            for e in self.errors:
                lines.append(f"  ✗ {e}")
        
        if self.warnings:
            lines.append(f"\n🟡 WARNINGS: {len(self.warnings)}")
            for w in self.warnings:
                lines.append(f"  ⚠ {w}")
        
        if self.info:
            lines.append(f"\nℹ️  INFO: {len(self.info)}")
            for i in self.info:
                lines.append(f"  • {i}")
        
        lines.append("\n" + "=" * 60)
        if self.passed:
            lines.append("✅ VALIDATION PASSED — data is deployable")
        else:
            lines.append(f"❌ VALIDATION FAILED — {len(self.errors)} error(s) must be fixed")
        lines.append("=" * 60)
        
        return "\n".join(lines)


def validate_predictions_json(data: dict, result: ValidationResult):
    """Main validation entry point."""
    
    # Basic structure
    if 'metadata' not in data:
        result.error('STRUCTURE', 'Missing "metadata" field')
        return
    if 'predictions' not in data:
        result.error('STRUCTURE', 'Missing "predictions" field')
        return
    if 'causalChains' not in data:
        result.error('STRUCTURE', 'Missing "causalChains" field')
        return
    if 'domainMap' not in data:
        result.error('STRUCTURE', 'Missing "domainMap" field')
        return
    
    predictions = data['predictions']
    chains = data['causalChains']
    domain_map = data['domainMap']
    valid_domains = set(domain_map.keys())
    
    # Build FP date map
    fp_dates: Dict[str, str] = {}
    for p in predictions:
        fp_dates[p['id']] = p.get('verificationDate', '9999-99-99')
    
    # ── V1: 时间单调性 ─────────────────────────────────────────────
    print("Running V1: 时间单调性...")
    for chain in chains:
        linked = chain.get('linkedPredictions', [])
        if len(linked) < 2:
            continue
        for i in range(len(linked) - 1):
            date_a = fp_dates.get(linked[i], '9999-99-99')
            date_b = fp_dates.get(linked[i+1], '9999-99-99')
            if date_a > date_b:
                result.error('V1', 
                    f"{chain['id']}: {linked[i]}({date_a}) > {linked[i+1]}({date_b}) — 时间回流")
    
    # ── V2: 字段完整性 ─────────────────────────────────────────────
    print("Running V2: 字段完整性...")
    required_fp_fields = [
        'id', 'title', 'domain', 'verificationDate',
        'engineScore', 'originalConfidence', 'predictionContent',
        'verificationCriteria', 'causalChainNodes', 'leadingSignal',
        'evidence'
    ]
    for p in predictions:
        pid = p.get('id', 'UNKNOWN')
        for field in required_fp_fields:
            if field not in p:
                result.error('V2', f"{pid}: missing field '{field}'")
            elif p[field] is None:
                result.error('V2', f"{pid}: field '{field}' is null")
            elif isinstance(p[field], str) and p[field].strip() == '':
                result.error('V2', f"{pid}: field '{field}' is empty string")
    
    # ── V3: 域一致性 ─────────────────────────────────────────────
    print("Running V3: 域一致性...")
    for p in predictions:
        pid = p.get('id', 'UNKNOWN')
        domain = p.get('domain', '')
        if domain not in valid_domains:
            result.error('V3', f"{pid}: domain '{domain}' not in domainMap")
    
    for chain in chains:
        cid = chain.get('id', 'UNKNOWN')
        for domain in chain.get('domains', []):
            if domain not in valid_domains:
                result.error('V3', f"{cid}: domain '{domain}' not in domainMap")
    
    # ── V4: 评分合理性 ─────────────────────────────────────────────
    print("Running V4: 评分合理性...")
    for p in predictions:
        pid = p.get('id', 'UNKNOWN')
        score = p.get('engineScore')
        conf = p.get('originalConfidence')
        
        if score is not None and (score < 0 or score > 100):
            result.error('V4', f"{pid}: engineScore={score} out of range [0,100]")
        if conf is not None and (conf < 0 or conf > 100):
            result.error('V4', f"{pid}: originalConfidence={conf} out of range [0,100]")
        
        # Bias check: large divergence between engine and original
        if score is not None and conf is not None:
            bias = score - conf
            if abs(bias) > 40:
                result.warn('V4', f"{pid}: large bias ({bias:+.1f}) between engine({score}) and original({conf})")
    
    # ── V5: 因果步骤质量 ─────────────────────────────────────────
    print("Running V5: 因果步骤质量...")
    for p in predictions:
        pid = p.get('id', 'UNKNOWN')
        nodes = p.get('causalChainNodes', [])
        
        if not nodes:
            result.error('V5', f"{pid}: causalChainNodes is empty")
            continue
        
        for i, node in enumerate(nodes):
            step = node.get('step', '') or node.get('stepEn', '') or ''
            step_zh = node.get('stepZh', '') or ''
            
            # Check placeholder
            for pattern in PLACEHOLDER_PATTERNS:
                if re.search(pattern, step, re.IGNORECASE):
                    result.error('V5', f"{pid} node[{i}]: placeholder detected: '{step[:50]}'")
            
            # Check minimum length
            if len(step) < 5:
                result.warn('V5', f"{pid} node[{i}]: step too short ({len(step)} chars): '{step}'")
            
            # Check evidence_strength
            strength = node.get('evidence_strength', '')
            if strength not in ('HIGH', 'MEDIUM', 'LOW'):
                result.warn('V5', f"{pid} node[{i}]: invalid evidence_strength '{strength}'")
    
    # ── V6: 因果链覆盖 ─────────────────────────────────────────
    print("Running V6: 因果链覆盖...")
    fp_in_chains = set()
    for chain in chains:
        for fp_id in chain.get('linkedPredictions', []):
            fp_in_chains.add(fp_id)
    
    all_fp_ids = {p['id'] for p in predictions}
    orphaned = all_fp_ids - fp_in_chains
    if orphaned:
        result.add_info('V6', f"{len(orphaned)} FPs not in any causal chain (expected for independent events): {sorted(orphaned)}")
    else:
        result.add_info('V6', "All FPs appear in at least one causal chain")
    
    # Check for invalid FP references in chains
    for chain in chains:
        cid = chain.get('id', 'UNKNOWN')
        for fp_id in chain.get('linkedPredictions', []):
            if fp_id not in all_fp_ids:
                result.error('V6', f"{cid}: references non-existent FP '{fp_id}'")
    
    # ── V7: 因果链自身字段 ─────────────────────────────────────
    print("Running V7: 因果链字段完整性...")
    required_chain_fields = ['id', 'title', 'titleEn', 'type', 'domains', 'linkedPredictions', 'nodes']
    for chain in chains:
        cid = chain.get('id', 'UNKNOWN')
        for field in required_chain_fields:
            if field not in chain:
                result.error('V7', f"{cid}: missing field '{field}'")
        
        # Chain nodes should have content
        nodes = chain.get('nodes', [])
        if not nodes:
            result.warn('V7', f"{cid}: nodes is empty")
        for i, node in enumerate(nodes):
            step = node.get('step', '')
            if len(step) < 3:
                result.warn('V7', f"{cid} node[{i}]: step too short")
    
    # ── V8: 证据质量 ─────────────────────────────────────────
    print("Running V8: 证据质量...")
    url_pattern = re.compile(r'^https?://')
    for p in predictions:
        pid = p.get('id', 'UNKNOWN')
        evidence = p.get('evidence', [])
        
        if not evidence:
            result.warn('V8', f"{pid}: no evidence items")
            continue
        
        for i, ev in enumerate(evidence):
            if not ev.get('name'):
                result.error('V8', f"{pid} evidence[{i}]: missing 'name'")
            if not ev.get('institution'):
                result.error('V8', f"{pid} evidence[{i}]: missing 'institution'")
            url = ev.get('url', '')
            if not url:
                result.warn('V8', f"{pid} evidence[{i}]: missing 'url'")
            elif not url_pattern.match(url):
                result.error('V8', f"{pid} evidence[{i}]: invalid URL format '{url}'")
    
    # ── V9: leadingSignal 完整性 ─────────────────────────────
    print("Running V9: leadingSignal 完整性...")
    valid_statuses = {'triggered', 'accelerating', 'trending', 'early_signal', 'monitoring', 
                      'stable', 'declining'}
    for p in predictions:
        pid = p.get('id', 'UNKNOWN')
        ls = p.get('leadingSignal', {})
        
        if not ls:
            result.error('V9', f"{pid}: missing leadingSignal")
            continue
        
        status = ls.get('status', '')
        if status not in valid_statuses:
            result.error('V9', f"{pid}: invalid status '{status}'")
        
        if not ls.get('indicator'):
            result.error('V9', f"{pid}: missing indicator")
        if not ls.get('source'):
            result.error('V9', f"{pid}: missing source")
    
    # ── V10: 预测 ID 连续性 ─────────────────────────────────
    print("Running V10: 预测 ID 连续性...")
    expected_ids = {f"FP-{i:02d}" for i in range(1, 81)}
    actual_ids = {p['id'] for p in predictions}
    
    missing = expected_ids - actual_ids
    extra = actual_ids - expected_ids
    
    if missing:
        result.error('V10', f"Missing FP IDs: {sorted(missing)}")
    if extra:
        result.warn('V10', f"Unexpected FP IDs: {sorted(extra)}")
    
    # Check for duplicates
    id_counts = Counter(p['id'] for p in predictions)
    duplicates = {k: v for k, v in id_counts.items() if v > 1}
    if duplicates:
        result.error('V10', f"Duplicate IDs: {duplicates}")
    
    if not missing and not extra and not duplicates:
        result.add_info('V10', "FP-01 to FP-80: all present, no duplicates")
    
    # ── V11: 元数据一致性 ─────────────────────────────────────
    print("Running V11: 元数据一致性...")
    meta = data.get('metadata', {})
    
    if meta.get('total') != len(predictions):
        result.error('V11', f"metadata.total={meta.get('total')} but actual={len(predictions)}")
    
    if meta.get('chainCount') != len(chains):
        result.error('V11', f"metadata.chainCount={meta.get('chainCount')} but actual={len(chains)}")
    
    if meta.get('domainCount') != len(domain_map):
        result.error('V11', f"metadata.domainCount={meta.get('domainCount')} but actual={len(domain_map)}")


def validate_backtests_json(data: dict, result: ValidationResult):
    """Validate backtests.json."""
    print("Running V12: 回测数据完整性...")
    
    backtests = data.get('backtests', [])
    if not backtests:
        result.error('V12', "No backtests found")
        return
    
    for bt in backtests:
        btid = bt.get('id', 'UNKNOWN')
        
        if not bt.get('title'):
            result.error('V12', f"{btid}: missing title")
        if not bt.get('domain'):
            result.error('V12', f"{btid}: missing domain")
        if not bt.get('outcome'):
            result.error('V12', f"{btid}: missing outcome")
        if bt.get('outcome') not in ('correct', 'incorrect', 'inconclusive'):
            result.error('V12', f"{btid}: invalid outcome '{bt.get('outcome')}'")
        
        brier = bt.get('brier')
        if brier is not None and (brier < 0 or brier > 1):
            result.error('V12', f"{btid}: brier={brier} out of range [0,1]")
        
        if not bt.get('method'):
            result.warn('V12', f"{btid}: missing verification method")


def main():
    import argparse
    parser = argparse.ArgumentParser(description='WorldCascade Data Validation')
    parser.add_argument('--json', default=DEFAULT_DATA, help='Path to predictions.json')
    parser.add_argument('--backtests', default=DEFAULT_BACKTESTS, help='Path to backtests.json')
    parser.add_argument('--strict', action='store_true', help='Treat warnings as errors')
    args = parser.parse_args()
    
    result = ValidationResult()
    
    # Load predictions.json
    print(f"Loading {args.json}...")
    if not os.path.exists(args.json):
        print(f"ERROR: File not found: {args.json}")
        sys.exit(1)
    
    with open(args.json, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"Loaded: {len(data.get('predictions', []))} predictions, {len(data.get('causalChains', []))} chains")
    print()
    
    # Run validations
    validate_predictions_json(data, result)
    
    # Load and validate backtests
    if os.path.exists(args.backtests):
        print(f"\nLoading {args.backtests}...")
        with open(args.backtests, 'r', encoding='utf-8') as f:
            bt_data = json.load(f)
        validate_backtests_json(bt_data, result)
    else:
        result.warn('V12', f"Backtests file not found: {args.backtests}")
    
    # Print results
    print()
    print(result.summary())
    
    # Exit code
    if args.strict:
        sys.exit(0 if (len(result.errors) == 0 and len(result.warnings) == 0) else 1)
    else:
        sys.exit(0 if result.passed else 1)


if __name__ == '__main__':
    main()
