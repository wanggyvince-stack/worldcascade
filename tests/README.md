# WorldCascade E2E Tests

Playwright end-to-end test suite for [WorldCascade](https://worldcascade.vercel.app) — a prediction aggregation website tracking 80 forecasts across 10 domains.

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

## First-Time Setup

```bash
# Navigate to the tests directory
cd worldcascade/tests

# Install dependencies
npm install

# Install browser binaries (Chromium, Firefox, WebKit)
npx playwright install
```

## Running Tests

### Run all tests (headless)
```bash
npm test
```

### Run a specific test file
```bash
npm run test:homepage
npm run test:navigation
npm run test:detail
npm run test:mobile
npm run test:performance
```

### Run with browser visible (headed mode)
```bash
npm run test:headed
```

### Run with Playwright UI (interactive debugger)
```bash
npm run test:ui
```

### Run only on Chromium
```bash
npx playwright test --project=chromium
```

### Run with custom base URL
```bash
BASE_URL=http://localhost:3000 npm test
```

## Test Suites

| File | Description | Key Checks |
|------|-------------|------------|
| `homepage.spec.ts` | Homepage rendering | 80 cards, 10 domain filters, card content, hover effects |
| `navigation.spec.ts` | SPA navigation | Card→Detail, Back button, browser back, chain navigation |
| `detail-content.spec.ts` | Data integrity | All 80 predictions have valid data, no Chinese residue, no placeholders |
| `mobile-responsive.spec.ts` | Mobile layout | iPhone 14 viewport, single-column grid, touch interactions |
| `performance.spec.ts` | Performance | LCP < 2.5s, detail transition < 500ms, no console errors |

## Test Projects (Browsers)

Tests run across 5 browser configurations:
- **chromium** — Desktop Chrome
- **firefox** — Desktop Firefox
- **webkit** — Desktop Safari
- **mobile-chrome** — Pixel 5
- **mobile-safari** — iPhone 14

## Viewing Reports

After running tests, view the HTML report:
```bash
npm run test:report
```

## Failure Debugging

- **Screenshots**: Automatically captured on failure → `tests/screenshots/`
- **Traces**: Captured on retry → `test-results/`
- **Videos**: Retained on failure → `test-results/`

Open a trace file:
```bash
npx playwright show-trace test-results/<path-to-trace>/trace.zip
```

## Configuration

Edit `playwright.config.ts` to customize:
- `BASE_URL` — Target URL (default: `https://worldcascade.vercel.app`)
- `timeout` — Global test timeout (default: 60s)
- `retries` — Retry count on failure (default: 0 local, 2 CI)
- `workers` — Parallel workers (default: 1 on CI)

## CI Integration

Example GitHub Actions step:
```yaml
- name: Run Playwright tests
  run: |
    cd worldcascade/tests
    npm ci
    npx playwright install --with-deps chromium
    npx playwright test --project=chromium
```

## Key DOM Selectors Reference

| Element | Selector |
|---------|----------|
| Prediction card | `.p-card[data-id="FP-xx"]` |
| Card title | `.p-title` |
| Domain tag | `.p-domain-tag` |
| Engine score | `.p-score-val` |
| Detail view | `#detail-view` |
| Detail title | `#detail-title` |
| Back to predictions | `.detail-back` |
| Causal chain card | `.chain[data-chain-id="CC-xx"]` |
| Chain detail view | `#chain-detail-view` |
| Back to chains | `.cd-back` |
| Domain filter | `.domain-btn[data-domain="xxx"]` |
| Prediction grid | `#ph-grid` |
