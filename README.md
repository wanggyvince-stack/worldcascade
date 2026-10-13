# WorldCascade

> 80 Predictions. 10 Domains. One Engine. The World, Quantified.

WorldCascade tracks 80 predictions across 10 domains, scored by a transparent, reproducible engine (v4.0.0). Every prediction is verifiable. Every score is computed — not guessed.

- **Official site**: [worldcascade.com](https://worldcascade.com)
- **Methodology**: v4.0.0
- **Backtest performance**: Brier Score 0.096 · Hit rate 97.1% (35 historical backtests)

## Features

- **Hero**: cinematic starfield · quantified overview of the prediction space
- **Causal Chains**: 3 cross-domain narratives showing how AI, energy, population, and technology trigger each other
- **Prediction Hub**: 80 prediction cards with filtering (domain / confidence) and sorting (engine score / verdict date / original confidence)
- **Track Record**: 35 historical backtests with transparent Brier Score

## Tech

Single-file static HTML · no build step · no runtime dependencies · no external CDN.

- Inline CSS · dark cinematic theme
- Inline JavaScript · vanilla ES5-compatible
- Canvas starfield animation with `prefers-reduced-motion` support
- Responsive from 320px to 4K

## Deploy

This site is deployed on **Vercel** from GitHub.

```
GitHub repo:  github.com/<your-org>/worldcascade
Vercel proj:  worldcascade
Domain:       worldcascade.com
```

Push to `main` → Vercel auto-deploys.

## Methodology

Every prediction is scored by a pure-function engine:

1. **Base Score**: baseline calibrated from historical base rate
2. **Evidence Bonus**: quality & quantity of evidence (T1/T2/T3 tiers)
3. **Risk Penalty**: policy dependency · weak causal nodes · contradictions
4. **Leading Signal**: whether the leading indicator has triggered
5. **Threshold Accelerator**: proximity to the verification threshold
6. **Backtest Offset**: domain-specific calibration from 35 backtests

Source code of the engine (v4.0.0): `prediction-engine/` in this monorepo.

## License

Private. © 2026 WorldCascade.
