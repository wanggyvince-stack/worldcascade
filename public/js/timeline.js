/**
 * WorldCascade Timeline - Z0 Minimum Viable Version
 * Sprint 3.1 - WO-02 v1.1.0 (data-contract v2 compatible)
 * D3.js v7 timeline with domain swim lanes, NOW line, backtest + prediction nodes
 * Supports both v1 (flat domain string) and v2 (nested domain object) data formats
 */

(function() {
'use strict';

// ============================================================
// DOMAIN CONFIGURATION
// ============================================================
const DOMAIN_COLORS = {
  AI: "#3B82F6", Energy: "#10B981", Demographics: "#8B5CF6", Climate: "#06B6D4",
  Biotech: "#EF4444", Quantum: "#A78BFA", Space: "#6366F1", Health: "#14B8A6",
  Geopolitics: "#F59E0B", Economics: "#84CC16", Finance: "#E879F9",
  Transport: "#0EA5E9", Food: "#A3E635"
};

const DOMAIN_INFO = {
  AI: { label: 'AI', color: '#3B82F6' },
  Energy: { label: 'Energy', color: '#10B981' },
  Demographics: { label: 'Demographics', color: '#8B5CF6' },
  Climate: { label: 'Climate', color: '#06B6D4' },
  Biotech: { label: 'Biotech', color: '#EF4444' },
  Quantum: { label: 'Quantum', color: '#A78BFA' },
  Space: { label: 'Space', color: '#6366F1' },
  Health: { label: 'Health', color: '#14B8A6' },
  Geopolitics: { label: 'Geopolitics', color: '#F59E0B' },
  Economics: { label: 'Economics', color: '#84CC16' },
  Finance: { label: 'Finance', color: '#E879F9' },
  Transport: { label: 'Transport', color: '#0EA5E9' },
  Food: { label: 'Food', color: '#A3E635' },
  'space-economy': { label: 'Space Economy', color: '#6366F1' },
  'space-alien': { label: 'Space Alien', color: '#6366F1' },
  'cross-domain': { label: 'Cross-Domain', color: '#94A3B8' }
};

// Canonical lane key (PascalCase)
const LANE_ORDER = ['AI','Energy','Demographics','Climate','Biotech','Quantum','Space','Geopolitics','Economics','Finance','Transport','Food'];

// Main 8 domains on top, backtest-only domains below
const MAIN_DOMAINS = new Set(['AI','Energy','Demographics','Climate','Biotech','Quantum','Space','Health']);
const BACKTEST_ONLY_DOMAINS = new Set(['Geopolitics','Economics','Finance','Transport','Food']);

// Map raw data domain keys to canonical lane names
const DOMAIN_KEY_MAP = {
  'ai': 'AI', 'AI': 'AI',
  'energy': 'Energy',
  'demographics': 'Demographics',
  'climate': 'Climate',
  'biotech': 'Biotech',
  'quantum': 'Quantum',
  'space': 'Space', 'space-alien': 'Space', 'space-economy': 'Space',
  'health': 'Health',
  'geopolitics': 'Geopolitics',
  'economics': 'Economics',
  'finance': 'Finance',
  'transport': 'Transport',
  'food': 'Food',
  // Cross-domain predictions → Geopolitics (best semantic fit: governance / emergency declarations)
  'cross-domain': 'Geopolitics', 'cross_domain': 'Geopolitics', 'Cross-Domain': 'Geopolitics'
};

function normalizeDomain(raw) {
  if (!raw) return null;
  // v2 format: domain is a nested object { key, label, color, icon }
  if (typeof raw === 'object' && raw.key) {
    return DOMAIN_KEY_MAP[raw.key] || null;
  }
  // v1 format: domain is a plain string
  return DOMAIN_KEY_MAP[raw] || null;
}

// Extract domain key string from either format
function extractDomainKey(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw.key || null;
  return raw;
}

// ============================================================
// STATE
// ============================================================
let predictions = [];
let backtests = [];
let causalChains = [];
let activeDomain = null; // null = all, string = single domain filter
let currentZoom = 1;
let isZ1Mode = false;
let z1Domain = null;

// Layout constants
const MARGIN = { top: 70, right: 40, bottom: 40, left: 160 };
const LANE_HEIGHT = 72;
const BASE_WIDTH = 1800;
const SVG_HEIGHT = MARGIN.top + LANE_ORDER.length * LANE_HEIGHT + MARGIN.bottom;

// ============================================================
// DATA LOADING
// ============================================================
async function loadData() {
  try {
    const [predResp, btResp] = await Promise.all([
      fetch('public/data/predictions.json'),
      fetch('public/data/backtest_timeline.json')
    ]);

    if (!predResp.ok) throw new Error(`predictions.json: ${predResp.status}`);
    if (!btResp.ok) throw new Error(`backtest_timeline.json: ${btResp.status}`);

    const predData = await predResp.json();
    const btData = await btResp.json();

    // Process predictions — support both v1 (flat) and v2 (nested domain object) formats
    predictions = (predData.predictions || []).map(p => {
      const canonDomain = normalizeDomain(p.domain);
      const rawKey = extractDomainKey(p.domain);
      const domainObj = (typeof p.domain === 'object') ? p.domain : null;
      return {
        id: p.id,
        title: p.title,
        domain: canonDomain || rawKey || (typeof p.domain === 'string' ? p.domain : null),
        domainLabel: p.domainLabel || (domainObj && domainObj.label) || canonDomain || rawKey || '',
        domainColor: DOMAIN_COLORS[canonDomain] || (domainObj && domainObj.color) || p.domainColor || '#94A3B8',
        domainIcon: p.domainIcon || (domainObj && domainObj.icon) || '',
        verificationDate: p.verificationDate,
        originalConfidence: p.originalConfidence || 0,
        engineScore: p.engineScore || 0,
        confidenceLevel: p.confidenceLevel || 'unknown',
        status: (p.leadingSignal && p.leadingSignal.status) || 'none'
      };
    }).filter(p => p.domain && LANE_ORDER.includes(p.domain));

    // Process backtests — same dual-format support
    backtests = (btData.entries || []).map(b => {
      const canonDomain = normalizeDomain(b.domain);
      const rawKey = extractDomainKey(b.domain);
      const domainObj = (typeof b.domain === 'object') ? b.domain : null;
      return {
        id: b.id,
        title: b.title,
        domain: canonDomain || rawKey || (typeof b.domain === 'string' ? b.domain : null),
        domainLabel: b.domainLabel || (domainObj && domainObj.label) || canonDomain || rawKey || '',
        domainColor: DOMAIN_COLORS[canonDomain] || (domainObj && domainObj.color) || b.domainColor || '#94A3B8',
        domainIcon: b.domainIcon || (domainObj && domainObj.icon) || '',
        predictedDate: b.predictedDate,
        resolvedDate: b.resolvedDate,
        outcome: b.outcome,
        brierScore: b.brierScore,
        engineScore: b.engineScore,
        originalConfidence: b.originalConfidence,
        verificationMethod: b.verificationMethod
      };
    }).filter(b => b.domain && LANE_ORDER.includes(b.domain));

    // Process causal chains (for future Sprint 3.2)
    causalChains = predData.causalChains || [];

    console.log(`[Timeline] Loaded ${predictions.length} predictions, ${backtests.length} backtests, ${causalChains.length} causal chains`);
  } catch (err) {
    console.error('[Timeline] Data load error:', err);
  }
}

// ============================================================
// LAYOUT HELPERS
// ============================================================
function getSvgWidth() { return BASE_WIDTH * currentZoom; }
function getInnerWidth() { return getSvgWidth() - MARGIN.left - MARGIN.right; }

function createXScale() {
  return d3.scaleTime()
    .domain([new Date('2023-06-01'), new Date('2031-06-01')])
    .range([0, getInnerWidth()]);
}

// Pre-compute Y offsets to avoid overlapping nodes
function computeYOffsets() {
  const offsetMap = {};

  // Predictions
  const groupsP = {};
  predictions.forEach(p => {
    const key = `${p.domain}-${p.verificationDate}`;
    if (!groupsP[key]) groupsP[key] = [];
    groupsP[key].push(p.id);
  });
  Object.entries(groupsP).forEach(([, ids]) => {
    if (ids.length <= 1) return;
    ids.forEach((id, idx) => { offsetMap[id] = (idx - (ids.length - 1) / 2) * 14; });
  });

  // Backtests
  const groupsB = {};
  backtests.forEach(b => {
    const key = `${b.domain}-${b.resolvedDate}`;
    if (!groupsB[key]) groupsB[key] = [];
    groupsB[key].push(b.id);
  });
  Object.entries(groupsB).forEach(([, ids]) => {
    if (ids.length <= 1) return;
    ids.forEach((id, idx) => { offsetMap[id] = (idx - (ids.length - 1) / 2) * 12; });
  });

  return offsetMap;
}

function getY(domain, id, offsetMap) {
  const idx = LANE_ORDER.indexOf(domain);
  if (idx < 0) return MARGIN.top;
  const base = MARGIN.top + idx * LANE_HEIGHT + LANE_HEIGHT / 2;
  return base + (offsetMap[id] || 0);
}

// Node radius based on engine score
function getNodeRadius(score) {
  return 4 + (score || 50) * 0.08;
}

// Status visual encoding
function getStatusStyle(status) {
  const styles = {
    monitoring:     { glow: 0,   glowOpacity: 0,    strokeW: 1,   rings: 0, pulse: false },
    none:           { glow: 0,   glowOpacity: 0,    strokeW: 1,   rings: 0, pulse: false },
    early_signal:   { glow: 4,   glowOpacity: 0.3,  strokeW: 1.5, rings: 0, pulse: false },
    trending:       { glow: 6,   glowOpacity: 0.5,  strokeW: 2,   rings: 0, pulse: false },
    accelerating:   { glow: 8,   glowOpacity: 0.7,  strokeW: 2.5, rings: 1, pulse: false },
    triggered:      { glow: 12,  glowOpacity: 0.9,  strokeW: 3,   rings: 2, pulse: true }
  };
  return styles[status] || styles.none;
}

// ============================================================
// RENDER
// ============================================================
let yOffsetMap = {};
let xScale;

function render() {
  const container = document.getElementById('svg-container');
  container.innerHTML = '';

  const w = getSvgWidth();
  xScale = createXScale();
  xScale.range([0, w - MARGIN.left - MARGIN.right]);
  yOffsetMap = computeYOffsets();

  const svg = d3.select(container).append('svg')
    .attr('width', w)
    .attr('height', SVG_HEIGHT)
    .attr('viewBox', `0 0 ${w} ${SVG_HEIGHT}`)
    .attr('role', 'img')
    .attr('aria-label', 'WorldCascade Timeline - 80 predictions and 35 backtests across 12 domains')
    .style('shape-rendering', 'geometricPrecision');

  // Defs - glow filters
  const defs = svg.append('defs');

  // Generic glow
  const glowFilter = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
  glowFilter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
  glowFilter.append('feMerge').selectAll('feMergeNode').data(['blur', 'SourceGraphic']).enter()
    .append('feMergeNode').attr('in', d => d);

  // Strong glow for triggered
  const glowStrong = defs.append('filter').attr('id', 'glow-strong').attr('x', '-80%').attr('y', '-80%').attr('width', '260%').attr('height', '260%');
  glowStrong.append('feGaussianBlur').attr('stdDeviation', '8').attr('result', 'blur');
  glowStrong.append('feMerge').selectAll('feMergeNode').data(['blur', 'SourceGraphic']).enter()
    .append('feMergeNode').attr('in', d => d);

  // Green glow for backtest correct
  const glowGreen = defs.append('filter').attr('id', 'glow-green').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
  glowGreen.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
  glowGreen.append('feMerge').selectAll('feMergeNode').data(['blur', 'SourceGraphic']).enter()
    .append('feMergeNode').attr('in', d => d);

  // Red glow for backtest incorrect
  const glowRed = defs.append('filter').attr('id', 'glow-red').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
  glowRed.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
  glowRed.append('feMerge').selectAll('feMergeNode').data(['blur', 'SourceGraphic']).enter()
    .append('feMergeNode').attr('in', d => d);

  const g = svg.append('g').attr('transform', `translate(${MARGIN.left},0)`);
  const innerW = w - MARGIN.left - MARGIN.right;

  // --- Lane backgrounds ---
  renderLanes(g, innerW);

  // --- Time axis + grid ---
  renderTimeAxis(g, innerW);

  // --- NOW line ---
  renderNowLine(g, innerW);

  // --- Stats card ---
  renderStatsCard();

  // --- Backtest nodes ---
  renderBacktestNodes(g);

  // --- Prediction nodes ---
  renderPredictionNodes(g);

  // --- Causal chain curves ---
  renderCausalChains(g, svg);

  // --- Apply domain filter ---
  applyDomainFilter();
}

function renderLanes(g, innerW) {
  // Determine separator position: after main 8 domains (index 7 = Space, but Health is index 7 too)
  // Actually: LANE_ORDER = AI,Energy,Demographics,Climate,Biotech,Quantum,Space,Geopolitics,Economics,Finance,Transport,Food
  // Main 8 = AI..Space (indices 0-6), backtest-only starts at Geopolitics (index 7)
  const mainCount = 7; // AI through Space

  LANE_ORDER.forEach((domain, i) => {
    const y = MARGIN.top + i * LANE_HEIGHT;
    const color = DOMAIN_COLORS[domain] || '#94A3B8';

    // Zebra stripe
    g.append('rect')
      .attr('class', 'lane-bg')
      .attr('data-domain', domain)
      .attr('x', 0).attr('y', y)
      .attr('width', innerW + 20)
      .attr('height', LANE_HEIGHT)
      .attr('fill', i % 2 === 0 ? 'rgba(255,255,255,0.012)' : 'transparent');

    // Left 3px color bar
    g.append('rect')
      .attr('class', 'lane-accent')
      .attr('data-domain', domain)
      .attr('x', -6).attr('y', y + 8)
      .attr('width', 3).attr('height', LANE_HEIGHT - 16)
      .attr('rx', 1.5)
      .attr('fill', color).attr('opacity', 0.5);

    // Lane divider
    if (i > 0) {
      g.append('line')
        .attr('x1', 0).attr('x2', innerW)
        .attr('y1', y).attr('y2', y)
        .attr('stroke', 'rgba(255,255,255,0.03)').attr('stroke-width', 1);
    }

    // Lane label
    const labelY = y + LANE_HEIGHT / 2;
    const labelG = g.append('g').attr('transform', `translate(-140, ${labelY})`);
    labelG.append('circle').attr('cx', 0).attr('cy', 0).attr('r', 5)
      .attr('fill', color).attr('opacity', 0.9)
      .style('filter', 'url(#glow)');
    labelG.append('text')
      .attr('class', 'lane-label')
      .attr('x', 14).attr('y', 1)
      .attr('dominant-baseline', 'middle')
      .attr('fill', color).attr('opacity', 0.9)
      .text(domain);

    // Count
    const predCount = predictions.filter(p => p.domain === domain).length;
    const btCount = backtests.filter(b => b.domain === domain).length;
    let countText = '';
    if (btCount > 0 && predCount > 0) countText = `${btCount} verified · ${predCount} pending`;
    else if (btCount > 0) countText = `${btCount} verified`;
    else countText = `${predCount} predictions`;
    labelG.append('text')
      .attr('x', 14).attr('y', 16)
      .attr('font-size', '10px').attr('fill', '#64748b')
      .text(countText);

    // Double-click for Z1 (future)
    labelG.style('cursor', 'pointer')
      .on('dblclick', function() {
        enterZ1(domain);
      });
  });

  // Separator dashed line between main and backtest-only
  const sepY = MARGIN.top + mainCount * LANE_HEIGHT;
  g.append('line')
    .attr('x1', 0).attr('x2', innerW)
    .attr('y1', sepY).attr('y2', sepY)
    .attr('stroke', 'rgba(255,255,255,0.08)')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '4,4');
}

function renderTimeAxis(g, innerW) {
  // Year axis at top
  const xAxis = d3.axisTop(xScale)
    .ticks(d3.timeYear.every(1))
    .tickFormat(d3.timeFormat('%Y'))
    .tickSize(-LANE_ORDER.length * LANE_HEIGHT)
    .tickPadding(12);

  const axisG = g.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${MARGIN.top})`)
    .call(xAxis);

  axisG.selectAll('line')
    .attr('stroke', 'rgba(255,255,255,0.06)')
    .attr('stroke-dasharray', '3,3');
  axisG.selectAll('.domain').remove();
  axisG.selectAll('text')
    .attr('fill', '#64748b')
    .attr('font-size', '12px')
    .attr('font-weight', '500');

  // Quarter grid lines
  const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031];
  years.forEach(yr => {
    for (let m = 0; m < 12; m += 3) {
      const x = xScale(new Date(`${yr}-${String(m + 1).padStart(2, '0')}-01`));
      g.append('line')
        .attr('x1', x).attr('x2', x)
        .attr('y1', MARGIN.top)
        .attr('y2', MARGIN.top + LANE_ORDER.length * LANE_HEIGHT)
        .attr('stroke', 'rgba(255,255,255,0.02)').attr('stroke-width', 1);
    }
  });
}

function renderNowLine(g, innerW) {
  const now = new Date();
  const nowX = xScale(now);

  if (nowX < 0 || nowX > getInnerWidth()) return;

  // Glow
  g.append('line')
    .attr('x1', nowX).attr('x2', nowX)
    .attr('y1', MARGIN.top - 30)
    .attr('y2', MARGIN.top + LANE_ORDER.length * LANE_HEIGHT)
    .attr('stroke', '#F59E0B').attr('stroke-width', 6).attr('opacity', 0.08);

  // Main line
  g.append('line')
    .attr('x1', nowX).attr('x2', nowX)
    .attr('y1', MARGIN.top - 30)
    .attr('y2', MARGIN.top + LANE_ORDER.length * LANE_HEIGHT)
    .attr('stroke', '#F59E0B').attr('stroke-width', 2)
    .attr('stroke-dasharray', '8,5').attr('opacity', 0.85);

  // NOW badge
  g.append('rect')
    .attr('x', nowX - 28).attr('y', MARGIN.top - 42)
    .attr('width', 56).attr('height', 20).attr('rx', 5)
    .attr('fill', 'rgba(245,158,11,0.2)')
    .attr('stroke', 'rgba(245,158,11,0.5)').attr('stroke-width', 1);

  const nowStr = `NOW · ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  g.append('text')
    .attr('class', 'now-label')
    .attr('x', nowX).attr('y', MARGIN.top - 28)
    .attr('text-anchor', 'middle')
    .attr('font-size', '9px')
    .text(nowStr);

  // VERIFIED label (left)
  g.append('text')
    .attr('x', nowX - 36).attr('y', MARGIN.top - 28)
    .attr('text-anchor', 'end')
    .attr('font-size', '9px').attr('fill', '#10B981')
    .attr('font-weight', '600').attr('letter-spacing', '1px').attr('opacity', 0.7)
    .text('◀ VERIFIED');

  // PREDICTIONS label (right)
  g.append('text')
    .attr('x', nowX + 36).attr('y', MARGIN.top - 28)
    .attr('text-anchor', 'start')
    .attr('font-size', '9px').attr('fill', '#3B82F6')
    .attr('font-weight', '600').attr('letter-spacing', '1px').attr('opacity', 0.7)
    .text('PREDICTIONS ▶');
}

function renderStatsCard() {
  const card = document.getElementById('stats-card');
  if (!card || backtests.length === 0) return;

  const correct = backtests.filter(b => b.outcome === 'correct').length;
  const incorrect = backtests.length - correct;
  const avgBrier = backtests.reduce((s, b) => s + b.brierScore, 0) / backtests.length;
  const hitRate = ((correct / backtests.length) * 100).toFixed(1);

  // Get period
  const dates = backtests.map(b => b.resolvedDate).sort();
  const earliest = dates[0];
  const latest = dates[dates.length - 1];
  const fmtPeriod = (d) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  card.innerHTML = `
    <div class="stats-card-accent"></div>
    <div class="stats-card-title">✓ VERIFIED TRACK RECORD</div>
    <div class="stats-card-outcomes">
      <span class="stats-correct">✓ ${correct} correct</span>
      <span class="stats-incorrect">✗ ${incorrect} incorrect</span>
    </div>
    <div class="stats-card-row">
      <span class="stats-card-label">Brier Score</span>
      <span class="stats-card-value">${avgBrier.toFixed(3)}</span>
    </div>
    <div class="stats-card-row">
      <span class="stats-card-label">Hit Rate</span>
      <span class="stats-card-value">${hitRate}%</span>
    </div>
    <div class="stats-card-row">
      <span class="stats-card-label">Period</span>
      <span class="stats-card-value" style="font-size:11px">${fmtPeriod(earliest)} → ${fmtPeriod(latest)}</span>
    </div>
  `;

  card.onclick = () => {
    sessionStorage.setItem('lastRoute', 'timeline');
    window.location.href = '/#backtest';
  };
}

function renderBacktestNodes(g) {
  const btG = g.append('g').attr('class', 'backtest-nodes');

  backtests.forEach(bt => {
    const cx = xScale(new Date(bt.resolvedDate));
    const cy = getY(bt.domain, bt.id, yOffsetMap);
    const isCorrect = bt.outcome === 'correct';
    const col = isCorrect ? '#10B981' : '#EF4444';
    const r = 6;

    // Glow
    btG.append('circle')
      .attr('class', 'bt-glow')
      .datum(bt)
      .attr('cx', cx).attr('cy', cy).attr('r', r + 5)
      .attr('fill', col).attr('opacity', 0.15)
      .style('pointer-events', 'none')
      .style('filter', isCorrect ? 'url(#glow-green)' : 'url(#glow-red)');

    // Main node
    const node = btG.append('circle')
      .attr('class', 'bt-node')
      .datum(bt)
      .attr('cx', cx).attr('cy', cy).attr('r', r)
      .attr('fill', isCorrect ? col : 'transparent')
      .attr('stroke', col).attr('stroke-width', isCorrect ? 1.5 : 2)
      .attr('opacity', 0.9)
      .attr('data-id', bt.id)
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', `${bt.id}: ${bt.title} - ${isCorrect ? 'Correct' : 'Incorrect'}`)
      .style('cursor', 'pointer')
      .style('filter', isCorrect ? 'url(#glow-green)' : 'url(#glow-red)');

    // Checkmark or X
    if (isCorrect) {
      btG.append('text')
        .attr('x', cx).attr('y', cy + 1)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('font-size', '7px').attr('fill', '#fff').attr('font-weight', '700')
        .style('pointer-events', 'none')
        .text('✓');
    } else {
      btG.append('text')
        .attr('x', cx).attr('y', cy + 1)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('font-size', '7px').attr('fill', '#EF4444').attr('font-weight', '700')
        .style('pointer-events', 'none')
        .text('✗');
    }

    // Hover
    node.on('mouseenter', function(event) {
      d3.select(this).transition().duration(150).attr('r', r + 3);
      showBtTooltip(event, bt);
    })
    .on('mousemove', function(event) { moveTooltip(event); })
    .on('mouseleave', function() {
      d3.select(this).transition().duration(200).attr('r', r);
      hideTooltip();
    })
    .on('click', function(event) {
      showBtTooltip(event, bt);
    })
    .on('keydown', function(event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        showBtTooltip(event, bt);
      }
    });
  });
}

function renderPredictionNodes(g) {
  const nodeG = g.append('g').attr('class', 'pred-nodes');

  predictions.forEach(pred => {
    const cx = xScale(new Date(pred.verificationDate));
    const cy = getY(pred.domain, pred.id, yOffsetMap);
    const r = getNodeRadius(pred.engineScore);
    const col = pred.domainColor || DOMAIN_COLORS[pred.domain] || '#94A3B8';
    const statusStyle = getStatusStyle(pred.status);

    // Outer glow
    if (statusStyle.glow > 0) {
      nodeG.append('circle')
        .attr('class', 'pred-node-glow')
        .datum(pred)
        .attr('cx', cx).attr('cy', cy).attr('r', r + statusStyle.glow)
        .attr('fill', col).attr('opacity', statusStyle.glowOpacity * 0.15)
        .style('pointer-events', 'none')
        .style('filter', statusStyle.glow > 8 ? 'url(#glow-strong)' : 'url(#glow)');
    }

    // Outer rings for accelerating/triggered
    for (let i = 0; i < statusStyle.rings; i++) {
      nodeG.append('circle')
        .attr('class', 'pred-node-ring')
        .datum(pred)
        .attr('cx', cx).attr('cy', cy)
        .attr('r', r + 4 + i * 4)
        .attr('fill', 'none').attr('stroke', col)
        .attr('stroke-width', 1).attr('opacity', 0.3 - i * 0.1)
        .style('pointer-events', 'none');
    }

    // Main node
    const node = nodeG.append('circle')
      .attr('class', 'pred-node' + (statusStyle.pulse ? ' node-triggered-pulse' : ''))
      .datum(pred)
      .attr('cx', cx).attr('cy', cy).attr('r', r)
      .attr('fill', col)
      .attr('stroke', col).attr('stroke-width', statusStyle.strokeW)
      .attr('opacity', 0.85)
      .attr('data-id', pred.id)
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', `${pred.id}: ${pred.title} - Score: ${pred.engineScore} - Status: ${pred.status}`)
      .style('cursor', 'pointer');

    // ID label (small, above node)
    nodeG.append('text')
      .attr('x', cx).attr('y', cy - r - 6)
      .attr('text-anchor', 'middle')
      .attr('font-size', '8px').attr('fill', col)
      .attr('font-weight', '500').attr('opacity', 0.6)
      .style('pointer-events', 'none')
      .text(pred.id);

    // Hover
    node.on('mouseenter', function(event) {
      d3.select(this).transition().duration(150).attr('r', r * 1.2);
      showPredTooltip(event, pred);
    })
    .on('mousemove', function(event) { moveTooltip(event); })
    .on('mouseleave', function() {
      d3.select(this).transition().duration(200).attr('r', r);
      hideTooltip();
    })
    .on('click', function() {
      navigateToPrediction(pred.id);
    })
    .on('keydown', function(event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        navigateToPrediction(pred.id);
      }
    });
  });
}

// ============================================================
// CAUSAL CHAINS (P3) — Bezier curve rendering
// ============================================================
function renderCausalChains(g, svg) {
  if (!causalChains || causalChains.length === 0) return;

  // Build prediction position lookup
  const predPos = {};
  predictions.forEach(p => {
    const cx = xScale(new Date(p.verificationDate));
    const cy = getY(p.domain, p.id, yOffsetMap);
    predPos[p.id] = { x: cx + MARGIN.left, y: cy, domain: p.domain, domainColor: p.domainColor };
  });

  // Add SVG defs container for gradients
  const defs = svg.select('defs');

  // Evidence strength to stroke width mapping
  const strengthMap = { HIGH: 3, MEDIUM: 1.75, LOW: 0.5 };
  
  // Calculate chain strength from nodes' evidence_strength (HIGH=3, MEDIUM=2, LOW=1)
  function calcChainStrength(chain) {
    if (!chain.nodes || chain.nodes.length === 0) return 50; // default
    const score = chain.nodes.reduce((sum, n) => {
      const es = n.evidence_strength;
      if (es === 'HIGH') return sum + 3;
      if (es === 'MEDIUM') return sum + 2;
      if (es === 'LOW') return sum + 1;
      return sum + 1; // default
    }, 0);
    return Math.round((score / chain.nodes.length) * 33.3); // normalize to 0-100
  }
  
  function getStrokeWidth(chain) {
    if (!chain.nodes || chain.nodes.length === 0) return 1.5;
    const avg = chain.nodes.reduce((sum, n) => sum + (strengthMap[n.evidence_strength] || 1), 0) / chain.nodes.length;
    return Math.max(1, Math.min(3, avg));
  }

  // Sort all chains by strength descending
  const allSorted = [...causalChains].sort((a, b) => calcChainStrength(b) - calcChainStrength(a));
  
  // Smart selection: top 5 by strength, but ensure each domain has at least 1 chain visible
  const maxVisible = 5;
  const domainCoverage = new Set();
  const selectedChains = [];
  
  // First pass: select top chains ensuring domain coverage
  for (const chain of allSorted) {
    if (selectedChains.length >= maxVisible) break;
    const linkedDomains = new Set();
    for (const fpId of (chain.linkedPredictions || [])) {
      const pred = predictions.find(p => p.id === fpId);
      if (pred) linkedDomains.add(pred.domain);
    }
    // Prioritize chains that cover uncovered domains
    const hasNewDomain = [...linkedDomains].some(d => !domainCoverage.has(d));
    if (hasNewDomain || selectedChains.length < 3) {
      selectedChains.push(chain);
      linkedDomains.forEach(d => domainCoverage.add(d));
    }
  }
  
  // Fill remaining slots with top strength chains
  for (const chain of allSorted) {
    if (selectedChains.length >= maxVisible) break;
    if (!selectedChains.includes(chain)) {
      selectedChains.push(chain);
    }
  }
  
  const visibleChains = selectedChains;

  const chainG = g.append('g').attr('class', 'causal-chains');

  // Calculate per-chain per-lane vertical offsets to reduce overlap
  // Track how many chains pass through each lane, assign alternating offsets
  const laneChainCount = {};
  const chainLaneOffset = {}; // key: "chainId:domain" -> offset in px
  visibleChains.forEach((chain, idx) => {
    const domains = new Set();
    for (const fpId of (chain.linkedPredictions || [])) {
      const pred = predictions.find(p => p.id === fpId);
      if (pred) domains.add(pred.domain);
    }
    domains.forEach(domain => {
      if (!laneChainCount[domain]) laneChainCount[domain] = 0;
      const count = laneChainCount[domain];
      // Alternate offset: 0, -12, +12, -24, +24, ...
      let offset = 0;
      if (count > 0) {
        const magnitude = Math.ceil(count / 2) * 12;
        offset = (count % 2 === 1) ? -magnitude : magnitude;
      }
      chainLaneOffset[`${chain.id}:${domain}`] = offset;
      laneChainCount[domain] = count + 1;
    });
  });

  visibleChains.forEach((chain, idx) => {
    const linkedIds = chain.linkedPredictions || [];
    if (linkedIds.length < 2) return;

    // Get positions for all linked FPs
    const positions = linkedIds.map(id => predPos[id]).filter(Boolean);
    if (positions.length < 2) return;

    const sourceColor = positions[0].domainColor || DOMAIN_COLORS[positions[0].domain] || '#94A3B8';
    const targetColor = positions[positions.length - 1].domainColor || DOMAIN_COLORS[positions[positions.length - 1].domain] || '#94A3B8';
    const strokeWidth = getStrokeWidth(chain);

    // Calculate offset positions for gradient
    const firstDomain = linkedIds[0] ? (predictions.find(p => p.id === linkedIds[0]) || {}).domain : positions[0].domain;
    const lastDomain = linkedIds[linkedIds.length-1] ? (predictions.find(p => p.id === linkedIds[linkedIds.length-1]) || {}).domain : positions[positions.length-1].domain;
    const firstOffset = chainLaneOffset[`${chain.id}:${firstDomain}`] || 0;
    const lastOffset = chainLaneOffset[`${chain.id}:${lastDomain}`] || 0;

    // Create linear gradient spanning full chain extent
    const gradId = `chain-grad-${idx}`;
    const gradient = defs.append('linearGradient')
      .attr('id', gradId)
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', positions[0].x).attr('y1', positions[0].y + firstOffset)
      .attr('x2', positions[positions.length - 1].x).attr('y2', positions[positions.length - 1].y + lastOffset);
    gradient.append('stop').attr('offset', '0%').attr('stop-color', sourceColor).attr('stop-opacity', 0.75);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', targetColor).attr('stop-opacity', 0.75);

    // Arrow marker
    const markerId = `chain-arrow-${idx}`;
    defs.append('marker')
      .attr('id', markerId)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 9)
      .attr('refY', 0)
      .attr('markerWidth', 7)
      .attr('markerHeight', 7)
      .attr('orient', 'auto')
      .append('path')
        .attr('d', 'M0,-4L10,0L0,4')
        .attr('fill', targetColor)
        .attr('opacity', 0.9);

    // Draw bezier curve segments between adjacent FPs
    const segmentPaths = [];
    for (let i = 0; i < positions.length - 1; i++) {
      const src = positions[i];
      const tgt = positions[i + 1];
      const dx = tgt.x - src.x;
      const dy = tgt.y - src.y;
      
      // Apply per-chain per-lane offset to reduce overlap
      const srcDomain = linkedIds[i] ? (predictions.find(p => p.id === linkedIds[i]) || {}).domain : src.domain;
      const tgtDomain = linkedIds[i+1] ? (predictions.find(p => p.id === linkedIds[i+1]) || {}).domain : tgt.domain;
      const srcOffset = chainLaneOffset[`${chain.id}:${srcDomain}`] || 0;
      const tgtOffset = chainLaneOffset[`${chain.id}:${tgtDomain}`] || 0;
      
      // Bezier control points: smooth S-curve with proper y interpolation
      const cp1x = src.x + dx * 0.35;
      const cp1y = src.y + srcOffset + (tgt.y + tgtOffset - src.y - srcOffset) * 0.15;
      const cp2x = src.x + dx * 0.65;
      const cp2y = src.y + srcOffset + (tgt.y + tgtOffset - src.y - srcOffset) * 0.85;
      
      // For short horizontal distances, add vertical bow to avoid overlap
      const minDx = Math.abs(dx);
      let cpExtraOffsetY = 0;
      if (minDx < 60) {
        cpExtraOffsetY = (i % 2 === 0 ? -1 : 1) * 8;
      }
      
      const pathD = `M${src.x},${src.y + srcOffset} C${cp1x},${cp1y + cpExtraOffsetY} ${cp2x},${cp2y - cpExtraOffsetY} ${tgt.x},${tgt.y + tgtOffset}`;
      
      const isLast = (i === positions.length - 2);
      
      chainG.append('path')
        .attr('d', pathD)
        .attr('fill', 'none')
        .attr('stroke', `url(#${gradId})`)
        .attr('stroke-width', strokeWidth)
        .attr('opacity', 0.7)
        .attr('marker-end', isLast ? `url(#${markerId})` : null)
        .attr('data-chain-id', chain.id)
        .attr('data-chain-segment', i)
        .style('cursor', 'pointer')
        .style('transition', 'opacity 0.2s, stroke-width 0.2s');
      
      segmentPaths.push(pathD);
    }

    // Endpoint dots
    chainG.append('circle')
      .attr('cx', positions[0].x).attr('cy', positions[0].y).attr('r', 4)
      .attr('fill', sourceColor).attr('opacity', 0.9)
      .attr('pointer-events', 'none');
    chainG.append('circle')
      .attr('cx', positions[positions.length - 1].x).attr('cy', positions[positions.length - 1].y).attr('r', 5)
      .attr('fill', targetColor).attr('opacity', 1)
      .attr('pointer-events', 'none');

    // Hover: highlight this chain's segments, fade others
    chainG.selectAll(`path[data-chain-id="${chain.id}"]`)
      .on('mouseenter', function() {
        chainG.selectAll('path').attr('opacity', 0.12);
        chainG.selectAll(`path[data-chain-id="${chain.id}"]`).attr('opacity', 1).attr('stroke-width', strokeWidth + 1.5);
      })
      .on('mouseleave', function() {
        chainG.selectAll('path[data-chain-id]').attr('opacity', 0.7).attr('stroke-width', strokeWidth);
      });

    // Click → navigate to chain detail
    chainG.selectAll(`path[data-chain-id="${chain.id}"]`)
      .on('click', function() {
        sessionStorage.setItem('lastRoute', 'timeline');
        window.location.href = '/#chain/' + chain.id;
      });
  });
  
  // Info label: how many chains visible
  chainG.append('text')
    .attr('x', MARGIN.left + 10)
    .attr('y', 20)
    .attr('font-size', '11px')
    .attr('fill', '#94A3B8')
    .attr('opacity', 0.7)
    .text(`Top ${visibleChains.length} of ${causalChains.length} causal chains`);
}

// ============================================================
// TOOLTIP
// ============================================================
function showPredTooltip(event, pred) {
  const col = pred.domainColor || DOMAIN_COLORS[pred.domain] || '#94A3B8';
  const tooltip = document.getElementById('timeline-tooltip');
  tooltip.innerHTML = `
    <div class="tooltip-title">${pred.title}</div>
    <div class="tooltip-meta">
      <div class="tooltip-row">
        <span class="tooltip-label">ID</span>
        <span class="tooltip-value">${pred.id}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">Domain</span>
        <span class="domain-badge" style="background:${col}20;color:${col};border:1px solid ${col}40">${pred.domain}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">Score</span>
        <span class="tooltip-value" style="color:${col}">${pred.engineScore}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">Status</span>
        <span class="tooltip-value">${pred.status}</span>
      </div>
      <div>
        <div class="tooltip-row">
          <span class="tooltip-label">Engine Score</span>
          <span class="tooltip-value">${pred.engineScore}</span>
        </div>
        <div class="tooltip-bar"><div class="tooltip-bar-fill" style="width:${pred.engineScore}%;background:${col}80"></div></div>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">Verdict</span>
        <span class="tooltip-value">${formatDate(pred.verificationDate)}</span>
      </div>
    </div>
  `;
  tooltip.classList.add('visible');
  moveTooltip(event);
}

function showBtTooltip(event, bt) {
  const col = DOMAIN_COLORS[bt.domain] || '#94A3B8';
  const isCorrect = bt.outcome === 'correct';
  const outcomeColor = isCorrect ? '#10B981' : '#EF4444';
  const outcomeIcon = isCorrect ? '✓ Correct' : '✗ Incorrect';
  const verdict = isCorrect ? 'VERIFIED CORRECT' : 'VERIFIED INCORRECT';
  // Compute hit rate
  const totalBt = backtests.length;
  const correctBt = backtests.filter(b => b.outcome === 'correct').length;
  const hitRate = totalBt > 0 ? ((correctBt / totalBt) * 100).toFixed(1) : '0.0';
  // Find associated prediction (closest verification date, same domain)
  const samePreds = predictions.filter(p => p.domain === bt.domain);
  let associatedFpId = '';
  if (samePreds.length > 0) {
    const btDate = new Date(bt.resolvedDate);
    samePreds.sort((a, b) => Math.abs(new Date(a.verificationDate) - btDate) - Math.abs(new Date(b.verificationDate) - btDate));
    associatedFpId = samePreds[0].id;
  }
  const tooltip = document.getElementById('timeline-tooltip');
  tooltip.innerHTML = `
    <div class="tooltip-title">${bt.title}</div>
    <div class="tooltip-divider"></div>
    <div class="tooltip-meta">
      <div class="tooltip-row">
        <span class="tooltip-label">Domain</span>
        <span class="domain-badge" style="background:${col}20;color:${col};border:1px solid ${col}40">${bt.domain}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">ID</span>
        <span class="tooltip-value">${bt.id}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">Outcome</span>
        <span class="tooltip-value" style="color:${outcomeColor};font-weight:700">${outcomeIcon}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">Verdict</span>
        <span class="tooltip-value" style="color:${outcomeColor};font-size:10px">${verdict}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">Brier Score</span>
        <span class="tooltip-value" style="color:${outcomeColor}">${bt.brierScore.toFixed(3)}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">Hit Rate</span>
        <span class="tooltip-value">${hitRate}%</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">Predicted</span>
        <span class="tooltip-value">${formatDate(bt.predictedDate)}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">Resolved</span>
        <span class="tooltip-value">${formatDate(bt.resolvedDate)}</span>
      </div>
      <div class="tooltip-cta-row">
        <button class="tooltip-cta" data-action="backtest-archive">View backtest archive →</button>
        <button class="tooltip-cta" data-action="compare-pred" data-fp="${associatedFpId}">Compare to current prediction →</button>
      </div>
    </div>
  `;
  tooltip.classList.add('visible');
  tooltip.style.pointerEvents = 'auto';
  moveTooltip(event);
  // CTA handlers
  tooltip.querySelector('[data-action="backtest-archive"]').onclick = (e) => {
    e.stopPropagation();
    sessionStorage.setItem('lastRoute', 'timeline');
    window.location.href = '/#trust';
  };
  tooltip.querySelector('[data-action="compare-pred"]').onclick = (e) => {
    e.stopPropagation();
    sessionStorage.setItem('lastRoute', 'timeline');
    sessionStorage.setItem('lastRoute', 'timeline');
    window.location.href = '/#detail/' + associatedFpId;
  };
}

function moveTooltip(event) {
  const tooltip = document.getElementById('timeline-tooltip');
  const x = event.clientX + 16;
  const y = event.clientY - 10;
  const maxX = window.innerWidth - 340;
  const maxY = window.innerHeight - 320;
  tooltip.style.left = Math.min(x, maxX) + 'px';
  tooltip.style.top = Math.min(y, maxY) + 'px';
}

function hideTooltip() {
  const tooltip = document.getElementById('timeline-tooltip');
  tooltip.classList.remove('visible');
}

function formatDate(d) {
  if (!d) return 'N/A';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ============================================================
// DOMAIN FILTER (T-07)
// ============================================================
function buildLegend() {
  const legendBar = document.getElementById('legend-bar');
  legendBar.innerHTML = '';

  // All button
  const allBtn = document.createElement('button');
  allBtn.className = 'legend-btn all-btn' + (activeDomain === null ? ' active' : '');
  allBtn.textContent = 'All';
  allBtn.setAttribute('aria-label', 'Show all domains');
  allBtn.onclick = () => {
    activeDomain = null;
    window.location.hash = 'all';
    buildLegend();
    applyDomainFilter();
  };
  legendBar.appendChild(allBtn);

  // Separator
  const sep = document.createElement('div');
  sep.className = 'legend-sep';
  legendBar.appendChild(sep);

  // Domain buttons
  LANE_ORDER.forEach(domain => {
    const btn = document.createElement('button');
    const isActive = activeDomain === null || activeDomain === domain;
    btn.className = 'legend-btn' + (isActive ? '' : ' dimmed');
    const color = DOMAIN_COLORS[domain] || '#94A3B8';
    btn.innerHTML = `<span class="legend-dot" style="background:${color};box-shadow:0 0 6px ${color}80"></span>${domain}`;
    btn.setAttribute('aria-label', `Filter by ${domain}`);
    btn.onclick = () => {
      if (activeDomain === domain) {
        activeDomain = null;
        window.location.hash = 'all';
      } else {
        activeDomain = domain;
        window.location.hash = domain.toLowerCase();
      }
      buildLegend();
      applyDomainFilter();
    };
    legendBar.appendChild(btn);
  });
}

function applyDomainFilter() {
  const isAll = activeDomain === null;

  // Prediction nodes
  d3.selectAll('.pred-node').transition().duration(300)
    .style('opacity', d => (isAll || d.domain === activeDomain) ? 0.85 : 0.08);
  d3.selectAll('.pred-node-glow').transition().duration(300)
    .style('opacity', d => (isAll || d.domain === activeDomain) ? 0.12 : 0.01);
  d3.selectAll('.pred-node-ring').transition().duration(300)
    .style('opacity', d => (isAll || d.domain === activeDomain) ? 0.3 : 0.02);

  // Backtest nodes
  d3.selectAll('.bt-node').transition().duration(300)
    .style('opacity', d => (isAll || d.domain === activeDomain) ? 0.9 : 0.08);
  d3.selectAll('.bt-glow').transition().duration(300)
    .style('opacity', d => (isAll || d.domain === activeDomain) ? 0.15 : 0.01);

  // Lane backgrounds
  d3.selectAll('.lane-bg').transition().duration(300)
    .style('opacity', function() {
      const d = d3.select(this).attr('data-domain');
      return (isAll || d === activeDomain) ? 1 : 0.15;
    });

  // Lane accents
  d3.selectAll('.lane-accent').transition().duration(300)
    .attr('opacity', function() {
      const d = d3.select(this).attr('data-domain');
      return (isAll || d === activeDomain) ? 0.5 : 0.1;
    });
}

// ============================================================
// NAVIGATION (T-09, T-11)
// ============================================================
function navigateToPrediction(fpId) {
  sessionStorage.setItem('lastRoute', 'timeline');
  window.location.href = '/#detail/' + fpId;
}

// ============================================================
// Z1 MODE (T-10 placeholder)
// ============================================================
function enterZ1(domain) {
  isZ1Mode = true;
  z1Domain = domain;
  activeDomain = domain;
  window.location.hash = domain.toLowerCase();
  buildLegend();
  applyDomainFilter();

  // Show back button
  const backBtn = document.getElementById('back-global-btn');
  if (backBtn) {
    backBtn.style.display = 'flex';
    backBtn.textContent = `← Global View`;
    backBtn.onclick = exitZ1;
  }
}

function exitZ1() {
  isZ1Mode = false;
  z1Domain = null;
  activeDomain = null;
  window.location.hash = 'all';
  buildLegend();
  applyDomainFilter();

  const backBtn = document.getElementById('back-global-btn');
  if (backBtn) backBtn.style.display = 'none';
}

// ============================================================
// ZOOM (T-10)
// ============================================================
function setupZoom() {
  const container = document.getElementById('svg-container');

  // Mouse wheel zoom — Ctrl/Cmd+wheel = zoom, plain wheel = native scroll
  container.addEventListener('wheel', function(event) {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    currentZoom = Math.max(0.5, Math.min(5, currentZoom + delta));
    render();
  }, { passive: false });

  // Touch pinch zoom
  let lastTouchDist = 0;
  container.addEventListener('touchstart', function(event) {
    if (event.touches.length === 2) {
      lastTouchDist = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
    }
  }, { passive: true });

  container.addEventListener('touchmove', function(event) {
    if (event.touches.length === 2) {
      const dist = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
      const delta = (dist - lastTouchDist) * 0.005;
      currentZoom = Math.max(0.5, Math.min(5, currentZoom + delta));
      lastTouchDist = dist;
      render();
    }
  }, { passive: true });
}

// ============================================================
// KEYBOARD NAV (T-12)
// ============================================================
function setupKeyboard() {
  document.addEventListener('keydown', function(event) {
    const key = event.key;

    // Arrow keys - horizontal scroll
    if (key === 'ArrowLeft') {
      event.preventDefault();
      const container = document.getElementById('svg-container');
      container.scrollLeft -= 100;
    } else if (key === 'ArrowRight') {
      event.preventDefault();
      const container = document.getElementById('svg-container');
      container.scrollLeft += 100;
    }

    // +/- zoom
    else if (key === '+' || key === '=') {
      event.preventDefault();
      currentZoom = Math.min(5, currentZoom + 0.2);
      render();
    } else if (key === '-' || key === '_') {
      event.preventDefault();
      currentZoom = Math.max(0.5, currentZoom - 0.2);
      render();
    }

    // A = all
    else if (key === 'a' || key === 'A') {
      if (document.activeElement.tagName !== 'INPUT') {
        event.preventDefault();
        activeDomain = null;
        window.location.hash = 'all';
        buildLegend();
        applyDomainFilter();
      }
    }

    // 1-9, 0, -, = for domain quick switch
    else if (key >= '1' && key <= '9') {
      const idx = parseInt(key) - 1;
      if (idx < LANE_ORDER.length) {
        activeDomain = LANE_ORDER[idx];
        window.location.hash = activeDomain.toLowerCase();
        buildLegend();
        applyDomainFilter();
      }
    } else if (key === '0') {
      if (LANE_ORDER.length > 9) {
        activeDomain = LANE_ORDER[9];
        window.location.hash = activeDomain.toLowerCase();
        buildLegend();
        applyDomainFilter();
      }
    }

    // Esc
    else if (key === 'Escape') {
      if (isZ1Mode) {
        exitZ1();
      } else {
        hideTooltip();
        activeDomain = null;
        window.location.hash = 'all';
        buildLegend();
        applyDomainFilter();
      }
    }
  });
}

// ============================================================
// HASH ROUTING
// ============================================================
function handleHash() {
  const hash = window.location.hash.replace('#', '');
  
  // Check for chain detail route: #chain/CC-XXX-NNN
  if (hash.toLowerCase().startsWith('chain/')) {
    const chainId = hash.split('/')[1];
    // Small delay to ensure sidebar is fully initialized
    setTimeout(() => {
      if (window.openChainDetail) {
        window.openChainDetail(chainId);
      } else {
        // Fallback: dispatch event for later listeners
        window.dispatchEvent(new CustomEvent('show-chain-detail', { detail: chainId }));
      }
    }, 100);
    return;
  }
  
  const hashLower = hash.toLowerCase();
  if (!hashLower || hashLower === 'all') {
    activeDomain = null;
  } else {
    // Find matching domain
    const match = LANE_ORDER.find(d => d.toLowerCase() === hashLower);
    if (match) {
      activeDomain = match;
    }
  }
  buildLegend();
  applyDomainFilter();
}

// ============================================================
// MOBILE RESPONSIVE (T-13)
// ============================================================
function setupMobile() {
  const toggle = document.getElementById('mobile-bt-toggle');
  if (!toggle) return;

  toggle.addEventListener('click', function() {
    const svgContainer = document.getElementById('svg-container');
    // Scroll to left (backtest area)
    svgContainer.scrollTo({ left: 0, behavior: 'smooth' });
  });

  // Check viewport
  function checkMobile() {
    if (window.innerWidth < 768) {
      toggle.style.display = 'block';
    } else {
      toggle.style.display = 'none';
    }
  }
  checkMobile();
  window.addEventListener('resize', checkMobile);
}

// ============================================================
// LONG PRESS for mobile Z1
// ============================================================
function setupLongPress() {
  const container = document.getElementById('svg-container');
  let pressTimer = null;

  container.addEventListener('touchstart', function(event) {
    if (event.touches.length !== 1) return;
    pressTimer = setTimeout(() => {
      // Find which lane was pressed based on Y coordinate
      const rect = container.getBoundingClientRect();
      const y = event.touches[0].clientY - rect.top + container.scrollTop;
      const laneIdx = Math.floor((y - MARGIN.top) / LANE_HEIGHT);
      if (laneIdx >= 0 && laneIdx < LANE_ORDER.length) {
        enterZ1(LANE_ORDER[laneIdx]);
      }
    }, 300);
  }, { passive: true });

  container.addEventListener('touchend', () => {
    if (pressTimer) clearTimeout(pressTimer);
  }, { passive: true });

  container.addEventListener('touchmove', () => {
    if (pressTimer) clearTimeout(pressTimer);
  }, { passive: true });
}

// ============================================================
// INIT
// ============================================================
async function init() {
  // Set sessionStorage for back navigation
  sessionStorage.setItem('lastRoute', 'timeline');
  try { sessionStorage.setItem('lastHub', 'timeline'); } catch (_) {}

  // Nav toggle (hamburger menu)
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        links.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Build legend
  buildLegend();

  // Load data
  await loadData();

  // Render
  render();

  // Setup interactions
  setupZoom();
  setupKeyboard();
  setupMobile();
  setupLongPress();
  setupChainSidebar();

  // Handle initial hash
  handleHash();
  window.addEventListener('hashchange', handleHash);

  // Hide loading
  const loading = document.getElementById('loading-overlay');
  if (loading) loading.classList.add('hidden');
  setTimeout(() => { if (loading) loading.remove(); }, 500);
}

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ============================================================
// CAUSAL CHAIN SIDEBAR
// ============================================================
function setupChainSidebar() {
  const sidebar = document.getElementById('chain-sidebar');
  const toggle = document.getElementById('sidebar-toggle');
  const closeBtn = document.getElementById('sidebar-close');
  const strengthSlider = document.getElementById('strength-slider');
  const strengthValue = document.getElementById('strength-value');
  const domainFilters = document.getElementById('domain-filters');
  const chainList = document.getElementById('chain-list');
  const chainCount = document.getElementById('chain-count');
  const chainDetail = document.getElementById('chain-detail');
  const detailBack = document.getElementById('detail-back');
  const detailContent = document.getElementById('detail-content');
  
  if (!sidebar || !causalChains || causalChains.length === 0) return;
  
  // State
  let activeDomains = new Set();
  let minStrength = 0;
  let selectedChainId = null;
  
  // Expose openChainDetail globally for hash routing
  window.openChainDetail = function(chainId) {
    if (chainId && causalChains.find(c => c.id === chainId)) {
      sidebar.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      showChainDetail(chainId);
    }
  };
  
  // Listen for chain detail navigation from timeline click
  window.addEventListener('show-chain-detail', (e) => {
    window.openChainDetail(e.detail);
  });
  
  // Toggle sidebar
  toggle.addEventListener('click', () => {
    sidebar.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
  });
  closeBtn.addEventListener('click', () => {
    sidebar.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  });
  
  // Build domain chips
  const allDomains = [...new Set(causalChains.flatMap(c => c.domains || []))].sort();
  domainFilters.innerHTML = allDomains.map(d => {
    const info = DOMAIN_INFO[d] || {};
    return `<div class="domain-chip active" data-domain="${d}">
      <span class="chip-dot" style="background:${info.color || '#94A3B8'}"></span>
      ${info.label || d}
    </div>`;
  }).join('');
  activeDomains = new Set(allDomains);
  
  // Domain chip toggle
  domainFilters.querySelectorAll('.domain-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const d = chip.dataset.domain;
      if (activeDomains.has(d)) {
        activeDomains.delete(d);
        chip.classList.remove('active');
      } else {
        activeDomains.add(d);
        chip.classList.add('active');
      }
      updateChainList();
      renderFilteredChains();
    });
  });
  
  // Strength slider
  strengthSlider.addEventListener('input', () => {
    minStrength = parseInt(strengthSlider.value);
    strengthValue.textContent = minStrength;
    updateChainList();
    renderFilteredChains();
  });
  
  // Filter chains
  function getFilteredChains() {
    return causalChains.filter(c => {
      const domains = c.domains || [];
      const hasDomain = domains.some(d => activeDomains.has(d));
      const strength = calcChainStrengthForSidebar(c);
      return hasDomain && strength >= minStrength;
    });
  }
  
  function calcChainStrengthForSidebar(chain) {
    if (!chain.strength && chain.strength !== 0) {
      // Calculate from nodes
      if (!chain.nodes || chain.nodes.length === 0) return 50;
      const score = chain.nodes.reduce((sum, n) => {
        const es = n.evidence_strength;
        if (es === 'HIGH') return sum + 3;
        if (es === 'MEDIUM') return sum + 2;
        return sum + 1;
      }, 0);
      return Math.round((score / chain.nodes.length) * 33.3);
    }
    return chain.strength || 50;
  }
  
  // Update chain list
  function updateChainList() {
    const filtered = getFilteredChains();
    filtered.sort((a, b) => calcChainStrengthForSidebar(b) - calcChainStrengthForSidebar(a));
    
    chainCount.textContent = filtered.length;
    chainList.innerHTML = filtered.map(c => {
      const strength = calcChainStrengthForSidebar(c);
      const fpCount = (c.linkedPredictions || []).length;
      return `<div class="chain-item" data-chain-id="${c.id}">
        <div class="chain-item-title">${c.title || c.id}</div>
        <div class="chain-item-meta">
          <span>💪 ${strength}</span>
          <span>📊 ${fpCount} FPs</span>
          <span>${(c.domains || []).join(', ')}</span>
        </div>
      </div>`;
    }).join('');
    
    // Click handler
    chainList.querySelectorAll('.chain-item').forEach(item => {
      item.addEventListener('click', () => {
        showChainDetail(item.dataset.chainId);
        chainList.querySelectorAll('.chain-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
    });
    
    renderFilteredChains();
  }
  
  // Show chain detail
  function showChainDetail(chainId) {
    selectedChainId = chainId;
    const chain = causalChains.find(c => c.id === chainId);
    if (!chain) return;
    
    const strength = calcChainStrengthForSidebar(chain);
    const linkedFPs = chain.linkedPredictions || [];
    const predMap = {};
    predictions.forEach(p => predMap[p.id] = p);
    
    let html = `<h4>${chain.title || chain.id}</h4>`;
    html += `<div class="detail-row"><span class="detail-label">ID</span><span>${chain.id}</span></div>`;
    html += `<div class="detail-row"><span class="detail-label">Strength</span><span>${strength}</span></div>`;
    html += `<div class="detail-row"><span class="detail-label">Type</span><span>${chain.type || '-'}</span></div>`;
    html += `<div class="detail-row"><span class="detail-label">Domains</span><span>${(chain.domains || []).join(', ')}</span></div>`;
    html += `<div class="detail-row"><span class="detail-label">FPs</span><span>${linkedFPs.length}</span></div>`;
    
    if (linkedFPs.length > 0) {
      html += `<div class="detail-fps">`;
      linkedFPs.forEach(fpId => {
        const p = predMap[fpId];
        if (p) {
          html += `<div class="detail-fp"><strong>${fpId}</strong>: ${p.title.substring(0, 60)}${p.title.length > 60 ? '...' : ''}</div>`;
        }
      });
      html += `</div>`;
    }
    
    detailContent.innerHTML = html;
    chainList.style.display = 'none';
    document.querySelector('.filter-section').style.display = 'none';
    document.querySelector('.chain-list-section').style.display = 'none';
    chainDetail.style.display = 'block';
    
    // Highlight on timeline
    highlightChain(chainId);
  }
  
  // Back to list
  detailBack.addEventListener('click', () => {
    selectedChainId = null;
    chainList.style.display = '';
    document.querySelector('.filter-section').style.display = '';
    document.querySelector('.chain-list-section').style.display = '';
    chainDetail.style.display = 'none';
    unhighlightChains();
  });
  
  // Highlight chain on timeline
  function highlightChain(chainId) {
    const chainG = d3.select('.causal-chains');
    if (chainG.empty()) return;
    chainG.selectAll('path[data-chain-id]').attr('opacity', function() {
      return this.getAttribute('data-chain-id') === chainId ? 1 : 0.1;
    });
  }
  
  function unhighlightChains() {
    const chainG = d3.select('.causal-chains');
    if (chainG.empty()) return;
    chainG.selectAll('path[data-chain-id]').attr('opacity', 0.7);
  }
  
  // Re-render timeline with filtered chains
  function renderFilteredChains() {
    const filtered = getFilteredChains();
    const chainG = d3.select('.causal-chains');
    if (chainG.empty()) return;
    
    const visibleIds = new Set(filtered.map(c => c.id));
    chainG.selectAll('path[data-chain-id]').each(function() {
      const id = this.getAttribute('data-chain-id');
      d3.select(this).style('display', visibleIds.has(id) ? '' : 'none');
    });
    // Also show/hide endpoint circles (they don't have data-chain-id, so skip)
  }
  
  // Initial render
  updateChainList();
}

})();
