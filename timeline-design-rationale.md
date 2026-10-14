# WorldCascade Narrative Timeline — Design Rationale

**Version**: 1.0  
**Date**: 2026-10-14  
**Author**: Anna (Code Review Agent)  
**Status**: P1 — Design Mockup Delivered

---

## 1. Design Problem

Vincent's feedback: **"当前的设计没有脉络感"**

The previous timeline was a flat list of disconnected nodes. Users couldn't see:
- How predictions relate to each other causally
- The temporal flow and clustering of events
- Which domains are most active at any point in time
- The "story" of how the future might unfold

## 2. Core Design Concept: "Narrative Flow"

The timeline is reimagined as a **causal narrative map** — not just a sequence of events, but a web of interconnected predictions that tells a story about how the future might unfold.

### 2.1 What Creates "脉络感" (Narrative Flow)?

| Element | Purpose | Implementation |
|---------|---------|---------------|
| **Temporal axis** | Clear left-to-right time progression | Horizontal SVG axis with year/month ticks |
| **Domain swim lanes** | Categorical grouping + visual scanning | Horizontal tracks per domain, color-coded |
| **Causal curves** | Show how events trigger/influence each other | Bezier curves connecting related predictions |
| **Temporal clustering** | Reveal convergence moments | Node proximity on time axis creates visual clusters |
| **"Now" reference line** | Ground the user in present context | Dashed vertical line at current date |
| **Confidence encoding** | Communicate uncertainty visually | Node glow/opacity proportional to confidence |

## 3. Visual Hierarchy (3 Layers)

```
Layer 1: Temporal Axis (top)
├── Year/month tick marks
├── "Now" indicator line
└── Zoom level indicator

Layer 2: Domain Swim Lanes (middle)
├── Domain label + icon (left rail)
├── Prediction nodes (positioned by date)
├── Causal connection curves (Bezier)
└── Milestone markers (diamond shapes)

Layer 3: Detail Overlay (on hover/click)
├── Tooltip card (title, confidence, score, date)
├── Causal chain mini-graph
└── Click-through to detail page
```

## 4. Scalability: 5-Level Semantic Zoom (Z0–Z4)

The design is built to support WO-02's 5-level zoom system:

| Level | View | Content | Density |
|-------|------|---------|---------|
| **Z0** | Globe | Single aggregate score + trend arrow | 1 data point |
| **Z1** | Continents | Domain-level summaries (10 cards) | 10 data points |
| **Z2** | Countries (DEFAULT) | All 80 predictions on timeline, causal curves visible | 80 nodes + 21 chains |
| **Z3** | Cities | Single prediction deep-dive with full evidence chain | 1 prediction + all signals |
| **Z4** | Streets | Raw data, methodology, backtest history, API access | Complete metadata |

### Current Mockup = Z2
The mockup shows the Z2 view: all predictions visible on a single timeline with causal connections. This is the "narrative overview" that gives users the big picture.

### How the Design Scales
- **Z0→Z1**: Fade out nodes, show domain-level aggregate bars
- **Z1→Z2**: Expand domain bars into individual prediction nodes
- **Z2→Z3**: Click a node → zoom into its detail view with full evidence chain
- **Z3→Z4**: Expand detail view to show raw data tables and methodology

The swim lane structure naturally supports this: at Z1, lanes collapse to summary bars; at Z2, they expand to full node view; at Z3, a single lane takes over the entire viewport.

## 5. Causal Connection Design

### 5.1 Curve Rendering
- **Same-domain connections**: Simple arc within the lane (subtle, same color)
- **Cross-domain connections**: Bezier curve spanning multiple lanes (gradient from source to target color)
- **Curve thickness**: Proportional to causal strength (if quantified in future)
- **Curve opacity**: 0.4 default, 0.8 on hover of connected node

### 5.2 The 8 Causal Chains Visualized
```
FP-51 → FP-04: "Cheap AI enables superhuman benchmarks"
FP-04 → FP-05: "AI capability drives job displacement"  
FP-05 → FP-55: "Job crisis triggers national emergency"
FP-01 → FP-47: "Renewables reshape climate trajectory"
FP-45 → FP-12: "Climate breach reshapes labor markets"
FP-05 → FP-12: "Automation hollows out entry-level jobs"
FP-42 → FP-04: "Quantum advantage accelerates AI"
FP-40 → FP-67: "Anti-aging breakthrough enables gene drives"
```

### 5.3 Cross-Domain Curves (the "脉络" key)
The most visually striking element: curves that cross between domain lanes. These tell the story of how AI affects demographics, how energy transitions affect climate, how biotech breakthroughs cascade across domains.

**Design rule**: Cross-domain curves should be drawn ABOVE the swim lanes (higher z-index) so they're always visible, creating an overlay "story layer" on top of the categorical structure.

## 6. Interaction Design

### 6.1 Hover
- Node pulses gently (scale 1.0 → 1.2, 200ms ease)
- Connected causal curves brighten (opacity 0.4 → 0.8)
- Tooltip card appears above node:
  - Prediction title (truncated to 60 chars)
  - Domain badge (colored pill)
  - Confidence bar (0-100%, color-coded: green >60, yellow 30-60, red <30)
  - Engine score
  - Verification date

### 6.2 Click
- Node highlights (ring animation)
- URL hash updates to `#detail/FP-xx`
- SPA router navigates to detail page

### 6.3 Domain Filter
- Click domain in legend → other domains fade to 20% opacity
- Click again → restore all
- Causal curves involving hidden domains also fade

### 6.4 Zoom Controls
- +/- buttons in header
- Smooth D3 zoom transition (500ms ease-in-out)
- At 2x: month-level tick marks appear, nodes spread out

## 7. Color System

```
Background:     #0f172a → #1e293b (vertical gradient)
Axis/text:      #94a3b8 (slate-400)
Grid lines:     #1e293b (slate-800), 1px
"Now" line:     #f59e0b (amber-500), dashed

Domain colors (nodes + curves):
  AI:           #3B82F6
  Energy:       #10B981
  Demographics: #8B5CF6
  Climate:      #06B6D4
  Space:        #6366F1
  Biotech:      #EF4444
  Quantum:      #A78BFA
  Cross-Domain: #F59E0B
  Space Economy:#14B8A6
  Astrobiology: #EC4899

Confidence encoding:
  High (>60):   Full opacity + glow
  Medium (30-60): 70% opacity
  Low (<30):    50% opacity, no glow
```

## 8. Technical Implementation Notes

### For 产品扣子 (Frontend Implementation)
- Use SVG for all timeline elements (scalable, crisp at any zoom)
- D3.js for time scale mapping and curve generation
- CSS transitions for hover/zoom animations (GPU-accelerated)
- Data source: `predictions.json` + `causal_chains.json`
- Render order: grid → lanes → curves → nodes → axis → "now" line
- Mobile: At <768px, switch to vertical timeline (time flows top→bottom)

### Performance
- 80 nodes + 21 chains = manageable SVG complexity
- Use `will-change: transform` on animated elements
- Debounce zoom events (16ms throttle)
- Lazy-render tooltips (only on hover, remove on mouseleave)

### Accessibility
- All nodes need `aria-label` with prediction title
- Keyboard navigation: Tab through nodes, Enter to open detail
- Color-blind safe: Domain colors tested against deuteranopia/protanopia simulators

## 9. Future Enhancements (Post-MVP)

1. **Animated timeline**: Play button that scrolls through time, nodes appearing at their "discovery" date
2. **Signal evolution sparklines**: Mini line charts on each node showing indicator value over time
3. **User prediction overlay**: Show user's "Place Your Bet" predictions as a separate layer
4. **Collaborative annotations**: Users can add notes to time points
5. **Comparison mode**: Side-by-side timeline showing "consensus vs contrarian" predictions

## 10. Design Validation Checklist

- [x] Clear temporal axis (left → right)
- [x] Domain color differentiation (10 colors)
- [x] Causal connections visible (Bezier curves)
- [x] "脉络感" achieved (narrative flow from curves + clustering)
- [x] Scalable to 5-level zoom (Z2 shown, Z0-Z4 documented)
- [x] Milestone/verification markers present
- [x] Hover interaction designed
- [x] Dark theme, premium aesthetic
- [x] References Bloomberg/Apple/Wikipedia visual language
- [x] Responsive considerations noted

---

**Next step**: 产品扣子 implements this as interactive HTML/JS, using the mockup as visual reference and this document as specification.
