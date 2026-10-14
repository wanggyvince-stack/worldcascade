# WorldCascade — Leading Signal Update Mechanism

**Version**: 1.0  
**Date**: 2026-10-14  
**Author**: Anna (Code Review Agent)  
**Status**: P0 — Demo This Week

---

## 1. Overview

WorldCascade predictions are not static. Each prediction has a **leading signal** — a measurable indicator that, when it crosses a threshold, suggests the prediction is accelerating toward realization.

This document describes the automated mechanism for:
1. **Collecting** the latest indicator values weekly
2. **Classifying** signal status via a 5-state machine
3. **Recalculating** prediction scores using the v4.0.0 engine
4. **Recording** change history for user transparency

## 2. Data Architecture

### 2.1 New Fields in `predictions.json`

```json
{
  "id": "FP-01",
  "leadingSignal": {
    "indicator": "Global renewable energy power generation share",
    "currentValue": "32.5%",
    "thresholdValue": "≥50%",
    "status": "trending",
    "source": "IEA World Energy Stats",
    "lastUpdated": "2026-10-14T02:00:00Z",
    "nextScheduledUpdate": "2026-10-21T02:00:00Z",
    "updateHistory": [
      {
        "date": "2026-10-07T02:00:00Z",
        "change": "+0.8pp",
        "oldStatus": "early_signal",
        "newStatus": "trending",
        "newScore": 74,
        "oldScore": 72,
        "newValue": "32.5%",
        "oldValue": "31.7%"
      }
    ]
  }
}
```

### 2.2 Update Schedule

| Parameter | Value |
|-----------|-------|
| Update frequency | Weekly (every Tuesday 02:00 UTC) |
| Data window | Previous 7 days |
| Publication delay | ~30 min after collection (verification) |
| User-facing display | "Next update: Tuesday, Oct 21 02:00 UTC" |

## 3. Signal Status State Machine

### 3.1 Five States

```
monitoring → early_signal → trending → accelerating → triggered
```

### 3.2 Transition Rules

| From | To | Condition |
|------|----|-----------|
| `monitoring` | `early_signal` | Indicator moves >5% toward threshold in 4 weeks |
| `early_signal` | `trending` | Indicator moves >10% toward threshold in 8 weeks, OR crosses 25% of gap to threshold |
| `trending` | `accelerating` | Rate of change increases >50% vs prior 8-week rate, OR crosses 50% of gap |
| `accelerating` | `triggered` | Indicator reaches or exceeds threshold value |
| Any | `monitoring` | Indicator reverses >15% away from threshold (reset) |

### 3.3 Status Calculation Algorithm

```python
def calculate_status(indicator, threshold, history):
    """
    indicator: current value (numeric)
    threshold: threshold value (numeric)  
    history: list of {date, value} tuples (at least 4 weeks)
    """
    gap = threshold - indicator
    gap_pct = gap / threshold  # % remaining to threshold
    
    # Calculate rate of change (last 4 weeks vs prior 4 weeks)
    recent_rate = calc_rate(history[-4:])
    prior_rate = calc_rate(history[-8:-4]) if len(history) >= 8 else 0
    
    if indicator >= threshold:
        return "triggered"
    elif gap_pct <= 0.5 and recent_rate > prior_rate * 1.5:
        return "accelerating"
    elif gap_pct <= 0.75 or (recent_rate > 0 and len(history) >= 8):
        return "trending"
    elif recent_rate > 0:
        return "early_signal"
    else:
        return "monitoring"
```

## 4. Score Recalculation (v4.0.0 Engine)

When a signal status changes, two components of the v4.0.0 scoring engine are affected:

### 4.1 `leading_signal` Component

```
leading_signal_bonus = status_multiplier * base_weight
```

| Status | Multiplier |
|--------|-----------|
| `triggered` | 1.0 |
| `accelerating` | 0.7 |
| `trending` | 0.4 |
| `early_signal` | 0.15 |
| `monitoring` | 0.0 |

### 4.2 `threshold_accel` Component

```
threshold_accel_bonus = acceleration_factor * proximity_weight
```

Where:
- `acceleration_factor` = recent_rate / prior_rate (capped at 3.0)
- `proximity_weight` = 1 - (gap_pct) (closer to threshold = higher weight)

### 4.3 Full Score Formula (Reminder)

```
final_score = base_score 
            + min(evidence_bonus, 15) 
            - risk_penalty 
            + leading_signal_bonus 
            + threshold_accel_bonus 
            + backtest_offset
```

Only `leading_signal_bonus` and `threshold_accel_bonus` change during weekly updates.

## 5. Data Sources

### 5.1 Indicator Data Sources by Domain

| Domain | Example Indicators | Data Source | Update Frequency |
|--------|-------------------|-------------|-----------------|
| AI | MMLU benchmark score | Official MMLU leaderboard | Monthly |
| AI | API pricing | Provider pricing pages | Weekly |
| Energy | Renewable energy share | IEA World Energy Stats | Quarterly |
| Energy | EV fleet size | IEA/BNEF EV Outlook | Quarterly |
| Demographics | TFR | UN World Population Prospects | Annual |
| Demographics | Birth count | National statistics bureaus | Monthly/Quarterly |
| Climate | Global temperature anomaly | NASA/NOAA/WMO | Monthly |
| Climate | Arctic sea ice extent | NSIDC | Daily |
| Biotech | Clinical trial registrations | ClinicalTrials.gov | Weekly |
| Quantum | Logical qubit count | Research papers / vendor announcements | Irregular |
| Space | Mission milestones | NASA/ESA press releases | Irregular |

### 5.2 Collection Strategy

**Phase 1 (Demo)**: Manual data entry for 5-10 indicators
- Pre-populate with latest known values
- Simulate weekly updates for demo

**Phase 2 (Automation)**: Web scraping + API integration
- RSS feeds from IEA, NASA, NOAA, NSIDC
- API calls to ClinicalTrials.gov, MMLU leaderboard
- Web scraping for pricing pages, government statistics

**Phase 3 (Crowdsourced)**: Community verification
- Users can submit indicator updates with sources
- Moderator review process
- Reputation-weighted averaging

## 6. Demo Design

### 6.1 Selected Predictions (8 predictions for demo)

| ID | Prediction | Domain | Current Status | Rationale |
|----|-----------|--------|---------------|-----------|
| FP-01 | Renewables largest electricity source | Energy | trending | Clear data trajectory |
| FP-04 | AI exceeds all human benchmarks | AI | early_signal | Active benchmark progression |
| FP-11 | Japan TFR <1.1 | Demographics | accelerating | Strong demographic trend |
| FP-17 | Japan births <600K | Demographics | triggered | Already nearly there |
| FP-45 | 1.5°C threshold breached | Climate | trending | Measurable monthly data |
| FP-47 | Arctic ice-free summer | Climate | early_signal | Seasonal data available |
| FP-51 | GPT-4 API ≤$0.30/M tokens | AI | triggered | Already achieved |
| FP-42 | 1000+ logical qubits | Quantum | monitoring | Early stage, slow progress |

### 6.2 Simulated Weekly Changes

For each prediction, simulate 4 weekly updates:

```
Week 0 (Oct 14): Baseline values
Week 1 (Oct 21): Small change, status may shift
Week 2 (Oct 28): Moderate change, possible transition
Week 3 (Nov 4): Acceleration or plateau
Week 4 (Nov 11): Convergence toward threshold or reversal
```

### 6.3 Expected Output

The demo produces:
1. `demo_evolution_report.md`: Week-by-week status changes for 8 predictions
2. Updated `predictions.json` with simulated `updateHistory` arrays
3. Score deltas showing how v4.0.0 engine responds to signal changes

## 7. User-Facing Integration

### 7.1 Prediction Detail Page

Each prediction card shows:
```
Leading Signal: Global renewable energy share
Current: 32.5% → Threshold: ≥50%
Status: 🟢 Trending (↑ from Early Signal)
Last updated: Oct 14, 2026 02:00 UTC
Next update: Oct 21, 2026 02:00 UTC

Score History: 72 → 73 → 74 → 74 → 75
```

### 7.2 Change Log Page (Future)

A dedicated page showing all signal updates in chronological order:
```
Oct 14, 2026:
  FP-01: Renewables share 31.7% → 32.5% | Status: early_signal → trending | Score: 72 → 74
  FP-45: Temperature anomaly +0.02°C | Status: trending (unchanged) | Score: 69 → 69
  FP-17: Japan births 608K → 604K | Status: triggered (unchanged) | Score: 86 → 86
```

## 8. Implementation Roadmap

| Phase | Scope | Timeline |
|-------|-------|----------|
| **Phase 1: Demo** | 8 predictions, simulated data | This week |
| **Phase 2: Script** | `update_leading_signals.py` with real data source stubs | Next week |
| **Phase 3: Automation** | Cron job + data collection + auto-publish | Sprint 3 |
| **Phase 4: Full** | All 80 predictions, community verification | Sprint 4+ |

---

**Next step**: Run Phase 1 demo with 8 predictions, generate evolution report.
