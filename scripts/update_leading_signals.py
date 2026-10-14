#!/usr/bin/env python3
"""
WorldCascade — Leading Signal Update Script
Updates leading signal values, calculates status transitions,
and recalculates prediction scores using v4.0.0 engine.

Usage:
    python3 update_leading_signals.py [--demo] [--predictions PATH] [--output PATH]
"""

import json
import os
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional

# ── Configuration ──────────────────────────────────────────────────────────

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Project root is 2 levels up from scripts/ (worldcascade/scripts → project root)
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
DEFAULT_PREDICTIONS = os.path.join(PROJECT_ROOT, 'public/data/predictions.json')
DEFAULT_OUTPUT = DEFAULT_PREDICTIONS

# ── Signal Status State Machine ────────────────────────────────────────────

STATUS_ORDER = ['monitoring', 'early_signal', 'trending', 'accelerating', 'triggered']

STATUS_MULTIPLIER = {
    'triggered': 1.0,
    'accelerating': 0.7,
    'trending': 0.4,
    'early_signal': 0.15,
    'monitoring': 0.0,
}

def calc_rate(values: List[float]) -> float:
    """Calculate average rate of change per period."""
    if len(values) < 2:
        return 0.0
    changes = [values[i] - values[i-1] for i in range(1, len(values))]
    return sum(changes) / len(changes)

def calculate_status(
    current_value: float,
    threshold_value: float,
    history: List[float],
    previous_status: str = 'monitoring'
) -> str:
    """
    Determine signal status based on current value, threshold, and history.
    
    Args:
        current_value: Latest indicator value
        threshold_value: Target threshold
        history: List of historical values (oldest first, at least 4 entries)
        previous_status: Previous status for hysteresis
    
    Returns:
        New status string
    """
    # Already triggered
    if current_value >= threshold_value:
        return 'triggered'
    
    gap = threshold_value - current_value
    gap_pct = gap / abs(threshold_value) if threshold_value != 0 else 1.0
    
    # Calculate rates
    recent_rate = calc_rate(history[-4:]) if len(history) >= 4 else 0.0
    prior_rate = calc_rate(history[-8:-4]) if len(history) >= 8 else recent_rate * 0.5
    
    # Determine status
    if gap_pct <= 0.5 and recent_rate > prior_rate * 1.5:
        return 'accelerating'
    elif gap_pct <= 0.75 or (recent_rate > 0 and len(history) >= 8):
        return 'trending'
    elif recent_rate > 0:
        return 'early_signal'
    else:
        return 'monitoring'

# ── v4.0.0 Engine Components ──────────────────────────────────────────────

def calc_leading_signal_bonus(status: str, base_score: float) -> float:
    """Calculate leading_signal component of v4.0.0 engine."""
    multiplier = STATUS_MULTIPLIER.get(status, 0.0)
    base_weight = base_score * 0.15  # 15% of base score as signal weight
    return round(multiplier * base_weight, 1)

def calc_threshold_accel(
    current_value: float,
    threshold_value: float,
    recent_rate: float,
    prior_rate: float
) -> float:
    """Calculate threshold_accel component of v4.0.0 engine."""
    if threshold_value == 0 or prior_rate == 0:
        return 0.0
    
    gap = threshold_value - current_value
    gap_pct = gap / abs(threshold_value)
    proximity_weight = 1.0 - gap_pct
    
    acceleration_factor = min(recent_rate / prior_rate, 3.0) if prior_rate > 0 else 1.0
    
    return round(acceleration_factor * proximity_weight * 5.0, 1)  # Scaled by 5

def recalculate_score(
    base_score: float,
    evidence_bonus: float,
    risk_penalty: float,
    status: str,
    current_value: float,
    threshold_value: float,
    recent_rate: float,
    prior_rate: float,
    backtest_offset: float = 0.0
) -> Dict:
    """
    Full v4.0.0 score recalculation.
    Only leading_signal and threshold_accel change during updates.
    """
    leading_bonus = calc_leading_signal_bonus(status, base_score)
    threshold_accel = calc_threshold_accel(current_value, threshold_value, recent_rate, prior_rate)
    
    final = base_score + min(evidence_bonus, 15) - risk_penalty + leading_bonus + threshold_accel + backtest_offset
    final = max(0, min(100, round(final, 1)))
    
    return {
        'score': final,
        'leading_signal_bonus': leading_bonus,
        'threshold_accel_bonus': threshold_accel,
    }

# ── Demo Data ──────────────────────────────────────────────────────────────

DEMO_PREDICTIONS = {
    'FP-01': {
        'indicator_numeric': True,
        'current': 32.5,
        'threshold': 50.0,
        'unit': '%',
        'history': [28.0, 29.2, 30.1, 30.8, 31.2, 31.7, 32.1, 32.5],
        'source': 'IEA World Energy Stats',
    },
    'FP-04': {
        'indicator_numeric': True,
        'current': 4,  # benchmarks exceeded
        'threshold': 8,  # "all human benchmarks"
        'unit': 'benchmarks',
        'history': [1, 1, 2, 2, 2, 3, 3, 4],
        'source': 'MMLU / ARC-AGI / HumanEval composite',
    },
    'FP-11': {
        'indicator_numeric': True,
        'current': 1.20,
        'threshold': 1.10,
        'unit': 'TFR',
        'history': [1.34, 1.33, 1.31, 1.30, 1.28, 1.25, 1.22, 1.20],
        'source': 'Japan MHLW vital statistics',
        'inverted': True,  # Lower is closer to threshold
    },
    'FP-17': {
        'indicator_numeric': True,
        'current': 604000,
        'threshold': 600000,
        'unit': 'births/year',
        'history': [728000, 705000, 690000, 672000, 655000, 638000, 620000, 604000],
        'source': 'Japan MHLW monthly vital statistics',
        'inverted': True,
    },
    'FP-45': {
        'indicator_numeric': True,
        'current': 1.42,
        'threshold': 1.50,
        'unit': '°C above pre-industrial',
        'history': [1.28, 1.30, 1.32, 1.35, 1.37, 1.39, 1.41, 1.42],
        'source': 'WMO/NASA/NOAA monthly update',
    },
    'FP-47': {
        'indicator_numeric': True,
        'current': 4.2,
        'threshold': 1.0,
        'unit': 'million km² Sept minimum',
        'history': [4.7, 4.6, 4.5, 4.5, 4.4, 4.3, 4.3, 4.2],
        'source': 'NSIDC Sea Ice Index',
        'inverted': True,
    },
    'FP-51': {
        'indicator_numeric': True,
        'current': 0.25,
        'threshold': 0.30,
        'unit': '$/M input tokens',
        'history': [1.0, 0.75, 0.50, 0.40, 0.35, 0.30, 0.28, 0.25],
        'source': 'OpenAI/Anthropic API pricing pages',
        'inverted': True,
    },
    'FP-42': {
        'indicator_numeric': True,
        'current': 56,
        'threshold': 1000,
        'unit': 'logical qubits',
        'history': [20, 24, 28, 32, 38, 44, 50, 56],
        'source': 'IBM/Google/IonQ official announcements',
    },
}

def simulate_weekly_change(demo_data: Dict, week: int) -> Dict:
    """Simulate a weekly indicator value change."""
    import random
    random.seed(week * 42)  # Deterministic for reproducibility
    
    for pid, data in demo_data.items():
        current = data['current']
        threshold = data['threshold']
        inverted = data.get('inverted', False)
        
        # Calculate movement toward threshold
        gap = abs(threshold - current)
        
        if inverted:
            # Moving toward lower threshold
            movement = gap * random.uniform(0.02, 0.08) * (1 + week * 0.1)
            new_value = current - movement
        else:
            # Moving toward higher threshold
            movement = gap * random.uniform(0.02, 0.08) * (1 + week * 0.1)
            new_value = current + movement
        
        data['history'].append(new_value)
        data['current'] = new_value
    
    return demo_data

# ── Main Update Logic ──────────────────────────────────────────────────────

def update_predictions(
    predictions_path: str,
    demo_data: Dict,
    output_path: str,
    week_label: str = None
) -> Dict:
    """
    Update predictions.json with new signal values, statuses, and scores.
    """
    with open(predictions_path) as f:
        data = json.load(f)
    
    now = datetime.utcnow()
    next_update = now + timedelta(days=7)
    # Round to next Tuesday 02:00 UTC
    days_until_tuesday = (2 - now.weekday()) % 7
    if days_until_tuesday == 0 and now.hour >= 2:
        days_until_tuesday = 7
    next_tuesday = now + timedelta(days=days_until_tuesday)
    next_tuesday = next_tuesday.replace(hour=2, minute=0, second=0, microsecond=0)
    
    changes = []
    
    for pred in data['predictions']:
        pid = pred['id']
        if pid not in demo_data:
            continue
        
        demo = demo_data[pid]
        ls = pred.get('leadingSignal', {})
        
        old_status = ls.get('status', 'monitoring')
        old_score = pred.get('engineScore', pred.get('score', 50))
        old_value = ls.get('currentValue', 'N/A')
        
        # Calculate new status
        new_status = calculate_status(
            demo['current'],
            demo['threshold'],
            demo['history'],
            old_status
        )
        
        # Format new value
        if demo['unit'] in ['%', '°C above pre-industrial']:
            new_value_str = f"{demo['current']:.1f}{demo['unit']}" if demo['unit'] == '%' else f"+{demo['current']:.2f}°C"
        elif demo['unit'] == 'births/year':
            new_value_str = f"{int(demo['current']):,}"
        elif demo['unit'] == '$/M input tokens':
            new_value_str = f"${demo['current']:.2f}"
        else:
            new_value_str = f"{demo['current']:.1f}"
        
        # Calculate rate for threshold_accel
        recent_rate = calc_rate(demo['history'][-4:])
        prior_rate = calc_rate(demo['history'][-8:-4]) if len(demo['history']) >= 8 else recent_rate * 0.5
        
        # Recalculate score
        base_score = pred.get('baseScore', old_score * 0.85)
        evidence_bonus = pred.get('evidenceBonus', 5)
        risk_penalty = pred.get('riskPenalty', 2)
        backtest_offset = pred.get('backtestOffset', 0)
        
        new_score_result = recalculate_score(
            base_score, evidence_bonus, risk_penalty,
            new_status, demo['current'], demo['threshold'],
            recent_rate, prior_rate, backtest_offset
        )
        new_score = new_score_result['score']
        
        # Calculate change
        value_change = demo['current'] - (demo['history'][-2] if len(demo['history']) >= 2 else demo['current'])
        if demo['unit'] == '%':
            change_str = f"+{value_change:.1f}pp" if value_change > 0 else f"{value_change:.1f}pp"
        else:
            pct = (value_change / demo['history'][-2] * 100) if len(demo['history']) >= 2 and demo['history'][-2] != 0 else 0
            change_str = f"{pct:+.1f}%"
        
        # Update prediction entry
        pred['leadingSignal'] = {
            'indicator': ls.get('indicator', demo.get('source', '')),
            'currentValue': new_value_str,
            'thresholdValue': ls.get('thresholdValue', f"≥{demo['threshold']}"),
            'status': new_status,
            'source': ls.get('source', demo.get('source', '')),
            'lastUpdated': now.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'nextScheduledUpdate': next_tuesday.strftime('%Y-%m-%dT%H:%M:%SZ'),
        }
        pred['engineScore'] = new_score
        
        # Add to update history
        if 'updateHistory' not in pred:
            pred['updateHistory'] = []
        pred['updateHistory'].append({
            'date': now.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'week': week_label,
            'change': change_str,
            'oldStatus': old_status,
            'newStatus': new_status,
            'oldScore': old_score,
            'newScore': new_score,
            'oldValue': old_value,
            'newValue': new_value_str,
        })
        
        # Record change
        status_changed = old_status != new_status
        changes.append({
            'id': pid,
            'title': pred.get('title', ''),
            'old_status': old_status,
            'new_status': new_status,
            'status_changed': status_changed,
            'old_score': old_score,
            'new_score': new_score,
            'score_delta': new_score - old_score,
            'value_change': change_str,
            'new_value': new_value_str,
        })
    
    # Write updated predictions
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    return {'changes': changes, 'timestamp': now.isoformat()}

# ── Demo Runner ────────────────────────────────────────────────────────────

def run_demo():
    """Run 4-week demo simulation for 8 predictions."""
    
    predictions_path = os.path.join(PROJECT_ROOT, 'public/data/predictions.json')
    output_path = predictions_path
    demo_report_path = os.path.join(PROJECT_ROOT, 'worldcascade/docs/demo_evolution_report.md')
    
    if not os.path.exists(predictions_path):
        print(f"❌ predictions.json not found at {predictions_path}")
        sys.exit(1)
    
    print("=" * 60)
    print("WorldCascade — Leading Signal Update Demo")
    print("=" * 60)
    
    # Initialize demo data
    demo_data = {k: dict(v) for k, v in DEMO_PREDICTIONS.items()}
    
    # Track all changes across weeks
    all_week_changes = []
    
    for week in range(4):
        week_label = f"Week {week + 1}"
        print(f"\n📅 {week_label} — Simulating indicator updates...")
        
        # Simulate weekly change
        demo_data = simulate_weekly_change(demo_data, week)
        
        # Calculate statuses and update predictions
        result = update_predictions(predictions_path, demo_data, output_path, week_label)
        
        all_week_changes.append({
            'week': week_label,
            'changes': result['changes'],
        })
        
        # Print changes
        for c in result['changes']:
            status_arrow = "→" if not c['status_changed'] else f"⇒ [{c['old_status']} → {c['new_status']}]"
            print(f"  {c['id']}: {c['new_value']:>12} | Score: {c['old_score']} → {c['new_score']} ({c['score_delta']:+.1f}) | {status_arrow}")
    
    # Generate demo report
    generate_demo_report(all_week_changes, demo_data, demo_report_path)
    
    print(f"\n✅ Demo complete!")
    print(f"   Report: {demo_report_path}")
    print(f"   Updated: {output_path}")

def generate_demo_report(all_week_changes: List, demo_data: Dict, report_path: str):
    """Generate markdown demo report."""
    
    lines = [
        "# WorldCascade — Leading Signal Evolution Demo Report",
        "",
        "**Generated**: 2026-10-14",
        "**Scope**: 8 predictions, 4 weekly simulation cycles",
        "**Engine**: v4.0.0",
        "",
        "---",
        "",
        "## Executive Summary",
        "",
        "This demo simulates 4 weeks of leading signal updates for 8 representative predictions.",
        "Each week, indicator values are updated, signal statuses are recalculated via the state machine,",
        "and prediction scores are re-derived using the v4.0.0 engine.",
        "",
        "### Status Transition Summary",
        "",
    ]
    
    # Collect all status transitions
    transitions = {}
    for week_data in all_week_changes:
        for change in week_data['changes']:
            pid = change['id']
            if pid not in transitions:
                transitions[pid] = {
                    'title': change['title'],
                    'statuses': [change.get('old_status', 'monitoring')],
                    'scores': [change.get('old_score', 0)],
                }
            transitions[pid]['statuses'].append(change['new_status'])
            transitions[pid]['scores'].append(change['new_score'])
    
    lines.append("| Prediction | Week 0 | Week 1 | Week 2 | Week 3 | Week 4 | Total Δ Score |")
    lines.append("|-----------|--------|--------|--------|--------|--------|---------------|")
    
    for pid, info in transitions.items():
        statuses = info['statuses']
        scores = info['scores']
        delta = scores[-1] - scores[0]
        status_cells = " → ".join([s[:4] for s in statuses])
        lines.append(f"| {pid} | {' → '.join(str(s) for s in statuses[:1])} | {' → '.join(str(s) for s in statuses[1:2])} | {' → '.join(str(s) for s in statuses[2:3])} | {' → '.join(str(s) for s in statuses[3:4])} | {' → '.join(str(s) for s in statuses[4:])} | {delta:+.1f} |")
    
    lines.extend([
        "",
        "---",
        "",
        "## Week-by-Week Detail",
        "",
    ])
    
    for week_data in all_week_changes:
        lines.extend([
            f"### {week_data['week']}",
            "",
            "| ID | New Value | Score Change | Status Transition |",
            "|----|-----------|-------------|-------------------|",
        ])
        for change in week_data['changes']:
            status_col = f"{change['old_status']} → **{change['new_status']}**" if change['status_changed'] else f"{change['new_status']} (unchanged)"
            lines.append(f"| {change['id']} | {change['new_value']} | {change['old_score']} → {change['new_score']} ({change['score_delta']:+.1f}) | {status_col} |")
        lines.append("")
    
    lines.extend([
        "---",
        "",
        "## Signal Status Definitions",
        "",
        "| Status | Meaning | Score Impact |",
        "|--------|---------|-------------|",
        "| `monitoring` | Indicator exists but no clear movement | 0 bonus |",
        "| `early_signal` | >5% movement toward threshold in 4 weeks | +15% base weight |",
        "| `trending` | >10% movement OR >25% gap closed | +40% base weight |",
        "| `accelerating` | Rate increases >50% OR >50% gap closed | +70% base weight |",
        "| `triggered` | Threshold reached or exceeded | +100% base weight |",
        "",
        "## v4.0.0 Engine Formula",
        "",
        "```",
        "final_score = base_score",
        "            + min(evidence_bonus, 15)",
        "            - risk_penalty",
        "            + leading_signal_bonus    ← affected by status",
        "            + threshold_accel_bonus   ← affected by rate of change",
        "            + backtest_offset",
        "```",
        "",
        "---",
        "",
        "*Report generated by `update_leading_signals.py --demo`*",
    ])
    
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, 'w') as f:
        f.write('\n'.join(lines))

# ── Entry Point ────────────────────────────────────────────────────────────

if __name__ == '__main__':
    if '--demo' in sys.argv:
        run_demo()
    else:
        print("Usage: python3 update_leading_signals.py --demo")
        print("  --demo    Run 4-week simulation for 8 predictions")
